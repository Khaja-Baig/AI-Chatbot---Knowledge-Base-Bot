import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DocumentService } from '../services/document.service.js';
import { GeminiService } from '../services/gemini.service.js';
import { ChromaService } from '../services/chroma.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COLLECTION_NAME = 'admissions_knowledge';
const RAW_DATA_DIR = path.join(__dirname, '../../data/raw');

export class KnowledgeController {
  /**
   * Run the document ingestion pipeline programmatically and return status.
   */
  static async ingest(req, res) {
    try {
      const hasApiKey = !!process.env.GEMINI_API_KEY;
      if (!fs.existsSync(RAW_DATA_DIR)) {
        return res.status(404).json({ error: `Raw data directory not found at ${RAW_DATA_DIR}` });
      }

      const files = fs.readdirSync(RAW_DATA_DIR).filter(file => file.endsWith('.pdf'));
      if (files.length === 0) {
        return res.status(200).json({ success: true, message: 'No PDF documents found to ingest.' });
      }

      // Re-create/clean collection
      await ChromaService.deleteCollection(COLLECTION_NAME);
      await ChromaService.getOrCreateCollection(COLLECTION_NAME);

      let totalChunks = 0;

      for (const file of files) {
        const filePath = path.join(RAW_DATA_DIR, file);
        let category = 'general';
        if (file.toLowerCase().includes('requirement')) category = 'requirements';
        else if (file.toLowerCase().includes('instruction')) category = 'instructions';
        else if (file.toLowerCase().includes('conversation')) category = 'examples';
        else if (file.toLowerCase().includes('structure') || file.toLowerCase().includes('knowledge')) category = 'knowledge_structure';

        const rawText = await DocumentService.parsePdf(filePath);
        const chunks = DocumentService.chunkText(rawText, 800, 150);

        if (chunks.length === 0) continue;

        const items = [];
        for (let j = 0; j < chunks.length; j++) {
          const chunkText = chunks[j];
          const chunkId = `${file.replace(/\s+/g, '_')}_chunk_${j}`;
          
          let embedding;
          if (hasApiKey) {
            embedding = await GeminiService.generateEmbedding(chunkText);
          } else {
            // Test mock embedding
            embedding = new Array(768).fill(0.0).map((_, idx) => {
              let hash = 0;
              for (let k = 0; k < chunkText.length; k++) {
                hash = (hash << 5) - hash + chunkText.charCodeAt(k);
                hash |= 0;
              }
              return Math.sin(hash + idx) * 0.1;
            });
          }

          items.push({
            id: chunkId,
            text: chunkText,
            metadata: {
              source: file,
              category,
              chunkIndex: j,
              timestamp: new Date().toISOString()
            },
            embedding
          });
        }

        await ChromaService.addDocuments(COLLECTION_NAME, items);
        totalChunks += items.length;
      }

      return res.status(200).json({
        success: true,
        message: `Successfully ingested ${totalChunks} chunks from ${files.length} documents.`,
        mode: hasApiKey ? 'production' : 'mock-embeddings'
      });
    } catch (error) {
      console.error('Ingestion failed:', error);
      return res.status(500).json({ error: 'Ingestion pipeline failed.', details: error.message });
    }
  }

  /**
   * Get stats on the ChromaDB vector database.
   */
  static async getStatus(req, res) {
    try {
      const collection = await ChromaService.getOrCreateCollection(COLLECTION_NAME);
      const count = await collection.count();
      
      let sourceDocs = [];
      if (fs.existsSync(RAW_DATA_DIR)) {
        sourceDocs = fs.readdirSync(RAW_DATA_DIR).filter(file => file.endsWith('.pdf') || file.endsWith('.txt'));
      }

      return res.status(200).json({
        collection: COLLECTION_NAME,
        chunksCount: count,
        sourceDocuments: sourceDocs,
        apiKeyConfigured: !!process.env.GEMINI_API_KEY
      });
    } catch (error) {
      console.error('Error fetching knowledge base status:', error);
      return res.status(500).json({ error: 'Failed to retrieve knowledge status.' });
    }
  }

  /**
   * Run manual query for testing/debugging.
   */
  static async query(req, res) {
    const { queryText, limit } = req.body;

    if (!queryText) {
      return res.status(400).json({ error: 'queryText is required.' });
    }

    try {
      const hasApiKey = !!process.env.GEMINI_API_KEY;
      let queryEmbedding;

      if (hasApiKey) {
        queryEmbedding = await GeminiService.generateEmbedding(queryText);
      } else {
        queryEmbedding = new Array(768).fill(0.0).map((_, idx) => {
          let hash = 0;
          for (let k = 0; k < queryText.length; k++) {
            hash = (hash << 5) - hash + queryText.charCodeAt(k);
            hash |= 0;
          }
          return Math.sin(hash + idx) * 0.1;
        });
      }

      const results = await ChromaService.query(COLLECTION_NAME, queryEmbedding, limit || 3);
      return res.status(200).json({
        query: queryText,
        results
      });
    } catch (error) {
      console.error('Error querying vector store:', error);
      return res.status(500).json({ error: 'Failed to search vector store.', details: error.message });
    }
  }

