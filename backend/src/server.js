import app from './app.js';
import dotenv from 'dotenv';
import { LocalEmbeddingService } from './services/localEmbedding.service.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log('==================================================');
  console.log(`🚀 Server is listening on: http://localhost:${PORT}`);
  console.log(`🩺 Health status link: http://localhost:${PORT}/health`);
  console.log('==================================================');

  LocalEmbeddingService.warmUp().catch(err => {
    console.warn('⚠️ Model warm up warning:', err.message);
  });
});

