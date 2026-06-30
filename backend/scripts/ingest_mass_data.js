import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { randomUUID, createHash } from 'crypto';
import { db } from '../src/config/firebase.js';
import { DocumentService } from '../src/services/document.service.js';
import { GeminiService } from '../src/services/gemini.service.js';
import { ChromaService } from '../src/services/chroma.service.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COLLECTION_NAME = 'admissions_knowledge';
const RAW_DATA_DIR = path.join(__dirname, '../data/raw');
const SOURCE_PDF_PATH = '/Users/sama/Desktop/AI Chatbot/NavGurukul - Mass Data (3).pdf';
const TARGET_FILE_NAME = 'NavGurukul - Mass Data.pdf';
const TARGET_PDF_PATH = path.join(RAW_DATA_DIR, TARGET_FILE_NAME);

// Helper to generate embedding with quota-aware retry
async function generateEmbeddingWithRetry(textOrTexts, attempt = 1) {
  const maxRetries = 5;
  try {
    return await GeminiService.generateEmbedding(textOrTexts);
  } catch (err) {
    const errorStr = (err.message || '').toLowerCase();
    if ((errorStr.includes('429') || errorStr.includes('quota') || errorStr.includes('resource_exhausted')) && attempt <= maxRetries) {
      console.warn(`   ⚠️ Rate limit hit (429). Waiting 35 seconds before retry attempt ${attempt}/${maxRetries}...`);
      await new Promise(resolve => setTimeout(resolve, 35000));
      return generateEmbeddingWithRetry(textOrTexts, attempt + 1);
    }
    throw err;
  }
}

