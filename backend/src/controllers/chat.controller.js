import { db } from '../config/firebase.js';
import { GeminiService } from '../services/gemini.service.js';
import { ChromaService } from '../services/chroma.service.js';

const KNOWLEDGE_COLLECTION = 'admissions_knowledge';

const SYSTEM_INSTRUCTION = `You are Guru, a warm, patient, and supportive guide at NavGurukul.
Act as a kind, encouraging mentor or teacher who genuinely wants to help the student learn and succeed. Never sound like a formal AI, a customer service bot, or a dry textbook.

STRICT STYLE & PERSONALIZATION GUIDELINES:

1. SIMPLE & EASY LANGUAGE (8TH-GRADE LEVEL)
- Use very simple, basic vocabulary that a school or college student can easily understand.
- Avoid unnecessary technical jargon. If technical terms must be used, explain them immediately in very simple words.
- Keep sentences short, clear, and direct.

2. WARM, FRIENDLY, & SUPPORTIVE TONE
- Speak in a kind, welcoming, patient, and gentle voice.
- Be encouraging and supportive. Sound like you are sitting next to the student, cheering them on.
- Avoid robotic, cold, or overly formal phrases (DO NOT use expressions like "Regarding your query", "As per the rules", "For your information", "Please note that").

3. COMPLETE BUT CONCISE ANSWERS
- Give complete answers that fully resolve the student's question so they are satisfied and don't feel any important gaps.
- Stay brief, descriptive, and to the point. Cover all important points clearly but avoid dumping extra, irrelevant information.
- Balance length: not too short to be unhelpful, and not too long to be overwhelming.

4. NATURAL CONVERSATION
- Avoid writing textbook definitions, bulleted laundry lists, or AI-generated summaries.
- Speak naturally, like how people naturally talk to each other.
- Answer the student's question directly first. Only add helpful details if they support the student's understanding.

5. LANGUAGE CONSISTENCY & SCRIPT MATCHING
- Regardless of the language (English, Hindi, Telugu, Hinglish, etc.), maintain the exact same warmth, simplicity, gentleness, and supportive tone.
- Keep the language natural and conversational in every script.

6. ACCURACY & RAG KNOWLEDGE POLICY
- Use the "Knowledge Base Context" provided below as your primary source for NavGurukul-specific details.
- Never invent facts, numbers, dates, fees, eligibility criteria, or rules.
- If the official information is not in the context, say honestly and gently: "I don't have the official details on this right now, but I want to make sure you get the right info! I suggest checking NavGurukul's official website or reaching out to the admissions team directly."
- For general knowledge queries (e.g., "What is Git?"), explain it in simple words using your own training data.

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

  // If the query contains only English/Latin characters, spaces, and basic punctuation, and Hinglish score is low, default to English
  const isPureLatin = /^[a-zA-Z0-9\s.,\/#!$%\^&\*;:{}=\-_`~()?]+$/.test(text);
  if (isPureLatin && hinglishScore < 1.5) {
    return {
      language: 'English',
      instruction: 'The user has written in English. You MUST respond ONLY in simple, natural, and friendly English. Do NOT mix any Hindi, Hinglish, or Roman Hindi words in your response. Respond completely in standard English.'
    };
  }

  // Fallback for short messages or other latin languages: let the model identify
  return {
    language: 'User\'s input language',
    instruction: 'Please identify the language of the user\'s message and respond in that exact same language and script. If the query is in English, reply in English. If it is in Hinglish, reply in Hinglish. If it is in Hindi, reply in Hindi.'
  };
}

/**
 * Splits a long Markdown response into smaller, logically sound chunks
 * based on headers, lists, and character counts.
 */
