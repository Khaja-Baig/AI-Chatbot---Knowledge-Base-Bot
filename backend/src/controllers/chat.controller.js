import { db } from '../config/firebase.js';
import { GeminiService } from '../services/gemini.service.js';
import { ChromaService } from '../services/chroma.service.js';

const KNOWLEDGE_COLLECTION = 'admissions_knowledge';

const SYSTEM_INSTRUCTION = `You are a warm, supportive, and friendly Admissions Counselor at NavGurukul.
Your goal is to help students, parents, and interested applicants understand courses, campuses, eligibility, placements, fees, and the overall learning model.

STRICT CONSTRAINTS FOR CONVERSATION:
1. Human-like & Empathetic: Sound like a friendly counselor, not a search engine or rigid FAQ bot. Explain information naturally rather than copy-pasting bullet lists.
2. Grounding (No Hallucinations): Base your responses ONLY on the verified facts provided in the "Knowledge Base Context" below. Do not make up facts, dates, requirements, or fees.
3. Handling Unknown Info: If the provided context does not contain the answer, state honestly: "I could not find official information regarding that. For the most accurate details, please check official announcements or contact the admissions team."
4. STRICT Language Matching:
   - You MUST detect and respond in the EXACT same language and script that the user wrote in.
   - If the user writes their query in English, you MUST reply ONLY in standard, conversational English. Do NOT mix Hindi/Hinglish words (e.g. do not say "aur", "yeh", "toh", "hai", etc.).
   - If the user writes in Devanagari Hindi, reply in natural Devanagari Hindi.
   - If the user writes in Roman Hindi / Hinglish (e.g., "screening test kaisa hota hai?"), you may respond in conversational Hinglish.
5. Context-Awareness: Pay attention to pronouns (e.g. "its duration", "hostel rules there") and keep track of the subject of conversation (e.g. a specific program or campus name discussed in previous turns).
6. Next Steps Guidance: Guide applicants when appropriate (e.g., details on application form, screening test, interview rounds).

Knowledge Base Context:
{RAG_CONTEXT}

End of Context.`;

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

      // 4. Interpolate RAG context into System Instruction
      const personalizedSystemInstruction = SYSTEM_INSTRUCTION.replace('{RAG_CONTEXT}', ragContextText);

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
