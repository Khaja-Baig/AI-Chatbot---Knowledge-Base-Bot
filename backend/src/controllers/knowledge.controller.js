import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID, createHash } from 'crypto';
import { db } from '../config/firebase.js';
import { DocumentService } from '../services/document.service.js';
import { GeminiService } from '../services/gemini.service.js';
import { LocalEmbeddingService } from '../services/localEmbedding.service.js';
import { ChromaService } from '../services/chroma.service.js';
import { JobQueue } from '../utils/jobQueue.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COLLECTION_NAME = 'admissions_knowledge';
const RAW_DATA_DIR = path.join(__dirname, '../../data/raw');

export class KnowledgeController {
  /**
   * Helper to chunk and index plain text content into the vector store.
   */
  static async indexTextContent(fileName, textContent, options = {}) {
    const initiatedBy = options.initiatedBy || 'system-api';
    const chunks = DocumentService.chunkText(textContent, 800, 150);
    if (chunks.length === 0) return 0;

    const embeddingProvider = 'local';
    const embeddingModel = 'all-MiniLM-L6-v2';

    // Stable source ID lookup or creation
    let sourceId = randomUUID();
    let version = 1;
    try {
      const metadataRef = db.collection('ingestion_metadata');
      const querySnap = await metadataRef.where('fileName', '==', fileName).get();
      if (querySnap && querySnap.docs && querySnap.docs.length > 0) {
        const doc = querySnap.docs[0];
        sourceId = doc.id;
        version = (doc.data().version || 1) + 1;
      }
    } catch (err) {
      console.error('Error lookup metadata:', err);
    }

    // Set initial status to Processing
    try {
      await db.collection('ingestion_metadata').doc(sourceId).set({
        sourceId,
        fileName,
        version,
        status: 'Processing',
        startedAt: new Date().toISOString(),
        initiatedBy,
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
      console.error('Error writing processing status to metadata:', err);
    }

    const items = [];
    const docStartTime = Date.now();

    // Generate local 384d embeddings instantly in batch
    const embeddings = await LocalEmbeddingService.generateEmbeddingsBatch(chunks);

    for (let j = 0; j < chunks.length; j++) {
      const chunkText = chunks[j];
      const chunkId = `${fileName.replace(/\s+/g, '_')}_chunk_${j}`;
      const chunkHash = createHash('sha256').update(chunkText).digest('hex').slice(0, 16);

      items.push({
        id: chunkId,
        text: chunkText,
        metadata: {
          source: fileName,
          sourceId,
          category: fileName.toLowerCase().includes('requirement') ? 'requirements' :
                    fileName.toLowerCase().includes('instruction') ? 'instructions' :
                    fileName.toLowerCase().includes('conversation') ? 'examples' :
                    (fileName.toLowerCase().includes('structure') || fileName.toLowerCase().includes('knowledge')) ? 'knowledge_structure' : 'general',
          chunkIndex: j,
          chunkHash,
          timestamp: new Date().toISOString()
        },
        embedding: embeddings[j]
      });
    }

    if (items.length > 0) {
      await ChromaService.addDocuments(COLLECTION_NAME, items);
    }

    // Write final status to Firestore
    try {
      await db.collection('ingestion_metadata').doc(sourceId).update({
        status: 'Completed',
        completedBy: initiatedBy,
        successfulChunks: chunks.length,
        failedChunks: 0,
        processingTimeMs: Date.now() - docStartTime,
        lastIndexedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error(`⚠️ Failed to update metadata for ${fileName}:`, err);
    }

    return chunks.length;
  }

  /**
   * Run chunking and embedding pipeline in the background with progress updates.
   * Supports optional smart diffing when updating an existing document.
   */
  static async processIngestionInBackground(jobId, fileName, textContent, options = {}) {

    const initiatedBy = options.initiatedBy || 'system-api';
    const isDiff = !!options.diffEnabled;
    const oldFileName = options.oldFileName || fileName;
    
    const docStartTime = Date.now();
    let succeededCount = 0;
    let failedCount = 0;
    let sourceId = randomUUID();

    const deleteBackup = () => {
      if (options.backupPath && fs.existsSync(options.backupPath)) {
        try {
          fs.unlinkSync(options.backupPath);
          console.log(`🧹 Cleaned up backup file: ${options.backupPath}`);
        } catch (err) {
          console.error(`⚠️ Failed to delete backup file:`, err);
        }
      }
    };

    const handleCancellation = async () => {
      console.log(`[Job ${jobId}] Cleaning up cancelled job...`);
      JobQueue.updateJob(jobId, { status: 'cancelled' });

      try {
        await db.collection('ingestion_metadata').doc(sourceId).update({
          status: 'Cancelled',
          lastIndexedAt: new Date().toISOString()
        });
      } catch (err) {
        console.error(`⚠️ [Job ${jobId}] Failed to update metadata on cancel:`, err);
      }

      if (options.backupPath && fs.existsSync(options.backupPath)) {
        try {
          const targetFilePath = path.join(RAW_DATA_DIR, fileName);
          if (fileName !== options.originalFileName && fs.existsSync(targetFilePath)) {
            fs.unlinkSync(targetFilePath);
            console.log(`🗑️ Cancel Revert: Deleted partial text file: ${targetFilePath}`);
          }
          const originalFilePath = path.join(RAW_DATA_DIR, options.originalFileName);
          fs.copyFileSync(options.backupPath, originalFilePath);
          fs.unlinkSync(options.backupPath);
          console.log(`🔄 Cancel Revert: Restored original file from backup: ${originalFilePath}`);
        } catch (revertErr) {
          console.error(`❌ [Job ${jobId}] Failed to revert files during cancel:`, revertErr);
        }
      } else if (options.isUpload) {
        const uploadedFilePath = path.join(RAW_DATA_DIR, fileName);
        if (fs.existsSync(uploadedFilePath)) {
          try {
            fs.unlinkSync(uploadedFilePath);
            console.log(`🗑️ Cancel Clean: Deleted uploaded file: ${uploadedFilePath}`);
          } catch (cleanErr) {
            console.error(`❌ [Job ${jobId}] Failed to delete uploaded file during cancel:`, cleanErr);
          }
        }
      }
    };

    try {
      const embeddingProvider = 'local';
      const embeddingModel = 'all-MiniLM-L6-v2';

      const chunks = DocumentService.chunkText(textContent, 800, 150);
      if (chunks.length === 0) {
        JobQueue.updateJob(jobId, { status: 'completed', progress: { done: 0, total: 0 } });
        deleteBackup();
        return;
      }

      let version = 1;
      try {
        const metadataRef = db.collection('ingestion_metadata');
        const querySnap = await metadataRef.where('fileName', '==', fileName).get();
        if (querySnap && querySnap.docs && querySnap.docs.length > 0) {
          const doc = querySnap.docs[0];
          sourceId = doc.id;
          version = (doc.data().version || 1) + 1;
        } else if (isDiff && oldFileName !== fileName) {
          const oldQuerySnap = await metadataRef.where('fileName', '==', oldFileName).get();
          if (oldQuerySnap && oldQuerySnap.docs && oldQuerySnap.docs.length > 0) {
            const doc = oldQuerySnap.docs[0];
            sourceId = doc.id;
            version = (doc.data().version || 1) + 1;
          }
        }
      } catch (err) {
        console.error('Error lookup metadata:', err);
      }

      try {
        await db.collection('ingestion_metadata').doc(sourceId).set({
          sourceId,
          fileName,
          version,
          status: 'Processing',
          startedAt: new Date().toISOString(),
          initiatedBy,
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
        console.error('Error writing processing status to metadata:', err);
      }

      if (JobQueue.getJob(jobId)?.cancelled) {
        await handleCancellation();
        return;
      }

      let category = fileName.toLowerCase().includes('requirement') ? 'requirements' :
                     fileName.toLowerCase().includes('instruction') ? 'instructions' :
                     fileName.toLowerCase().includes('conversation') ? 'examples' :
                     (fileName.toLowerCase().includes('structure') || fileName.toLowerCase().includes('knowledge')) ? 'knowledge_structure' : 'general';

      const collection = await ChromaService.getOrCreateCollection(COLLECTION_NAME);
      
      let chunksToEmbed = [];
      let chunksToInsertDirectly = [];
      let idsToDelete = [];

      if (isDiff) {
        console.log(`[Job ${jobId}] Running smart diff update for: "${oldFileName}" -> "${fileName}"`);
        
        const existing = await collection.get({
          where: { source: oldFileName },
          include: ['documents', 'metadatas', 'embeddings']
        });

        const existingMap = new Map();
        const existingIds = new Set();
        if (existing && existing.ids && existing.ids.length > 0) {
          for (let i = 0; i < existing.ids.length; i++) {
            const id = existing.ids[i];
            const text = existing.documents[i];
            const metadata = existing.metadatas[i];
            const embedding = existing.embeddings ? existing.embeddings[i] : null;
            const hash = metadata.chunkHash;
            existingIds.add(id);
            existingMap.set(hash, { id, text, embedding, chunkIndex: metadata.chunkIndex });
          }
        }

        const keptIds = new Set();

        for (let j = 0; j < chunks.length; j++) {
          const chunkText = chunks[j];
          const chunkId = `${fileName.replace(/\s+/g, '_')}_chunk_${j}`;
          const chunkHash = createHash('sha256').update(chunkText).digest('hex').slice(0, 16);

          const matched = existingMap.get(chunkHash);
          if (matched && matched.embedding && matched.embedding.length === 384) {
            if (matched.id === chunkId && matched.chunkIndex === j && oldFileName === fileName) {
              keptIds.add(chunkId);
              succeededCount++;
            } else {
              chunksToInsertDirectly.push({
                id: chunkId,
                text: chunkText,
                metadata: {
                  source: fileName,
                  sourceId,
                  category,
                  chunkIndex: j,
                  chunkHash,
                  timestamp: new Date().toISOString()
                },
                embedding: matched.embedding
              });
              keptIds.add(chunkId);
              succeededCount++;
            }
          } else {
            chunksToEmbed.push({
              text: chunkText,
              id: chunkId,
              hash: chunkHash,
              index: j
            });
            keptIds.add(chunkId);
          }
        }

        idsToDelete = [...existingIds].filter(id => !keptIds.has(id));
      } else {
        chunksToEmbed = chunks.map((text, idx) => ({
          text,
          id: `${fileName.replace(/\s+/g, '_')}_chunk_${idx}`,
          hash: createHash('sha256').update(text).digest('hex').slice(0, 16),
          index: idx
        }));
      }

      if (JobQueue.getJob(jobId)?.cancelled) {
        await handleCancellation();
        return;
      }

      if (idsToDelete.length > 0) {
        await collection.delete({ ids: idsToDelete });
        console.log(`[Job ${jobId}] Deleted ${idsToDelete.length} obsolete chunks from ChromaDB.`);
      }

      if (chunksToInsertDirectly.length > 0) {
        await ChromaService.addDocuments(COLLECTION_NAME, chunksToInsertDirectly);
        console.log(`[Job ${jobId}] Kept ${chunksToInsertDirectly.length} existing chunks without re-embedding.`);
      }

      JobQueue.updateJob(jobId, {
        progress: { done: succeededCount, total: chunks.length }
      });

      if (chunksToEmbed.length > 0) {
        console.log(`[Job ${jobId}] Generating local embeddings for ${chunksToEmbed.length} chunks...`);
        const textsToEmbed = chunksToEmbed.map(c => c.text);
        const embeddings = await LocalEmbeddingService.generateEmbeddingsBatch(textsToEmbed);

        const itemsToInsert = chunksToEmbed.map((item, i) => ({
          id: item.id,
          text: item.text,
          metadata: {
            source: fileName,
            sourceId,
            category,
            chunkIndex: item.index,
            chunkHash: item.hash,
            timestamp: new Date().toISOString()
          },
          embedding: embeddings[i]
        }));

        await ChromaService.addDocuments(COLLECTION_NAME, itemsToInsert);
        succeededCount += itemsToInsert.length;

        JobQueue.updateJob(jobId, {
          progress: { done: succeededCount, total: chunks.length }
        });
      }

      const finalStatus = 'Completed';
      
      JobQueue.updateJob(jobId, {
        status: 'completed',
        error: null,
        progress: { done: succeededCount, total: chunks.length }
      });

      try {
        await db.collection('ingestion_metadata').doc(sourceId).update({
          status: finalStatus,
          completedBy: initiatedBy,
          successfulChunks: succeededCount,
          failedChunks: 0,
          processingTimeMs: Date.now() - docStartTime,
          lastIndexedAt: new Date().toISOString()
        });
      } catch (err) {
        console.error(`⚠️ [Job ${jobId}] Failed to update metadata in Firestore:`, err);
      }

      deleteBackup();
      console.log(`🎉 [Job ${jobId}] Background ingestion completed for: "${fileName}" in ${((Date.now() - docStartTime)/1000).toFixed(1)}s`);

    } catch (jobErr) {
      console.error(`❌ [Job ${jobId}] Job crashed with exception:`, jobErr);
      JobQueue.updateJob(jobId, {
        status: 'failed',
        error: jobErr.message
      });
      deleteBackup();
    }

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

        const chunksCount = await KnowledgeController.indexTextContent(file, rawText, {
          initiatedBy: req.user?.email || req.user?.uid || 'admin-api'
        });
        totalChunks += chunksCount;
      }

      return res.status(200).json({
        success: true,
        message: `Successfully ingested ${totalChunks} chunks from ${files.length} documents.`,
        mode: 'local'
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
      const queryEmbedding = await LocalEmbeddingService.generateEmbedding(queryText);

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
   * Save an uploaded document to raw folder and run chunking/embedding pipeline in the background.
   */
  static async uploadDocument(req, res) {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Please upload a file via multipart form-data.' });
    }

    const fileName = req.file.originalname;
    const filePath = req.file.path;

    try {
      let text = '';
      if (fileName.toLowerCase().endsWith('.pdf')) {
        text = await DocumentService.parsePdf(filePath);
      } else if (fileName.toLowerCase().endsWith('.docx')) {
        text = await DocumentService.parseDocx(filePath);
      } else {
        text = fs.readFileSync(filePath, 'utf8');
      }

      // Create background job
      const initiatedBy = req.user?.email || req.user?.uid || 'admin-api';
      const jobId = JobQueue.createJob('upload', fileName, initiatedBy);

      // Run in background asynchronously
      setImmediate(() => {
        KnowledgeController.processIngestionInBackground(jobId, fileName, text, {
          initiatedBy,
          diffEnabled: false,
          isUpload: true
        });
      });

      return res.status(202).json({
        success: true,
        message: `File uploaded successfully. Indexing job "${jobId}" started in background.`,
        jobId
      });
    } catch (err) {
      console.error('File upload indexing failed:', err);
      // Clean up uploaded file on error
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (unlinkErr) {
          console.error('Failed to delete uploaded file after error:', unlinkErr);
        }
      }
      return res.status(500).json({ error: 'Failed to process uploaded document.', details: err.message });
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

      const chunkCount = await KnowledgeController.indexTextContent(fileName, textContent, {
        initiatedBy: req.user?.email || req.user?.uid || 'admin-api'
      });
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

      // Delete metadata record from Firestore
      try {
        const metadataRef = db.collection('ingestion_metadata');
        const querySnap = await metadataRef.where('fileName', '==', fileName).get();
        if (querySnap && querySnap.docs && querySnap.docs.length > 0) {
          for (const doc of querySnap.docs) {
            await doc.ref.delete();
          }
          console.log(`🗑️ Deleted ingestion_metadata record for file: "${fileName}"`);
        }
      } catch (err) {
        console.error('Error deleting metadata record:', err);
      }

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
   * Update the content of an uploaded knowledge source using a smart diff background job.
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

      const isBinary = safeName.toLowerCase().endsWith('.pdf') || safeName.toLowerCase().endsWith('.docx');
      let targetFileName = safeName;
      let backupPath = path.join(RAW_DATA_DIR, `${safeName}.bak`);

      // Create backup of original file
      fs.copyFileSync(filePath, backupPath);
      console.log(`💾 Backed up original file "${safeName}" to "${backupPath}"`);

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

      // Create background job for smart diff indexing
      const initiatedBy = req.user?.email || req.user?.uid || 'admin-api';
      const jobId = JobQueue.createJob('edit', targetFileName, initiatedBy);

      setImmediate(() => {
        KnowledgeController.processIngestionInBackground(jobId, targetFileName, content, {
          initiatedBy,
          diffEnabled: true,
          oldFileName: safeName,
          backupPath,
          originalFileName: safeName,
          isUpload: false
        });
      });

      return res.status(202).json({
        success: true,
        message: `Content update started in background. Indexing job "${jobId}" running.`,
        jobId,
        fileName: targetFileName
      });
    } catch (error) {
      console.error('Error updating source content:', error);
      return res.status(500).json({ error: 'Failed to update file contents.', details: error.message });
    }
  }

  /**
   * Get the status and progress of an active background indexing job.
   */
  static async getJobStatus(req, res) {
    const { jobId } = req.params;
    if (!jobId) {
      return res.status(400).json({ error: 'jobId parameter is required.' });
    }

    const job = JobQueue.getJob(jobId);
    if (!job) {
      return res.status(404).json({ error: `Job with ID "${jobId}" not found or expired.` });
    }

    return res.status(200).json({ success: true, job });
  }

  /**
   * Cancel an active background indexing job.
   */
  static async cancelJob(req, res) {
    const { jobId } = req.params;
    if (!jobId) {
      return res.status(400).json({ error: 'jobId parameter is required.' });
    }

    const job = JobQueue.cancelJob(jobId);
    if (!job) {
      return res.status(404).json({ error: `Job with ID "${jobId}" not found or expired.` });
    }

    return res.status(200).json({ success: true, message: 'Cancellation signal sent.', job });
  }

  /**
   * Get dynamic ingestion metadata for the dashboard.
   */
  static async getIngestionMetadata(req, res) {
    try {
      const snapshot = await db.collection('ingestion_metadata')
        .orderBy('lastIndexedAt', 'desc')
        .limit(50)
        .get();

      const records = [];
      snapshot.forEach(doc => {
        records.push(doc.data());
      });

      return res.status(200).json({ records });
    } catch (error) {
      console.error('Error fetching ingestion metadata:', error);
      return res.status(500).json({ error: 'Failed to retrieve ingestion metadata.' });
    }
  }

  /**
   * List paginated chunks from ChromaDB.
   */
  static async listChunks(req, res) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 20;
      const sourceFilter = req.query.source || null;

      const collection = await ChromaService.getOrCreateCollection(COLLECTION_NAME);
      const getOptions = {};
      if (sourceFilter) {
        getOptions.where = { source: sourceFilter };
      }

      const allData = await collection.get(getOptions);

      if (!allData || !allData.ids) {
        return res.status(200).json({ chunks: [], total: 0, page, limit, totalPages: 0 });
      }

      const total = allData.ids.length;
      const totalPages = Math.ceil(total / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = Math.min(startIndex + limit, total);

      const chunks = [];
      for (let i = startIndex; i < endIndex; i++) {
        chunks.push({
          id: allData.ids[i],
          text: allData.documents ? allData.documents[i] : '',
          metadata: allData.metadatas ? allData.metadatas[i] : {}
        });
      }

      return res.status(200).json({
        chunks,
        total,
        page,
        limit,
        totalPages
      });
    } catch (error) {
      console.error('Error listing chunks from ChromaDB:', error);
      return res.status(500).json({ error: 'Failed to fetch vector chunks.', details: error.message });
    }
  }

  /**
   * Delete a single chunk by ID from ChromaDB.
   */
  static async deleteChunk(req, res) {
    const { chunkId } = req.params;
    if (!chunkId) {
      return res.status(400).json({ error: 'chunkId parameter is required.' });
    }

    try {
      const collection = await ChromaService.getOrCreateCollection(COLLECTION_NAME);
      await collection.delete({ ids: [chunkId] });
      return res.status(200).json({ success: true, message: `Chunk "${chunkId}" deleted successfully.` });
    } catch (error) {
      console.error('Error deleting chunk:', error);
      return res.status(500).json({ error: 'Failed to delete chunk.', details: error.message });
    }
  }

  /**
   * Update a single chunk's text and re-generate its embedding in real-time (<200ms).
   */
  static async updateChunk(req, res) {
    const { chunkId } = req.params;
    const { text } = req.body;

    if (!chunkId) {
      return res.status(400).json({ error: 'chunkId parameter is required.' });
    }
    if (text === undefined || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Valid text parameter (string) is required.' });
    }

    try {
      const collection = await ChromaService.getOrCreateCollection(COLLECTION_NAME);

      // Fetch current chunk to preserve metadata
      const existing = await collection.get({ ids: [chunkId] });
      const currentMeta = (existing && existing.metadatas && existing.metadatas[0]) ? existing.metadatas[0] : {};

      // Update metadata
      const updatedMeta = {
        ...currentMeta,
        manuallyEdited: true,
        lastEditedAt: new Date().toISOString()
      };

      // Generate 1 single embedding via local model
      const embedding = await LocalEmbeddingService.generateEmbedding(text);


      // Update in ChromaDB
      await collection.update({
        ids: [chunkId],
        documents: [text],
        embeddings: [embedding],
        metadatas: [updatedMeta]
      });

      console.log(`⚡ Instant chunk update completed for ID "${chunkId}"`);

      return res.status(200).json({
        success: true,
        message: `Chunk updated and re-embedded successfully in real time.`,
        chunk: {
          id: chunkId,
          text,
          metadata: updatedMeta
        }
      });
    } catch (error) {
      console.error('Error updating single chunk:', error);
      return res.status(500).json({ error: 'Failed to update chunk.', details: error.message });
    }
  }
}