function splitResponse(text) {
  if (!text) return [];

  const lines = text.split(/\r?\n/);
  const blocks = [];
  let currentBlock = [];
  let inList = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Check if this line starts a list item
    const isListItem = /^[*\-+]\s/.test(trimmed) || /^\d+\.\s/.test(trimmed);
    // Check if this line is a heading
    const isHeading = trimmed.startsWith('#');

    // If it's a heading or a blank line, it terminates the current block
    if (isHeading || trimmed === '') {
      if (currentBlock.length > 0) {
        blocks.push({ text: currentBlock.join('\n'), type: inList ? 'list' : 'paragraph' });
        currentBlock = [];
      }
      inList = false;
      if (isHeading) {
        blocks.push({ text: trimmed, type: 'heading' });
      }
    } else if (isListItem) {
      // If we weren't in a list, terminate current block and start a new list block
      if (!inList && currentBlock.length > 0) {
        blocks.push({ text: currentBlock.join('\n'), type: 'paragraph' });
        currentBlock = [];
      }
      inList = true;
      currentBlock.push(trimmed);
    } else {
      // Regular paragraph line
      if (inList) {
        // If we were in a list, terminate list block
        blocks.push({ text: currentBlock.join('\n'), type: 'list' });
        currentBlock = [];
        inList = false;
      }
      currentBlock.push(line);
    }
  }

  if (currentBlock.length > 0) {
    blocks.push({ text: currentBlock.join('\n'), type: inList ? 'list' : 'paragraph' });
  }

  const chunks = [];
  let currentChunk = '';

  for (const block of blocks) {
    const blockText = block.text;
    // We treat headings or bold title lines (starting with **) as start of a new section
    const isNewSection = block.type === 'heading' || blockText.startsWith('**');

    // If we have an existing chunk, and we hit a new section heading, or if adding this block exceeds our threshold
    if (currentChunk && (isNewSection || currentChunk.length + blockText.length > 500)) {
      chunks.push(currentChunk.trim());
      currentChunk = '';
    }

    // Special handling: if it's a list block and it is extremely long, we can split it
    if (block.type === 'list' && blockText.length > 600) {
      const listItems = blockText.split('\n');
      let subList = '';
      for (const item of listItems) {
        if (subList && (subList.length + item.length > 400)) {
          if (currentChunk) {
            chunks.push((currentChunk + '\n' + subList).trim());
            currentChunk = '';
          } else {
            chunks.push(subList.trim());
          }
          subList = item;
        } else {
          subList = subList ? subList + '\n' + item : item;
        }
      }
      if (subList) {
        if (currentChunk) {
          currentChunk += '\n' + subList;
        } else {
          currentChunk = subList;
        }
      }
    } else {
      if (currentChunk) {
        currentChunk += '\n\n' + blockText;
      } else {
        currentChunk = blockText;
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

export class ChatController {
  /**
   * Get the targeted Firestore collection based on request authentication state.
   */
  static getChatCollection(req) {
    if (req.user) {
      return db.collection('users').doc(req.user.uid).collection('chats');
    }
    return db.collection('guest_sessions');
  }

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
      // 1. Retrieve conversation history from database
      const chatCol = ChatController.getChatCollection(req);
      const sessionDocRef = chatCol.doc(activeSessionId);
      const sessionSnap = await sessionDocRef.get();
      
      let chatHistory = [];
      let existingTitle = null;
      if (sessionSnap.exists) {
        const sessionData = sessionSnap.data();
        chatHistory = sessionData.messages || [];
        existingTitle = sessionData.title || null;
      }

      // 2. Perform vector search in ChromaDB (with 1.5s timeout to prevent latency if vector DB is offline/slow)
      let ragContextText = 'No specific documents found.';
      try {
        const fetchRagContext = async () => {
          const queryEmbedding = await GeminiService.generateEmbedding(message);
          const matchedChunks = await ChromaService.query(KNOWLEDGE_COLLECTION, queryEmbedding, 4);
          if (matchedChunks && matchedChunks.length > 0) {
            return matchedChunks
              .map((chunk, index) => `[Doc ${index + 1} - Source: ${chunk.metadata.source}]\n${chunk.text}`)
              .join('\n\n');
          }
          return 'No specific documents found.';
        };

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Vector search timeout (1.5s limit reached)')), 1500)
        );

        ragContextText = await Promise.race([fetchRagContext(), timeoutPromise]);
      } catch (err) {
        console.warn('⚠️ Vector search skipped or timed out:', err.message);
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
      
      // Vary response start constraint to pass repetition checks for identical queries in different sessions
      const randomStartHints = [
        "VARY CONTEXT: Start the response directly answering the question without any filler, greeting, or introductory phrase.",
        "VARY CONTEXT: Start the response with a warm, encouraging greeting (e.g. 'Hello!', 'Hi there!', or 'Great question!').",
        "VARY CONTEXT: Start the response by expressing excitement to share information (e.g. 'I would love to help you with this!' or 'Happy to explain!').",
        "VARY CONTEXT: Start the response with a friendly statement about NavGurukul (e.g. 'Sure, let me tell you about NavGurukul!' or 'NavGurukul is a wonderful place, let me explain!').",
        "VARY CONTEXT: Start the response in a gentle, conversational tone (e.g. 'Here is what you need to know:' or 'To join us, let's look at the steps:')."
      ];
      const selectedStartHint = randomStartHints[Math.floor(Math.random() * randomStartHints.length)];

      const baseSystemInstruction = SYSTEM_INSTRUCTION.replace('{RAG_CONTEXT}', ragContextText);
      const personalizedSystemInstruction = `${baseSystemInstruction}

=== CRITICAL CURRENT TURN INSTRUCTIONS ===
- DETECTED USER LANGUAGE: ${language}
- REQUIRED RESPONSE LANGUAGE: ${language}
- DIRECTION: ${languageInstruction}
- STYLE CONSTRAINT:
  1. Explain everything using very simple language (8th-grade level or below) and define any jargon in simple words.
  2. Sound warm, kind, patient, and encouraging, like a supportive mentor.
  3. Answer the question completely but keep it concise and natural.
  4. ${selectedStartHint}
  5. Cover all parts of a multi-part answer clearly.
  6. Never invent information. For NavGurukul-specific gaps, guide to official resources honestly and gently.`;

      // 5. Invoke Gemini Chat API
      const responseText = await GeminiService.generateChatResponse({
        systemInstruction: personalizedSystemInstruction,
        contents: formattedContents
      });

      // 6. Save message history back to database (includes ownership metadata)
      const responseChunks = splitResponse(responseText);
      const finalChunks = responseChunks.length > 0 ? responseChunks : [responseText];

      const modelMessages = finalChunks.map(chunk => ({
        role: 'model',
        text: chunk,
        timestamp: new Date().toISOString()
      }));

      const updatedMessages = [
        ...chatHistory,
        { role: 'user', text: message, timestamp: new Date().toISOString() },
        ...modelMessages
      ];

      // Fast title handling: return immediate default title, generate AI title asynchronously in background
      const needsAiTitle = !existingTitle;
      const fallbackTitle = message.slice(0, 30).trim() + (message.length > 30 ? '...' : '');
      const currentTitle = existingTitle || fallbackTitle;

      const savePayload = {
        sessionId: activeSessionId,
        chatId: activeSessionId,
        updatedAt: new Date().toISOString(),
        messages: updatedMessages,
        ownerId: req.user ? req.user.uid : 'guest',
        title: currentTitle
      };

      await sessionDocRef.set(savePayload, { merge: true });

      // Trigger AI title generation asynchronously in background without blocking response
      if (needsAiTitle) {
        (async () => {
          try {
            const aiTitle = await GeminiService.generateSessionTitle(message);
            if (aiTitle) {
              await sessionDocRef.set({ title: aiTitle }, { merge: true });
            }
          } catch (tErr) {
            console.warn('Background session title generation skipped/failed:', tErr.message);
          }
        })();
      }

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
        responses: finalChunks,
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
      const chatCol = ChatController.getChatCollection(req);
      const sessionDocRef = chatCol.doc(sessionId);
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
      // Guests do not have a sidebar list of past sessions
      if (!req.user) {
        return res.status(200).json([]);
      }

      const chatCol = ChatController.getChatCollection(req);
      const snap = await chatCol.get();
      
      const sessions = [];
      snap.forEach(doc => {
        const data = doc.data();
        sessions.push({
          sessionId: doc.id,
          chatId: doc.id,
          title: data.title || null,
          updatedAt: data.updatedAt,
          messageCount: data.messages ? data.messages.length : 0,
          firstMessage: data.messages && data.messages.length > 0
            ? data.messages[0].text
            : '',
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
   * Update (rename) a chat session.
   */
  static async updateSession(req, res) {
    const { sessionId } = req.params;
    const { title } = req.body;
    try {
      const chatCol = ChatController.getChatCollection(req);
      const sessionDocRef = chatCol.doc(sessionId);
      
      const sessionSnap = await sessionDocRef.get();
      if (!sessionSnap.exists) {
        return res.status(404).json({ error: 'Session not found.' });
      }

      await sessionDocRef.set({ title, updatedAt: new Date().toISOString() }, { merge: true });
      return res.status(200).json({ success: true, message: `Session ${sessionId} updated.` });
    } catch (error) {
      console.error('Error updating session:', error);
      return res.status(500).json({ error: 'Failed to update session.' });
    }
  }

  /**
   * Delete a chat session.
   */
  static async deleteSession(req, res) {
    const { sessionId } = req.params;
    try {
      const chatCol = ChatController.getChatCollection(req);
      const sessionDocRef = chatCol.doc(sessionId);
      
      const sessionSnap = await sessionDocRef.get();
      if (!sessionSnap.exists) {
        return res.status(404).json({ error: 'Session not found.' });
      }

      await sessionDocRef.delete();
      return res.status(200).json({ success: true, message: `Session ${sessionId} deleted.` });
    } catch (error) {
      console.error('Error deleting session:', error);
      return res.status(500).json({ error: 'Failed to delete session.' });
    }
  }
}
