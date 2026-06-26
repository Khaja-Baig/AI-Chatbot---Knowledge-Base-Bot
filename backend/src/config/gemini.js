import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn('WARNING: GEMINI_API_KEY is not defined in the environment variables. The API calls may fail unless configured otherwise.');
}

const ai = new GoogleGenAI({ apiKey });

export default ai;
