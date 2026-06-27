import express from 'express';
import { ConfigController } from '../controllers/config.controller.js';
import { requireAdmin } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/', ConfigController.getConfig);
router.post('/', requireAdmin, ConfigController.updateConfig);
router.get('/ai-config', requireAdmin, ConfigController.getAIConfig);
router.post('/ai-config', requireAdmin, ConfigController.updateAIConfig);

export default router;
