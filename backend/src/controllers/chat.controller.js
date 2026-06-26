import { db } from '../config/firebase.js';
import { GeminiService } from '../services/gemini.service.js';
import { ChromaService } from '../services/chroma.service.js';

const KNOWLEDGE_COLLECTION = 'admissions_knowledge';

const SYSTEM_INSTRUCTION = `You are Guru, a friendly and knowledgeable admissions guide at NavGurukul.
Sound like a warm, supportive older sibling or mentor — approachable, helpful, and honest. Not a formal AI, not a customer service bot.

STRICT BEHAVIORAL GUIDELINES:

1. PERSONA & TONE
- Use everyday language a school or college student naturally understands.
- Prefer plain words over jargon: "admission test" not "screening assessment", "what you'll learn" not "curriculum", "join" not "enroll".
- Match the student's communication style, not just their language:
  - Formal message -> respond formally and respectfully.
  - Casual message -> respond casually and relaxed.
  - One-line question -> keep it concise.
  - Detailed question -> provide sufficient detail.

2. VARIETY & NATURAL FLOW
- Never start responses the same way twice in a conversation. Vary openings, phrasing, and sentence structure naturally.
- Don't force greetings, filler phrases, or enthusiasm. Use them only when they genuinely fit.
- Answer the student's question directly first. Add context only if it helps.

3. ACCURACY & COMPLETENESS
- Simple language must NEVER mean incomplete information.
- If a topic has multiple conditions or steps, cover all of them — explain each simply, don't merge or skip.
- Never invent facts, numbers, dates, fees, eligibility criteria, or policies under any circumstances.

4. KNOWLEDGE RETRIEVAL POLICY
- Knowledge Base is the primary source. Always answer from the "Knowledge Base Context" provided below for NavGurukul-specific topics.
- General knowledge questions (e.g., "What is Git?", "How do I prepare for interviews?"): Answer from your own training knowledge. These do not require the knowledge base.
- NavGurukul-specific gaps: If official information is not in the knowledge base, say honestly: "I don't have the official details on this right now. I'd suggest checking NavGurukul's official website or reaching out to the admissions team directly." Do not guess. Do not use unofficial sources.
- Never hallucinate. When in doubt, admit it and point the student toward the right channel.

5. CONVERSATION QUALITY
- Maintain context across all turns. Never treat a follow-up as if it's a fresh conversation.
- Do not repeat information already covered in the session unless the student asks again.
- Follow-up responses should feel like a natural continuation, not a reset.

Knowledge Base Context:
{RAG_CONTEXT}

End of Context.`;

/**
 * Detect the language and script of the user's message to provide direct prompt guidance.
 * Supports English, Hindi (Devanagari), other regional Indian scripts, and Hinglish (Roman Hindi).
 */