  /**
   * Save a base64 encoded document to raw folder and run chunking/embedding pipeline.
   */
  static async uploadDocument(req, res) {
    const { fileName, fileContent } = req.body;
    if (!fileName || !fileContent) {
      return res.status(400).json({ error: 'fileName and fileContent (base64) are required.' });
    }

    try {
      const buffer = Buffer.from(fileContent, 'base64');
      const filePath = path.join(RAW_DATA_DIR, fileName);
      
      if (!fs.existsSync(RAW_DATA_DIR)) {
        fs.mkdirSync(RAW_DATA_DIR, { recursive: true });
      }

      fs.writeFileSync(filePath, buffer);
      console.log(`📥 Base64 upload saved to: ${filePath}`);

      let category = 'general';
      if (fileName.toLowerCase().includes('requirement')) category = 'requirements';
      else if (fileName.toLowerCase().includes('instruction')) category = 'instructions';
      else if (fileName.toLowerCase().includes('conversation')) category = 'examples';
      else if (fileName.toLowerCase().includes('structure') || fileName.toLowerCase().includes('knowledge')) category = 'knowledge_structure';

      let text = '';
      if (fileName.endsWith('.pdf')) {
        text = await DocumentService.parsePdf(filePath);
      } else {
        text = fs.readFileSync(filePath, 'utf8');
      }

      const chunks = DocumentService.chunkText(text, 800, 150);
      if (chunks.length > 0) {
        const hasApiKey = !!process.env.GEMINI_API_KEY;
        const items = [];
        
        for (let j = 0; j < chunks.length; j++) {
          const chunkText = chunks[j];
          const chunkId = `${fileName.replace(/\s+/g, '_')}_chunk_${j}`;
          
          let embedding;
          if (hasApiKey) {
            embedding = await GeminiService.generateEmbedding(chunkText);
          } else {
            embedding = new Array(768).fill(0.0).map((_, idx) => {
              let hash = 0;
              for (let k = 0; k < chunkText.length; k++) {
                hash = (hash << 5) - hash + chunkText.charCodeAt(k);
                hash |= 0;
              }
              return Math.sin(hash + idx) * 0.1;
            });
          }

          items.push({
            id: chunkId,
            text: chunkText,
            metadata: {
              source: fileName,
              category,
              chunkIndex: j,
              timestamp: new Date().toISOString()
            },
            embedding
          });
        }
        
        await ChromaService.addDocuments(COLLECTION_NAME, items);
      }

      return res.status(200).json({
        success: true,
        message: `Successfully uploaded and indexed "${fileName}" (${chunks.length} chunks).`
      });
    } catch (err) {
      console.error('File upload indexing failed:', err);
      return res.status(500).json({ error: 'Failed to upload and index document.', details: err.message });
    }
  }

  /**
   * Save Question & Answer FAQ to text file and embed/ingest into vector DB.
   */
  static async createFaq(req, res) {
    const { question, answer } = req.body;
    if (!question || !answer) {
      return res.status(400).json({ error: 'question and answer are required.' });
    }

    try {
      const cleanQuestion = question.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
      const fileName = `custom_faq_${cleanQuestion}_${Date.now()}.txt`;
      const filePath = path.join(RAW_DATA_DIR, fileName);
      const textContent = `Question: ${question}\nAnswer: ${answer}`;

      if (!fs.existsSync(RAW_DATA_DIR)) {
        fs.mkdirSync(RAW_DATA_DIR, { recursive: true });
      }

      fs.writeFileSync(filePath, textContent, 'utf8');
      console.log(`📥 Custom FAQ saved to text file: ${filePath}`);

      const hasApiKey = !!process.env.GEMINI_API_KEY;
      const items = [];
      const chunkId = `${fileName.replace(/\s+/g, '_')}_chunk_0`;
      
      let embedding;
      if (hasApiKey) {
        embedding = await GeminiService.generateEmbedding(textContent);
      } else {
        embedding = new Array(768).fill(0.0).map((_, idx) => {
          let hash = 0;
          for (let k = 0; k < textContent.length; k++) {
            hash = (hash << 5) - hash + textContent.charCodeAt(k);
            hash |= 0;
          }
          return Math.sin(hash + idx) * 0.1;
        });
      }

      items.push({
        id: chunkId,
        text: textContent,
        metadata: {
          source: fileName,
          category: 'faq',
          chunkIndex: 0,
          timestamp: new Date().toISOString()
        },
        embedding
      });

      await ChromaService.addDocuments(COLLECTION_NAME, items);

      return res.status(200).json({
        success: true,
        message: `Successfully created and indexed FAQ: "${question}"`
      });
    } catch (err) {
      console.error('FAQ creation failed:', err);
      return res.status(500).json({ error: 'Failed to create and index FAQ.', details: err.message });
    }
  }

  /**
   * Delete document file and clean related chunks from vector DB.
   */
  static async deleteDocument(req, res) {
    const { fileName } = req.body;
    if (!fileName) {
      return res.status(400).json({ error: 'fileName is required.' });
    }

    try {
      const filePath = path.join(RAW_DATA_DIR, fileName);
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`🗑️ Deleted file from local storage: ${filePath}`);
      }

      const collection = await ChromaService.getOrCreateCollection(COLLECTION_NAME);
      await collection.delete({
        where: { source: fileName }
      });
      console.log(`🗑️ Deleted chunks matching source: "${fileName}" from ChromaDB`);

      return res.status(200).json({
        success: true,
        message: `Successfully deleted source "${fileName}" and cleared all related database vector chunks.`
      });
    } catch (err) {
      console.error('Failed to delete document:', err);
      return res.status(500).json({ error: 'Failed to delete knowledge source.', details: err.message });
    }
  }
}
