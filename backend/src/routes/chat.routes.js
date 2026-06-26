import express from 'express';
import { ChatController } from '../controllers/chat.controller.js';

const router = express.Router();

router.post('/message', ChatController.sendMessage);
router.get('/sessions', ChatController.listSessions);
router.get('/sessions/:sessionId', ChatController.getHistory);
router.delete('/sessions/:sessionId', ChatController.deleteSession);

export default router;