function detectUserLanguage(message) {
  if (!message) return { language: 'English', instruction: 'Respond in simple, natural English.' };

  const text = message.trim();

  // 1. Check for Devanagari Hindi
  if (/[\u0900-\u097F]/.test(text)) {
    return {
      language: 'Hindi (Devanagari)',
      instruction: 'The user has written in Devanagari Hindi. You MUST respond ONLY in clear, natural, and friendly Devanagari Hindi. Do NOT use Latin script (English letters) for Hindi words.'
    };
  }

  // 2. Check for other Indian scripts
  const scripts = [
    { name: 'Telugu', regex: /[\u0C00-\u0C7F]/ },
    { name: 'Tamil', regex: /[\u0B80-\u0BFF]/ },
    { name: 'Kannada', regex: /[\u0C80-\u0CFF]/ },
    { name: 'Malayalam', regex: /[\u0D00-\u0D7F]/ },
    { name: 'Bengali', regex: /[\u0980-\u09FF]/ },
    { name: 'Gujarati', regex: /[\u0A80-\u0AFF]/ },
    { name: 'Punjabi', regex: /[\u0A00-\u0A7F]/ },
    { name: 'Odia', regex: /[\u0B00-\u0B7F]/ }
  ];

  for (const script of scripts) {
    if (script.regex.test(text)) {
      return {
        language: script.name,
        instruction: `The user has written in ${script.name}. You MUST respond ONLY in clear, natural, and friendly ${script.name} using the correct regional script.`
      };
    }
  }

  // 3. Check for Roman Hindi / Hinglish vs English
  const cleanText = text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, ' ');
  const words = cleanText.split(/\s+/).filter(w => w.length > 0);

  const HINGLISH_STRONG = new Set([
    'kya', 'kiya', 'khiya', 'hai', 'hain', 'kaise', 'kaisa', 'kaisi', 'kab', 'kaha', 'kahan',
    'kuch', 'badhiya', 'karna', 'karne', 'raha', 'rahi', 'rahe', 'milega', 'milegi', 'hoga',
    'hogi', 'kyu', 'kyon', 'kyun', 'kyuki', 'kyunki', 'lekin', 'magar', 'nahi', 'nahin',
    'accha', 'achha', 'achhi', 'achhe', 'saath', 'paas', 'batao', 'bataiye', 'samjhao',
    'samjhaiye', 'sakte', 'sakta', 'sakti', 'chahiye', 'apna', 'apne', 'apni', 'tum',
    'aap', 'mera', 'meri', 'mere', 'tumhara', 'aapka', 'aapki', 'aapke', 'karke', 'krke',
    'kro', 'rha', 'rhi', 'rhe', 'krna', 'samajh', 'samjh', 'aasan', 'seedhe', 'bata',
    'btao', 'samjha', 'sikhao', 'seekho', 'sikhna', 'seekhna', 'padhna', 'padhe', 'padha'
  ]);

  const HINGLISH_MEDIUM = new Set([
    'aur', 'yeh', 'toh', 'toa', 'tha', 'thi', 'the', 'ko', 'se', 'mein', 'bhi', 'ek',
    'ab', 'sab', 'kar', 'mil', 'naam', 'nam', 'kis', 'kise', 'kisko', 'mat', 'yaar',
    'yar', 'sath', 'baad', 'pehle', 'pehla', 'pehli', 'aaj', 'kal', 'parso', 'shuru',
    'khatam', 'log', 'bhai', 'didi', 'likho', 'karo', 'hote', 'hota', 'hoti', 'hum',
    'ham', 'unka', 'unki', 'unke', 'iska', 'iski', 'iske', 'uska', 'uski', 'uske',
    'jaisa', 'jaise', 'jaisi', 'waisa', 'waise', 'waisi', 'sahi', 'galat', 'thik',
    'theek', 'kr'
  ]);

  const ENGLISH_WORDS = new Set([
    'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you',
    'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or', 'an', 'will', 'my', 'one',
    'all', 'would', 'there', 'their', 'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me', 'when',
    'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take', 'people', 'into', 'year', 'your', 'good', 'some',
    'could', 'them', 'see', 'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also', 'back',
    'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these',
    'give', 'day', 'most', 'us', 'is', 'am', 'are', 'was', 'were', 'been', 'has', 'had', 'does', 'did', 'should', 'would',
    'could', 'can', 'may', 'might', 'must', 'shall', 'will', 'hi', 'hello', 'hey', 'ok', 'okay', 'yes', 'no', 'thanks', 'thank'
  ]);

  let hinglishScore = 0;
  let englishScore = 0;

  for (const word of words) {
    if (HINGLISH_STRONG.has(word)) {
      hinglishScore += 2.0;
    } else if (HINGLISH_MEDIUM.has(word)) {
      hinglishScore += 1.0;
    }
    if (ENGLISH_WORDS.has(word)) {
      englishScore += 1.0;
    }
  }

  // If Hinglish score is substantial and dominates or equals English, classify as Hinglish
  if (hinglishScore >= 1.5 && hinglishScore > englishScore) {
    return {
      language: 'Hinglish (Roman Hindi)',
      instruction: 'The user has written in Hinglish (Roman Hindi). You MUST respond in warm, conversational Hinglish (Hindi written using English/Latin alphabets). Do NOT use Devanagari script. Keep it natural and friendly, matching the user\'s style.'
    };
  }

  // If there are clear English words and no strong Hinglish, it's English
  if (englishScore > 0 && englishScore >= hinglishScore) {
    return {
      language: 'English',
      instruction: 'The user has written in English. You MUST respond ONLY in simple, natural, and friendly English. Do NOT mix any Hindi, Hinglish, or Roman Hindi words (like "toh", "hai", "aur", "ya", "batao", etc.) in your response. Respond completely in standard English.'
    };
  }

  // Fallback for short messages or other latin languages: let the model identify
  return {
    language: 'User\'s input language',
    instruction: 'Please identify the language of the user\'s message and respond in that exact same language and script. If the query is in English, reply in English. If it is in Hinglish, reply in Hinglish. If it is in Hindi, reply in Hindi.'
  };
}

