import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { randomUUID, createHash } from 'crypto';
import { db } from '../src/config/firebase.js';
import { sleep, computeBatchDelay } from '../src/utils/rateLimit.utils.js';
import { DocumentService } from '../src/services/document.service.js';
import { GeminiService } from '../src/services/gemini.service.js';
import { ChromaService } from '../src/services/chroma.service.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COLLECTION_NAME = 'admissions_knowledge';
const RAW_DATA_DIR = path.join(__dirname, '../data/raw');

async function main() {
  console.log('🚀 Starting Knowledge Base Ingestion Pipeline...');
  
  const hasApiKey = !!process.env.GEMINI_API_KEY;
  if (!hasApiKey) {
    console.warn('\n⚠️ WARNING: GEMINI_API_KEY is not defined in your environment.');
    console.warn('⚠️ The script will automatically generate MOCK (768-dimension) embeddings for local testing.');
    console.warn('⚠️ To generate real embeddings, configure GEMINI_API_KEY in backend/.env first.\n');
  }

  const INTER_BATCH_DELAY_MS = computeBatchDelay();
  console.log(`⚙️  Pacing: ${INTER_BATCH_DELAY_MS}ms between batches (≈${Math.round(60000 / INTER_BATCH_DELAY_MS)} req/min)`);

  const startTime = Date.now();
  const stats = {
    totalDocs: 0,
    totalChunks: 0,
    embeddingSuccesses: 0,
    retrySuccesses: 0,
    embeddingFailures: 0,
    retriesQueued: 0
  };
  const retryQueue = [];
  const documentStats = {}; // sourceId -> doc stats

  try {
    // 1. Read files from raw data directory
    if (!fs.existsSync(RAW_DATA_DIR)) {
      console.error(`❌ Raw data directory does not exist at: ${RAW_DATA_DIR}`);
      process.exit(1);
    }

    const supportedExtensions = ['.pdf', '.docx', '.txt', '.md', '.csv', '.json'];
    const files = fs.readdirSync(RAW_DATA_DIR).filter(file => {
      const ext = path.extname(file).toLowerCase();
      return supportedExtensions.includes(ext);
    });
    if (files.length === 0) {
      console.warn('⚠️ No supported documents found in data/raw.');
      process.exit(0);
    }

    console.log(`📂 Found ${files.length} documents to ingest.`);

    // 2. Initialize Chroma collection (clean start or get existing)
    console.log(`🧹 Resetting collection "${COLLECTION_NAME}" in ChromaDB...`);
    await ChromaService.deleteCollection(COLLECTION_NAME);
    await ChromaService.getOrCreateCollection(COLLECTION_NAME);

    // Retrieve embedding config once dynamically
    const { embeddingProvider, embeddingModel } = await GeminiService.getEmbeddingInfo();

    // 3. Process each document
    for (const file of files) {
      const filePath = path.join(RAW_DATA_DIR, file);
      console.log(`\n📄 Processing: ${file}...`);
      stats.totalDocs++;
      
      // Determine category based on file name
      let category = 'general';
      if (file.toLowerCase().includes('requirement')) {
        category = 'requirements';
      } else if (file.toLowerCase().includes('instruction')) {
        category = 'instructions';
      } else if (file.toLowerCase().includes('conversation')) {
        category = 'examples';
      } else if (file.toLowerCase().includes('structure') || file.toLowerCase().includes('knowledge')) {
        category = 'knowledge_structure';
      }

      // Parse document to text based on type
      let rawText = '';
      if (file.toLowerCase().endsWith('.pdf')) {
        rawText = await DocumentService.parsePdf(filePath);
      } else if (file.toLowerCase().endsWith('.docx')) {
        rawText = await DocumentService.parseDocx(filePath);
      } else {
        rawText = fs.readFileSync(filePath, 'utf8');
      }
      console.log(`   - Extracted ${rawText.length} characters of raw text.`);

      // Chunk the text
      const chunks = DocumentService.chunkText(rawText, 800, 150);
      console.log(`   - Split text into ${chunks.length} chunks.`);

      if (chunks.length === 0) continue;

      // Stable source ID selection (lookup existing doc to increment version)
      let sourceId = randomUUID();
      let version = 1;
      try {
        const metadataRef = db.collection('ingestion_metadata');
        const querySnap = await metadataRef.where('fileName', '==', file).get();
        if (querySnap && querySnap.docs && querySnap.docs.length > 0) {
          const doc = querySnap.docs[0];
          sourceId = doc.id;
          version = (doc.data().version || 1) + 1;
          console.log(`   - Found existing metadata record. Incrementing version to ${version} (sourceId: ${sourceId})`);
        } else {
          console.log(`   - Created new metadata record (sourceId: ${sourceId})`);
        }
      } catch (err) {
        console.error('   ⚠️ Error querying metadata. Creating new record.', err);
      }

      // Initialize stats tracker for this doc
      documentStats[sourceId] = {
        succeeded: 0,
        failed: 0,
        startTime: Date.now(),
        file: file,
        version: version
      };

      // Write Phase 1 - status: 'Processing'
      try {
        await db.collection('ingestion_metadata').doc(sourceId).set({
          sourceId,
          fileName: file,
          version,
          status: 'Processing',
          startedAt: new Date().toISOString(),
          initiatedBy: 'system-script',
          completedBy: null,
          embeddingProvider,
          embeddingModel,
          totalChunks: chunks.length,
          successfulChunks: 0,
          failedChunks: 0,
          processingTimeMs: null,
          lastIndexedAt: null
        });
      } catch (err) {
        console.error('   ⚠️ Failed to set initial ingestion metadata in Firestore:', err);
      }

      // Ingest chunks in small batches
      const batchSize = 10;
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batchChunks = chunks.slice(i, i + batchSize);
        const items = [];

        for (let j = 0; j < batchChunks.length; j++) {
          const chunkText = batchChunks[j];
          const chunkIndex = i + j;
          const chunkId = `${file.replace(/\s+/g, '_')}_chunk_${chunkIndex}`;
          const chunkHash = createHash('sha256').update(chunkText).digest('hex').slice(0, 16);
          stats.totalChunks++;

          let embedding;
          if (hasApiKey) {
            try {
              embedding = await GeminiService.generateEmbedding(chunkText);
              documentStats[sourceId].succeeded++;
              stats.embeddingSuccesses++;
            } catch (err) {
              console.warn(`   ⚠️ [${file}] chunk ${chunkIndex} failed initial attempt — queued for retry: ${err.message}`);
              retryQueue.push({
                file,
                category,
                chunkIndex,
                chunkText,
                chunkId,
                chunkHash,
                sourceId
              });
              stats.retriesQueued++;
              continue;
            }
          } else {
            // Generate deterministic mock embedding for stable search testing
            embedding = new Array(768).fill(0.0).map((_, index) => {
              let hash = 0;
              for (let k = 0; k < chunkText.length; k++) {
                hash = (hash << 5) - hash + chunkText.charCodeAt(k);
                hash |= 0;
              }
              return Math.sin(hash + index) * 0.1;
            });
            documentStats[sourceId].succeeded++;
            stats.embeddingSuccesses++;
          }

          items.push({
            id: chunkId,
            text: chunkText,
            metadata: {
              source: file,
              sourceId,
              category,
              chunkIndex,
              chunkHash,
              timestamp: new Date().toISOString()
            },
            embedding
          });
        }

        if (items.length > 0) {
          await ChromaService.addDocuments(COLLECTION_NAME, items);
          console.log(`   - Ingested batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)} (${items.length} chunks)`);
        }

        if (i + batchSize < chunks.length) {
          console.log(`   ⏳ Pacing pause: ${INTER_BATCH_DELAY_MS}ms`);
          await sleep(INTER_BATCH_DELAY_MS);
        }
      }
    }

    // 4. Retry pass (second pass)
    if (retryQueue.length > 0) {
      console.log(`\n🔁 Second pass: ${retryQueue.length} chunks queued for retry...`);
      for (const item of retryQueue) {
        console.log(`   🔁 Retrying [${item.file}] chunk ${item.chunkIndex}...`);
        await sleep(INTER_BATCH_DELAY_MS);

        try {
          const embedding = await GeminiService.generateEmbedding(item.chunkText);
          await ChromaService.addDocuments(COLLECTION_NAME, [{
            id: item.chunkId,
            text: item.chunkText,
            metadata: {
              source: item.file,
              sourceId: item.sourceId,
              category: item.category,
              chunkIndex: item.chunkIndex,
              chunkHash: item.chunkHash,
              timestamp: new Date().toISOString()
            },
            embedding
          }]);
          stats.retrySuccesses++;
          documentStats[item.sourceId].succeeded++;
          console.log(`   ✅ [${item.file}] chunk ${item.chunkIndex} recovered`);
        } catch (err) {
          stats.embeddingFailures++;
          documentStats[item.sourceId].failed++;
          console.error(`   ❌ [${item.file}] chunk ${item.chunkIndex} permanently failed: ${err.message}`);
        }
      }
    }

    // 5. Update Firestore metadata with final status
    for (const sourceId of Object.keys(documentStats)) {
      const docStats = documentStats[sourceId];
      const finalStatus =
        docStats.failed === 0            ? 'Completed' :
        docStats.succeeded > 0           ? 'Completed with Warnings' :
                                           'Failed';
      try {
        await db.collection('ingestion_metadata').doc(sourceId).update({
          status: finalStatus,
          completedBy: 'system-script',
          successfulChunks: docStats.succeeded,
          failedChunks: docStats.failed,
          processingTimeMs: Date.now() - docStats.startTime,
          lastIndexedAt: new Date().toISOString()
        });
      } catch (err) {
        console.error(`⚠️ Failed to update final metadata for ${docStats.file}:`, err);
      }
    }

    const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('\n============================================================');
    console.log('📊 INGESTION SUMMARY');
    console.log('============================================================');
    console.log(`  📁 Documents processed      : ${stats.totalDocs}`);
    console.log(`  📄 Chunks processed         : ${stats.totalChunks}`);
    console.log(`  ✅ Successful embeddings     : ${stats.embeddingSuccesses}`);
    console.log(`  🔁 Recovered on retry       : ${stats.retrySuccesses}`);
    console.log(`  ❌ Permanently failed        : ${stats.embeddingFailures}`);
    console.log(`  🔄 Total retries queued      : ${stats.retriesQueued}`);
    console.log(`  ⏱  Total execution time      : ${elapsedSeconds}s`);
    console.log('============================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error during ingestion pipeline:', error);
    process.exit(1);
  }
}

main();
