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
   * Helper to chunk and index plain text content into the vector store.
   */
  static async indexTextContent(fileName, textContent) {
    const chunks = DocumentService.chunkText(textContent, 800, 150);
    if (chunks.length === 0) return 0;

    const apiKey = await GeminiService.getApiKey();
    const hasApiKey = !!apiKey;
    const items = [];

    for (let j = 0; j < chunks.length; j++) {
      const chunkText = chunks[j];
      const chunkId = `${fileName.replace(/\s+/g, '_')}_chunk_${j}`;
      
      let embedding;
      if (hasApiKey) {
        embedding = await GeminiService.generateEmbedding(chunkText);
      } else {
        // Fallback mock embedding
        embedding = new Array(768).fill(0.0).map((_, idx) => {
          let hash = 0;
          for (let k = 0; k < chunkText.length; k++) {
            hash = (hash << 5) - hash + chunkText.charCodeAt(k);
            hash |= 0;
          }
          return Math.sin(hash + idx) * 0.1;
        });
      }

      let category = 'general';
      if (fileName.toLowerCase().includes('requirement')) category = 'requirements';
      else if (fileName.toLowerCase().includes('instruction')) category = 'instructions';
      else if (fileName.toLowerCase().includes('conversation')) category = 'examples';
      else if (fileName.toLowerCase().includes('structure') || fileName.toLowerCase().includes('knowledge')) category = 'knowledge_structure';

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
    return chunks.length;
  }

  /**
   * Run the document ingestion pipeline programmatically and return status.
   */
  static async ingest(req, res) {
    try {
      const apiKey = await GeminiService.getApiKey();
      const hasApiKey = !!apiKey;
      if (!fs.existsSync(RAW_DATA_DIR)) {
        return res.status(404).json({ error: `Raw data directory not found at ${RAW_DATA_DIR}` });
      }

      const supportedExtensions = ['.pdf', '.docx', '.txt', '.md', '.csv', '.json'];
      const files = fs.readdirSync(RAW_DATA_DIR).filter(file => {
        const ext = path.extname(file).toLowerCase();
        return supportedExtensions.includes(ext);
      });
      if (files.length === 0) {
        return res.status(200).json({ success: true, message: 'No supported documents found to ingest.' });
      }

      // Re-create/clean collection
      await ChromaService.deleteCollection(COLLECTION_NAME);
      await ChromaService.getOrCreateCollection(COLLECTION_NAME);

      let totalChunks = 0;

      for (const file of files) {
        const filePath = path.join(RAW_DATA_DIR, file);
        let rawText = '';

        if (file.toLowerCase().endsWith('.pdf')) {
          rawText = await DocumentService.parsePdf(filePath);
        } else if (file.toLowerCase().endsWith('.docx')) {
          rawText = await DocumentService.parseDocx(filePath);
        } else {
          rawText = fs.readFileSync(filePath, 'utf8');
        }

        const chunksCount = await KnowledgeController.indexTextContent(file, rawText);
        totalChunks += chunksCount;
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
        const supportedExtensions = ['.pdf', '.docx', '.txt', '.md', '.csv', '.json'];
        sourceDocs = fs.readdirSync(RAW_DATA_DIR).filter(file => {
          const ext = path.extname(file).toLowerCase();
          return supportedExtensions.includes(ext);
        });
      }

      const apiKey = await GeminiService.getApiKey();

      return res.status(200).json({
        collection: COLLECTION_NAME,
        chunksCount: count,
        sourceDocuments: sourceDocs,
        apiKeyConfigured: !!apiKey
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
      const apiKey = await GeminiService.getApiKey();
      const hasApiKey = !!apiKey;
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

      const collection = await ChromaService.getOrCreateCollection(COLLECTION_NAME);
      const results = await collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: limit ? parseInt(limit, 10) : 3
      });

      const formattedResults = [];
      if (results && results.ids && results.ids[0]) {
        for (let i = 0; i < results.ids[0].length; i++) {
          formattedResults.push({
            id: results.ids[0][i],
            text: results.documents[0][i],
            metadata: results.metadatas[0][i],
            distance: results.distances ? results.distances[0][i] : null
          });
        }
      }

      return res.status(200).json({
        query: queryText,
        results: formattedResults
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

      let text = '';
      if (fileName.toLowerCase().endsWith('.pdf')) {
        text = await DocumentService.parsePdf(filePath);
      } else if (fileName.toLowerCase().endsWith('.docx')) {
        text = await DocumentService.parseDocx(filePath);
      } else {
        text = fs.readFileSync(filePath, 'utf8');
      }

      const chunkCount = await KnowledgeController.indexTextContent(fileName, text);
      console.log(`🚀 Indexed uploaded file "${fileName}" (${chunkCount} chunks)`);

      return res.status(200).json({
        success: true,
        message: `Successfully uploaded and indexed "${fileName}" (${chunkCount} chunks).`
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

      const chunkCount = await KnowledgeController.indexTextContent(fileName, textContent);
      console.log(`🚀 Indexed FAQ "${fileName}" (${chunkCount} chunks)`);

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

  /**
   * Get the plain text content of an uploaded knowledge source.
   */
  static async getSourceContent(req, res) {
    const { sourceName } = req.params;
    if (!sourceName) {
      return res.status(400).json({ error: 'sourceName parameter is required.' });
    }

    try {
      const safeName = path.basename(sourceName);
      const filePath = path.join(RAW_DATA_DIR, safeName);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: `Knowledge source "${safeName}" not found.` });
      }

      let text = '';
      if (safeName.toLowerCase().endsWith('.pdf')) {
        text = await DocumentService.parsePdf(filePath);
      } else if (safeName.toLowerCase().endsWith('.docx')) {
        text = await DocumentService.parseDocx(filePath);
      } else {
        text = fs.readFileSync(filePath, 'utf8');
      }

      return res.status(200).json({
        success: true,
        fileName: safeName,
        content: text
      });
    } catch (error) {
      console.error('Error fetching source content:', error);
      return res.status(500).json({ error: 'Failed to retrieve file contents.', details: error.message });
    }
  }

  /**
   * Update the content of an uploaded knowledge source.
   */
  static async updateSourceContent(req, res) {
    const { sourceName } = req.params;
    const { content } = req.body;

    if (!sourceName) {
      return res.status(400).json({ error: 'sourceName parameter is required.' });
    }
    if (content === undefined || typeof content !== 'string') {
      return res.status(400).json({ error: 'content body parameter (string) is required.' });
    }

    try {
      const safeName = path.basename(sourceName);
      const filePath = path.join(RAW_DATA_DIR, safeName);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: `Knowledge source "${safeName}" not found.` });
      }

      // Delete old vector store chunks for this source
      const collection = await ChromaService.getOrCreateCollection(COLLECTION_NAME);
      await collection.delete({
        where: { source: safeName }
      });
      console.log(`🗑️ Cleared vector store chunks for: "${safeName}"`);

      const isBinary = safeName.toLowerCase().endsWith('.pdf') || safeName.toLowerCase().endsWith('.docx');
      let targetFileName = safeName;

      if (isBinary) {
        // Delete original binary file
        fs.unlinkSync(filePath);
        console.log(`🗑️ Deleted original binary file: ${filePath}`);

        // Save as a text file instead, replacing the extension
        const baseName = safeName.replace(/\.(pdf|docx)$/i, '');
        targetFileName = `${baseName}.txt`;
        const newFilePath = path.join(RAW_DATA_DIR, targetFileName);
        
        fs.writeFileSync(newFilePath, content, 'utf8');
        console.log(`📝 Wrote updated content to text file: ${newFilePath}`);
      } else {
        // Directly overwrite existing text-compatible file (txt, md, csv, etc)
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`📝 Overwrote existing text file: ${filePath}`);
      }

      // Re-index the content using our helper
      const chunkCount = await KnowledgeController.indexTextContent(targetFileName, content);
      console.log(`🚀 Indexed updated file "${targetFileName}" (${chunkCount} chunks)`);

      return res.status(200).json({
        success: true,
        message: isBinary 
          ? `Updated and converted "${safeName}" to "${targetFileName}" successfully.`
          : `Updated "${safeName}" successfully.`,
        fileName: targetFileName,
        chunksIndexed: chunkCount
      });
    } catch (error) {
      console.error('Error updating source content:', error);
      return res.status(500).json({ error: 'Failed to update file contents.', details: error.message });
    }
  }
}