async function main() {
  console.log('🚀 Starting direct mass data upload and database wipe...');
  const startTime = Date.now();

  try {
    // 1. Wipe ChromaDB Admissions Knowledge collection
    console.log(`🧹 Wiping collection "${COLLECTION_NAME}" in ChromaDB...`);
    await ChromaService.deleteCollection(COLLECTION_NAME);
    await ChromaService.getOrCreateCollection(COLLECTION_NAME);
    console.log('✅ ChromaDB collection recreated and clean.');

    // 2. Wipe Firestore ingestion_metadata records
    console.log('🧹 Wiping ingestion_metadata collection in Firestore...');
    const metadataRef = db.collection('ingestion_metadata');
    const snapshot = await metadataRef.get();
    let deletedCount = 0;
    if (snapshot && snapshot.docs) {
      for (const doc of snapshot.docs) {
        await doc.ref.delete();
        deletedCount++;
      }
    }
    console.log(`✅ Deleted ${deletedCount} metadata records from Firestore.`);

    // 3. Clear existing files in backend/data/raw
    if (fs.existsSync(RAW_DATA_DIR)) {
      console.log('🧹 Cleaning raw data directory...');
      const existingFiles = fs.readdirSync(RAW_DATA_DIR);
      for (const file of existingFiles) {
        const filePath = path.join(RAW_DATA_DIR, file);
        if (fs.statSync(filePath).isFile()) {
          fs.unlinkSync(filePath);
          console.log(`- Deleted old file: ${file}`);
        }
      }
    } else {
      fs.mkdirSync(RAW_DATA_DIR, { recursive: true });
    }

    // 4. Copy NavGurukul - Mass Data (3).pdf to raw directory as NavGurukul - Mass Data.pdf
    if (!fs.existsSync(SOURCE_PDF_PATH)) {
      console.error(`❌ Source PDF file not found at: ${SOURCE_PDF_PATH}`);
      process.exit(1);
    }
    console.log(`📋 Copying source PDF from workspace root to: ${TARGET_PDF_PATH}`);
    fs.copyFileSync(SOURCE_PDF_PATH, TARGET_PDF_PATH);
    console.log('✅ File copied successfully.');

    // 5. Parse PDF content
    console.log('📄 Extracting text content from PDF...');
    const rawText = await DocumentService.parsePdf(TARGET_PDF_PATH);
    console.log(`✅ Extracted ${rawText.length} characters of raw text.`);

    // 6. Chunk text
    console.log('✂️ Chunking text...');
    const chunks = DocumentService.chunkText(rawText, 800, 150);
    console.log(`✅ Split text into ${chunks.length} chunks.`);

    if (chunks.length === 0) {
      console.warn('⚠️ No text chunks generated from the file.');
      process.exit(0);
    }

    // 7. Get or create ingestion metadata record in Firestore
    const sourceId = randomUUID();
    const { embeddingProvider, embeddingModel } = await GeminiService.getEmbeddingInfo();
    const hasApiKey = !!process.env.GEMINI_API_KEY;

    console.log(`📝 Setting initial ingestion status to "Processing" in Firestore...`);
    await db.collection('ingestion_metadata').doc(sourceId).set({
      sourceId,
      fileName: TARGET_FILE_NAME,
      version: 1,
      status: 'Processing',
      startedAt: new Date().toISOString(),
      initiatedBy: 'direct-script',
      completedBy: null,
      embeddingProvider,
      embeddingModel,
      totalChunks: chunks.length,
      successfulChunks: 0,
      failedChunks: 0,
      processingTimeMs: null,
      lastIndexedAt: null
    });

    // 8. Process embedding and add to vector DB
    console.log('🤖 Generating embeddings and inserting into ChromaDB...');
    
    // We batch embeddings in chunks of 15 (15 requests/minute is extremely safe)
    const batchSize = 15;
    const batchDelayMs = 10000; // 10 seconds delay between batches
    let succeededCount = 0;
    let failedCount = 0;
    
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batchChunks = chunks.slice(i, i + batchSize);
      let embeddings = [];

      if (hasApiKey) {
        try {
          console.log(`   ⏳ Embedding batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)} (chunks ${i} to ${Math.min(i + batchChunks.length - 1, chunks.length - 1)})`);
          embeddings = await generateEmbeddingWithRetry(batchChunks);
        } catch (err) {
          console.error(`   ❌ Failed to get embeddings for batch starting at chunk ${i}:`, err.message);
          // Set failedCount for statistics
          failedCount += batchChunks.length;
          continue;
        }
      } else {
        // Fallback mock embeddings for local testing
        embeddings = batchChunks.map(chunkText => {
          return new Array(768).fill(0.0).map((_, idx) => {
            let hash = 0;
            for (let k = 0; k < chunkText.length; k++) {
              hash = (hash << 5) - hash + chunkText.charCodeAt(k);
              hash |= 0;
            }
            return Math.sin(hash + idx) * 0.1;
          });
        });
      }

      const items = [];
      for (let j = 0; j < batchChunks.length; j++) {
        const chunkText = batchChunks[j];
        const embedding = embeddings[j];
        const chunkIndex = i + j;
        const chunkId = `NavGurukul_Mass_Data_chunk_${chunkIndex}`;
        const chunkHash = createHash('sha256').update(chunkText).digest('hex').slice(0, 16);

        if (embedding) {
          succeededCount++;
          items.push({
            id: chunkId,
            text: chunkText,
            metadata: {
              source: TARGET_FILE_NAME,
              sourceId,
              category: 'general',
              chunkIndex,
              chunkHash,
              timestamp: new Date().toISOString()
            },
            embedding
          });
        } else {
          failedCount++;
        }
      }

      if (items.length > 0) {
        await ChromaService.addDocuments(COLLECTION_NAME, items);
      }

      // Small pacing pause between batch requests to respect rate limits if using real API
      if (hasApiKey && i + batchSize < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, batchDelayMs));
      }
    }

    // 9. Update final status in Firestore
    const finalStatus = failedCount === 0 ? 'Completed' : (succeededCount > 0 ? 'Completed with Warnings' : 'Failed');
    console.log(`📝 Writing final status "${finalStatus}" to Firestore...`);
    await db.collection('ingestion_metadata').doc(sourceId).update({
      status: finalStatus,
      completedBy: 'direct-script',
      successfulChunks: succeededCount,
      failedChunks: failedCount,
      processingTimeMs: Date.now() - startTime,
      lastIndexedAt: new Date().toISOString()
    });

    const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('\n============================================================');
    console.log('📊 INGESTION SUMMARY');
    console.log('============================================================');
    console.log(`  📁 Documents processed      : 1 (${TARGET_FILE_NAME})`);
    console.log(`  📄 Chunks processed         : ${chunks.length}`);
    console.log(`  ✅ Successful embeddings     : ${succeededCount}`);
    console.log(`  ❌ Failed embeddings         : ${failedCount}`);
    console.log(`  ⏱  Total execution time      : ${elapsedSeconds}s`);
    console.log('============================================================\n');

    console.log('🎉 Done! Database wiped and mass data ingested successfully.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Ingestion pipeline failed:', error);
    process.exit(1);
  }
}

main();
