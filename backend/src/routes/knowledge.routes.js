import express from 'express';
import { KnowledgeController } from '../controllers/knowledge.controller.js';
import { requireAdmin } from '../middleware/auth.middleware.js';
import { upload } from '../middleware/upload.middleware.js';

const router = express.Router();

// All knowledge management routes are admin-only
router.use(requireAdmin);

router.post('/ingest', KnowledgeController.ingest);
router.get('/status', KnowledgeController.getStatus);
router.get('/ingestion-metadata', KnowledgeController.getIngestionMetadata);
router.get('/jobs/:jobId', KnowledgeController.getJobStatus);
router.delete('/jobs/:jobId', KnowledgeController.cancelJob);
router.post('/query', KnowledgeController.query);
router.post('/upload', upload.single('file'), KnowledgeController.uploadDocument);
router.post('/upload-multiple', upload.array('files', 20), KnowledgeController.uploadMultipleDocuments);
router.post('/faq', KnowledgeController.createFaq);
router.delete('/delete', KnowledgeController.deleteDocument);
router.get('/sources/:sourceName', KnowledgeController.getSourceContent);
router.put('/sources/:sourceName', KnowledgeController.updateSourceContent);

// Chunk management
router.get('/chunks', KnowledgeController.listChunks);
router.post('/chunks/batch-delete', KnowledgeController.deleteChunksBatch);
router.delete('/chunks/:chunkId', KnowledgeController.deleteChunk);
router.put('/chunks/:chunkId', KnowledgeController.updateChunk);

export default router;


