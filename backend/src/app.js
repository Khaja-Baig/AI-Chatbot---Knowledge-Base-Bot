import express from 'express';
import cors from 'cors';
import chatRoutes from './routes/chat.routes.js';
import knowledgeRoutes from './routes/knowledge.routes.js';
import configRoutes from './routes/config.routes.js';
import authRoutes from './routes/auth.routes.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Expose static logs if needed or client bundles
// Routes
app.use('/api/chat', chatRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/config', configRoutes);
app.use('/api/auth', authRoutes);

// Base / Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString()
  });
});

// 404 Fallback
app.use((req, res) => {
  res.status(404).json({ error: 'Resource not found' });
});

// Error Middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Application Error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error', 
    message: err.message 
  });
});

export default app;
