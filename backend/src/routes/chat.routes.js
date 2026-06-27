import express from 'express';
import { ChatController } from '../controllers/chat.controller.js';
import { optionalAuth } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(optionalAuth);

router.post('/message', ChatController.sendMessage);
router.get('/sessions', ChatController.listSessions);
router.get('/sessions/:sessionId', ChatController.getHistory);
router.delete('/sessions/:sessionId', ChatController.deleteSession);

export default router;
