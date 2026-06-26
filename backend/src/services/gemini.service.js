import ai from '../config/gemini.js';
import dotenv from 'dotenv';

dotenv.config();

const MODEL_NAME = process.env.GEMINI_CHAT_MODEL || 'gemini-2.5-flash';
const EMBEDDING_MODEL = 'gemini-embedding-001';

export class GeminiService {
  /**
   * Generate vector embeddings for text or an array of texts.
   * @param {string|Array<string>} textOrTexts - Input text(s)
   * @returns {Promise<Array<number>|Array<Array<number>>} Vector embedding(s)
   */
  static async generateEmbedding(textOrTexts) {
    try {
      const response = await ai.models.embedContent({
        model: EMBEDDING_MODEL,
        contents: textOrTexts,
        config: {
          outputDimensionality: 768
        }
      });

      if (response.embeddings && response.embeddings.length > 0) {
        if (Array.isArray(textOrTexts)) {
          return response.embeddings.map(e => e.values);
        } else {
          return response.embeddings[0].values;
        }
      }

      if (response.embedding && response.embedding.values) {
        if (Array.isArray(textOrTexts)) {
          return [response.embedding.values];
        } else {
          return response.embedding.values;
        }
      }

      throw new Error('Embedding response format unexpected.');
    } catch (error) {
      console.error('Error generating embedding with Gemini:', error);
      throw error;
    }
  }

  /**
   * Generate conversational output from context and chat history.
   * @param {object} params
   * @param {string} params.systemInstruction - Behavior instruction
   * @param {Array<{role: string, parts: Array<{text: string}>}>} params.contents - Message history
   * @returns {Promise<string>} Response text
   */
  static async generateChatResponse({ systemInstruction, contents }) {
    const hasApiKey = !!process.env.GEMINI_API_KEY;
    
    if (!hasApiKey) {
      console.log('🔄 Gemini API Key missing. Generating mock counselor response based on user message and context...');
      const lastMessage = contents[contents.length - 1]?.parts[0]?.text || '';
      const queryLower = lastMessage.toLowerCase();

      // Basic semantic router for mocking RAG context responses
      if (queryLower.includes('whats up') || queryLower.includes('what\'s up') || queryLower.includes('hi') || queryLower.includes('hello') || queryLower.includes('hey') || queryLower.includes('how are you')) {
        return "Hello! I am Guru, your NavGurukul Admissions Counselor. I'm here to help you understand our courses, admissions process, placements, and campus life. How can I help you today?";
      } else if (queryLower.includes('your name') || queryLower.includes('who are you') || queryLower.includes('what is your name') || queryLower.includes('introduce')) {
        return "I am Guru, your admissions counselor bot! I'm designed to help you explore courses, campuses, placements, and guidelines at NavGurukul.";
      } else if (queryLower.includes('business') || queryLower.includes('sob')) {
        return "Our School of Business (SOB) helps students develop practical workplace skills like communication, spreadsheets, data handling, customer support, CRM tools, and business operations. Students are prepared for roles such as Business Operations Associate, Customer Success Associate, CRM Associate, and related positions. Would you like to know more about the course duration or eligibility criteria?";
      } else if (queryLower.includes('career') || queryLower.includes('paths') || queryLower.includes('job') || queryLower.includes('opportunity')) {
        return "Graduates from the School of Business typically step into roles such as Business Operations Associate, CRM Associate, Customer Success Associate, Sales Support Executive, and Data Operations Associate. We provide targeted career preparation to match you with these paths.";
      } else if (queryLower.includes('placement') || queryLower.includes('job') || queryLower.includes('support')) {
        return "Yes, NavGurukul offers dedicated placement support! This includes resume preparation, mock interviews, and hiring opportunities with our partners. We guide students step-by-step to prepare them for the workforce.";
      } else if (queryLower.includes('admission') || queryLower.includes('process') || queryLower.includes('join') || queryLower.includes('apply')) {
        return "The admission process at NavGurukul generally involves submitting an online application, completing a screening assessment, and attending interview rounds. I can guide you through the latest timeline if you wish to apply!";
      } else if (queryLower.includes('hostel') || queryLower.includes('stay') || queryLower.includes('residential')) {
        return "Yes, residential facilities are available on our campuses! The community living model includes study areas, hostels, and shared activities. Let me know if you are interested in a specific campus location.";
      } else if (queryLower.includes('free') || queryLower.includes('cost') || queryLower.includes('fees')) {
        return "NavGurukul is a fully-funded program for selected students. Residential facilities, food, and learning resources are covered. We believe in providing access without financial burden.";
      } else {
        return "Aap NavGurukul ke baare mein kya jaanna chahte hain? Main aapko courses, placement support, admission process, aur residential campuses ke details simple language mein bata sakta hoon.";
      }
    }

    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents,
        config: {
          systemInstruction,
          temperature: 0.2, // Low temperature for higher factuality
          maxOutputTokens: 1000
        }
      });

      return response.text;
    } catch (error) {
      console.error('Error calling Gemini Chat:', error);
      throw error;
    }
  }
}