export class ChatController {
  /**
   * Process incoming user chat message, perform vector search, construct prompt, call Gemini, and save to database.
   */
  static async sendMessage(req, res) {
    const { message, sessionId } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message field is required.' });
    }

    const activeSessionId = sessionId || `session_${Date.now()}`;

    try {
      // 1. Retrieve conversation history from Firestore
      const sessionDocRef = db.collection('sessions').doc(activeSessionId);
      const sessionSnap = await sessionDocRef.get();
      
      let chatHistory = [];
      if (sessionSnap.exists) {
        const sessionData = sessionSnap.data();
        chatHistory = sessionData.messages || [];
      }

      // 2. Perform vector search in ChromaDB
      let ragContextText = 'No specific documents found.';
      try {
        // Generate embedding for query
        const queryEmbedding = await GeminiService.generateEmbedding(message);
        
        // Retrieve top 4 relevant chunks
        const matchedChunks = await ChromaService.query(KNOWLEDGE_COLLECTION, queryEmbedding, 4);
        
        if (matchedChunks && matchedChunks.length > 0) {
          ragContextText = matchedChunks
            .map((chunk, index) => `[Doc ${index + 1} - Source: ${chunk.metadata.source}]\n${chunk.text}`)
            .join('\n\n');
        }
      } catch (err) {
        console.warn('⚠️ Vector search failed or skipped (likely due to mock mode):', err.message);
        ragContextText = 'Using fallback generic rules. Vector DB query skipped.';
      }

      // 3. Format history for Gemini SDK
      // Format expects: Array<{ role: 'user'|'model', parts: [{ text: string }] }>
      const formattedContents = [];
      
      // Add past messages
      chatHistory.forEach(msg => {
        formattedContents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }]
        });
      });

      // Add current user message
      formattedContents.push({
        role: 'user',
        parts: [{ text: message }]
      });

      // 4. Interpolate RAG context and language instructions into System Instruction
      const { language, instruction: languageInstruction } = detectUserLanguage(message);
      
      const baseSystemInstruction = SYSTEM_INSTRUCTION.replace('{RAG_CONTEXT}', ragContextText);
      const personalizedSystemInstruction = `${baseSystemInstruction}

=== CRITICAL CURRENT TURN INSTRUCTIONS ===
- DETECTED USER LANGUAGE: ${language}
- REQUIRED RESPONSE LANGUAGE: ${language}
- DIRECTION: ${languageInstruction}
- STYLE CONSTRAINT:
  1. Generate responses that are sufficiently detailed to answer the student's query accurately, without adding unnecessary information.
  2. Vary the sentence opening naturally — do not reuse the same opener from recent turns.
  3. Cover all parts of a multi-part answer — do not omit details for brevity.
  4. Do not add enthusiasm or encouragement unless context genuinely calls for it.
  5. Never invent information. For NavGurukul-specific gaps, guide to official resources honestly.`;

      // 5. Invoke Gemini Chat API
      const responseText = await GeminiService.generateChatResponse({
        systemInstruction: personalizedSystemInstruction,
        contents: formattedContents
      });

      // 6. Save message history back to Firestore (or mock JSON DB)
      const updatedMessages = [
        ...chatHistory,
        { role: 'user', text: message, timestamp: new Date().toISOString() },
        { role: 'model', text: responseText, timestamp: new Date().toISOString() }
      ];

      await sessionDocRef.set({
        sessionId: activeSessionId,
        updatedAt: new Date().toISOString(),
        messages: updatedMessages
      }, { merge: true });

      // Determine suggested follow-up questions based on message and response content
      let suggestedQuestions = [];
      const userMsgLower = message.toLowerCase();
      const botMsgLower = responseText.toLowerCase();

      if (userMsgLower.includes('business') || userMsgLower.includes('sob') || botMsgLower.includes('sob') || botMsgLower.includes('business')) {
        suggestedQuestions = [
          "What is the duration of the SOB course?",
          "What are the career paths for SOB?",
          "Do you get placement support?"
        ];
      } else if (userMsgLower.includes('placement') || botMsgLower.includes('placement') || botMsgLower.includes('hiring') || botMsgLower.includes('career')) {
        suggestedQuestions = [
          "Which companies hire from NavGurukul?",
          "Is there interview preparation?",
          "Are there mock interviews?"
        ];
      } else if (userMsgLower.includes('admission') || userMsgLower.includes('apply') || userMsgLower.includes('join') || botMsgLower.includes('admission') || botMsgLower.includes('apply')) {
        suggestedQuestions = [
          "Can I apply after 12th?",
          "What is the screening assessment?",
          "What documents are required to apply?"
        ];
      } else if (userMsgLower.includes('hostel') || userMsgLower.includes('residential') || botMsgLower.includes('hostel') || botMsgLower.includes('residential') || botMsgLower.includes('campus')) {
        suggestedQuestions = [
          "Is the hostel free?",
          "What is the daily routine?",
          "Where are the campuses located?"
        ];
      } else {
        suggestedQuestions = [
          "Tell me about the School of Business",
          "What is the admission process?",
          "Is the program free of cost?"
        ];
      }

      // 7. Return payload to client
      return res.status(200).json({
        response: responseText,
        sessionId: activeSessionId,
        suggestedQuestions
      });
    } catch (error) {
      console.error('Error in sendMessage:', error);
      return res.status(500).json({ error: 'Failed to process chat message.' });
    }
  }

  /**
   * Fetch conversation history for a specific session.
   */
  static async getHistory(req, res) {
    const { sessionId } = req.params;
    try {
      const sessionDocRef = db.collection('sessions').doc(sessionId);
      const sessionSnap = await sessionDocRef.get();

      if (!sessionSnap.exists) {
        return res.status(404).json({ error: 'Session not found.' });
      }

      return res.status(200).json(sessionSnap.data());
    } catch (error) {
      console.error('Error fetching chat history:', error);
      return res.status(500).json({ error: 'Failed to fetch history.' });
    }
  }

  /**
   * List all recent chat sessions.
   */
  static async listSessions(req, res) {
    try {
      const sessionsRef = db.collection('sessions');
      const snap = await sessionsRef.get();
      
      const sessions = [];
      snap.forEach(doc => {
        const data = doc.data();
        sessions.push({
          sessionId: doc.id,
          updatedAt: data.updatedAt,
          messageCount: data.messages ? data.messages.length : 0,
          lastMessage: data.messages && data.messages.length > 0 
            ? data.messages[data.messages.length - 1].text 
            : ''
        });
      });

      // Sort by updatedAt descending
      sessions.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

      return res.status(200).json(sessions);
    } catch (error) {
      console.error('Error listing sessions:', error);
      return res.status(500).json({ error: 'Failed to list sessions.' });
    }
  }

  /**
   * Delete a chat session.
   */
  static async deleteSession(req, res) {
    const { sessionId } = req.params;
    try {
      const sessionDocRef = db.collection('sessions').doc(sessionId);
      await sessionDocRef.delete();
      return res.status(200).json({ success: true, message: `Session ${sessionId} deleted.` });
    } catch (error) {
      console.error('Error deleting session:', error);
      return res.status(500).json({ error: 'Failed to delete session.' });
    }
  }
}
