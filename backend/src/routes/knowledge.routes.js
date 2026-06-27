import express from 'express';
import { KnowledgeController } from '../controllers/knowledge.controller.js';
import { requireAdmin } from '../middleware/auth.middleware.js';

const router = express.Router();

// All knowledge management routes are admin-only
router.use(requireAdmin);

router.post('/ingest', KnowledgeController.ingest);
router.get('/status', KnowledgeController.getStatus);
router.post('/query', KnowledgeController.query);
router.post('/upload', KnowledgeController.uploadDocument);
router.post('/faq', KnowledgeController.createFaq);
router.delete('/delete', KnowledgeController.deleteDocument);
router.get('/sources/:sourceName', KnowledgeController.getSourceContent);
router.put('/sources/:sourceName', KnowledgeController.updateSourceContent);

export default router;
