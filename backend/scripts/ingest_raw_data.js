import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
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

  try {
    // 1. Read files from raw data directory
    if (!fs.existsSync(RAW_DATA_DIR)) {
      console.error(`❌ Raw data directory does not exist at: ${RAW_DATA_DIR}`);
      process.exit(1);
    }

    const files = fs.readdirSync(RAW_DATA_DIR).filter(file => file.endsWith('.pdf'));
    if (files.length === 0) {
      console.warn('⚠️ No PDF files found in data/raw.');
      process.exit(0);
    }

    console.log(`📂 Found ${files.length} PDF documents to ingest.`);

    // 2. Initialize Chroma collection (clean start or get existing)
    console.log(`🧹 Resetting collection "${COLLECTION_NAME}" in ChromaDB...`);
    await ChromaService.deleteCollection(COLLECTION_NAME);
    await ChromaService.getOrCreateCollection(COLLECTION_NAME);

    let totalChunksIngested = 0;

    // 3. Process each document
    for (const file of files) {
      const filePath = path.join(RAW_DATA_DIR, file);
      console.log(`\n📄 Processing: ${file}...`);
      
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

      // Parse PDF to text
      const rawText = await DocumentService.parsePdf(filePath);
      console.log(`   - Extracted ${rawText.length} characters of raw text.`);

      // Chunk the text
      const chunks = DocumentService.chunkText(rawText, 800, 150);
      console.log(`   - Split text into ${chunks.length} chunks.`);

      if (chunks.length === 0) continue;

      // Ingest chunks in small batches
      const batchSize = 10;
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batchChunks = chunks.slice(i, i + batchSize);
        const items = [];

        for (let j = 0; j < batchChunks.length; j++) {
          const chunkText = batchChunks[j];
          const chunkIndex = i + j;
          const chunkId = `${file.replace(/\s+/g, '_')}_chunk_${chunkIndex}`;

          let embedding;
          if (hasApiKey) {
            try {
              embedding = await GeminiService.generateEmbedding(chunkText);
            } catch (err) {
              console.error(`Failed to generate embedding for batch ${i}, falling back to mock...`, err.message);
              embedding = new Array(768).fill(0.0);
            }
          } else {
            // Generate deterministic mock embedding for stable search testing
            embedding = new Array(768).fill(0.0).map((_, index) => {
              // Create a hash-like representation of text for testing
              let hash = 0;
              for (let k = 0; k < chunkText.length; k++) {
                hash = (hash << 5) - hash + chunkText.charCodeAt(k);
                hash |= 0;
              }
              return Math.sin(hash + index) * 0.1;
            });
          }

          items.push({
            id: chunkId,
            text: chunkText,
            metadata: {
              source: file,
              category,
              chunkIndex,
              timestamp: new Date().toISOString()
            },
            embedding
          });
        }

        await ChromaService.addDocuments(COLLECTION_NAME, items);
        totalChunksIngested += items.length;
        console.log(`   - Ingested batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)} (${items.length} chunks)`);
      }
    }

    console.log(`\n🎉 Ingestion complete! Successfully ingested ${totalChunksIngested} chunks across all documents.`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during ingestion pipeline:', error);
    process.exit(1);
  }
}

main();
