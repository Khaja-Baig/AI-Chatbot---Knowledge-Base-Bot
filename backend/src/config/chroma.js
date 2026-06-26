import { ChromaClient } from 'chromadb';
import dotenv from 'dotenv';

dotenv.config();

const chromaClient = new ChromaClient({
  path: process.env.CHROMA_URL || 'http://localhost:8000'
});

export default chromaClient;
