import { GeminiService } from '../src/services/gemini.service.js';
import dotenv from 'dotenv';
dotenv.config();

async function debug() {
  console.log("Debugging Gemini call directly...");
  try {
    const response = await GeminiService.generateChatResponse({
      systemInstruction: "You are Guru, a friendly guide.",
      contents: [{ role: 'user', parts: [{ text: "Hello" }] }]
    });
    console.log("Success! Response:", response);
  } catch (err) {
    console.error("FAILED with error:");
    console.error(err);
  }
}

debug();
