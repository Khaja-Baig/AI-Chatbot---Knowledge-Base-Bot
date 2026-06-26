import express from 'express';
import { KnowledgeController } from '../controllers/knowledge.controller.js';

const router = express.Router();

router.post('/ingest', KnowledgeController.ingest);
router.get('/status', KnowledgeController.getStatus);
router.post('/query', KnowledgeController.query);
router.post('/upload', KnowledgeController.uploadDocument);
router.post('/faq', KnowledgeController.createFaq);
router.delete('/delete', KnowledgeController.deleteDocument);

export default router;
