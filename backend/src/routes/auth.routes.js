import express from 'express';
import { AuthController } from '../controllers/auth.controller.js';

const router = express.Router();

// Public route for saving registered user documents to database
router.post('/register', AuthController.register);

export default router;
