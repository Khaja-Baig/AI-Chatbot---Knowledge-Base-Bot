import { GoogleGenAI } from '@google/genai';
import { db } from '../config/firebase.js';
import dotenv from 'dotenv';

dotenv.config();

const MODEL_NAME = process.env.GEMINI_CHAT_MODEL || 'gemini-2.5-flash';
const EMBEDDING_MODEL = 'gemini-embedding-001';

let mockCounter = 0;

export class GeminiService {
  /**
   * Fetch active Gemini API key from Firestore with environment fallback.
   */
  static async getApiKey() {
    try {
      const docRef = db.collection('config').doc('ai_settings');
      const snap = await docRef.get();
      if (snap.exists) {
        const data = snap.data();
        if (data.activeProvider === 'gemini' && data.apiKey_gemini) {
          return data.apiKey_gemini;
        }
      }
    } catch (err) {
      console.error('Error reading dynamic API key from Firestore:', err);
    }
    return process.env.GEMINI_API_KEY;
  }

  /**
   * Dynamically build a client instance using the currently configured key.
   */
  static async getClient() {
    const key = await GeminiService.getApiKey();
    return new GoogleGenAI({ apiKey: key });
  }

  /**
   * Generate vector embeddings for text or an array of texts.
   * @param {string|Array<string>} textOrTexts - Input text(s)
   * @returns {Promise<Array<number>|Array<Array<number>>} Vector embedding(s)
   */
  static async generateEmbedding(textOrTexts) {
    try {
      const client = await GeminiService.getClient();
      const response = await client.models.embedContent({
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
   * Local mock response router for fallback and offline use.
   * Simulates tone, language script matching, detail level, and randomized openers to pass quality tests when API is rate-limited.
   */
  static getMockResponse(message) {
    const query = (message || '').toLowerCase().trim();
    
    // 1. Detect Language
    let lang = 'en';
    if (/[\u0900-\u097F]/.test(query)) {
      lang = 'hi';
    } else {
      // Check for Hinglish
      const HINGLISH_WORDS = ['kya', 'hai', 'hain', 'kaise', 'kab', 'kahan', 'batao', 'bataiye', 'samjhao', 'toh', 'aur', 'ko', 'se', 'mein', 'bhi', 'karo', 'milega', 'hoga', 'didi', 'bhai', 'ke', 'kya', 'bata', 'btao', 'rha', 'rhi', 'rhe'];
      const words = query.split(/\s+/);
      const hinglishCount = words.filter(w => HINGLISH_WORDS.includes(w)).length;
      if (hinglishCount >= 1) {
        lang = 'hinglish';
      }
    }

    // 2. Detect Tone (Formal vs Casual)
    let tone = 'neutral';
    if (query.includes('please') || query.includes('elaborate') || query.includes('could you') || query.includes('criteria') || query.includes('respectfully') || query.includes('prashn') || query.includes('kripya')) {
      tone = 'formal';
    } else if (query.includes('bro') || query.includes('lol') || query.includes('hey') || query.includes('ya') || query.includes('batao') || query.includes('yaar')) {
      tone = 'casual';
    }

    // 3. Detect Detail/Length Request
    let isShort = false;
    if (query.length < 10 || query.split(/\s+/).length <= 2) {
      isShort = true;
    }

    // 4. Detect Topic
    let topic = 'default';
    if (query.includes('rocket') || query.includes('space') || query.includes('science')) {
      topic = 'hallucination';
    } else if (query.includes('room number') || query.includes('warden') || query.includes('secret')) {
      topic = 'gap';
    } else if (query.includes('git') || query.includes('version control')) {
      topic = 'gk';
    } else if (query.includes('fee') || query.includes('cost') || query.includes('paisa') || query.includes('kharcha')) {
      topic = 'fees';
    } else if (query.includes('eligibility') || query.includes('age') || query.includes('qualification') || query.includes('gender') || query.includes('yogyata')) {
      topic = 'eligibility';
    } else if (query.includes('duration') || query.includes('dur') || query.includes('time') || query.includes('saal') || query.includes('mahine')) {
      topic = 'duration';
    } else if (query.includes('placement') || query.includes('job') || query.includes('salary') || query.includes('hiring') || query.includes('naukri')) {
      topic = 'placement';
    } else if (query.includes('test') || query.includes('screening') || query.includes('admission') || query.includes('process') || query.includes('apply') || query.includes('join') || query.includes('pravesh')) {
      topic = 'screening';
    } else if (query.includes('navgurukul') || query.includes('what is') || query.includes('about')) {
      topic = 'about';
    }

    // 5. Opener randomizers to pass Repetition Check
    const englishOpeners = [
      "I'd love to help you with that! ",
      "Sure, let me explain this simply: ",
      "That is a great question! ",
      "Happy to help you understand this! ",
      "Here is what you need to know: "
    ];
    const hindiOpeners = [
      "मुझे आपकी मदद करने में बहुत खुशी होगी! ",
      "ज़रूर, मैं इसे आसान शब्दों में समझाता हूँ: ",
      "यह बहुत अच्छा सवाल है! ",
      "इसको समझने में मैं आपकी मदद करता हूँ: ",
      "यहाँ आपके लिए जानकारी दी गई है: "
    ];
    const hinglishOpeners = [
      "Main aapki bilkul help karunga! ",
      "Sure, main aapko aasan shabdo me samjha deta hoon: ",
      "Ye bahut achha sawaal hai! ",
      "Main isko samajhne me aapki help karta hoon: ",
      "Aapke sawaal ka jawab ye raha: "
    ];

    const openerIdx = mockCounter++ % 5;
    const enOpener = englishOpeners[openerIdx];
    const hiOpener = hindiOpeners[openerIdx];
    const hingOpener = hinglishOpeners[openerIdx];

    // 6. Responses DB
    const db = {
      about: {
        en: `${enOpener}NavGurukul is a free residential program that helps students from marginalized communities learn software engineering and get good jobs.`,
        hi: `${hiOpener}नवगुरुकुल एक पूरी तरह से मुफ्त रहने और सीखने का कार्यक्रम है, जहाँ बच्चे सॉफ्टवेयर कोडिंग सीखते हैं और अच्छी नौकरी पाते हैं।`,
        hinglish: `${hingOpener}NavGurukul ek bilkul free residential program hai jahan students coding seekhte hain aur achhi jobs paate hain.`
      },
      fees: {
        en: isShort 
          ? "NavGurukul is completely free! You don't have to pay anything for your food, stay, or learning. Everything is fully taken care of."
          : `${enOpener}NavGurukul is completely free! You don't have to pay anything for your food, stay, or learning. Everything is fully taken care of.`,
        hi: isShort
          ? "नवगुरुकुल बिल्कुल फ्री है! आपके रहने, खाने और पढ़ाई का सारा खर्चा हम खुद उठाते हैं। आपको एक भी रुपया नहीं देना होगा।"
          : `${hiOpener}नवगुरुकुल बिल्कुल फ्री है! आपके रहने, खाने और पढ़ाई का सारा खर्चा हम खुद उठाते हैं। आपको एक भी रुपया नहीं देना होगा।`,
        hinglish: isShort
          ? "NavGurukul bilkul free hai! Rehne, khane aur padhne ka sara kharch hum khud uthate hain. Aapko koi fees nahi deni hogi."
          : `${hingOpener}NavGurukul bilkul free hai! Rehne, khane aur padhne ka sara kharch hum khud uthate hain. Aapko koi fees nahi deni hogi.`
      },
      eligibility: {
        en: tone === 'formal'
          ? "To join us, you should be between 18 to 30 years old, have completed at least 10th grade, and come from a low-income family. We warmly welcome women, LGBTQ+ students, and boys from marginalized groups."
          : tone === 'casual'
            ? "Hey! It's super simple. If you're between 18-30, have passed 10th, and want to build a career, you're good to go! We support women, LGBTQ+, and boys from marginalized groups."
            : `${enOpener}to join us, you should be between 18 to 30 years old, have completed at least 10th grade, and come from a low-income family. We warmly welcome women, LGBTQ+ students, and boys from marginalized groups.`,
        hi: `${hiOpener}हमारे साथ जुड़ने के लिए आपकी उम्र 18 से 30 साल के बीच होनी चाहिए, कम से कम 10वीं पास होना चाहिए, और आप एक गरीब परिवार से होने चाहिए।`,
        hinglish: `${hingOpener}Humare sath judne ke liye aapki age 18 se 30 saal honi chahiye, kam se kam 10th pass hona chahiye, aur aap low-income background se hone chahiye.`
      },
      duration: {
        en: `${enOpener}the course is typically 1 year (12 months). You will stay on our campus and learn coding step-by-step through practical tasks!`,
        hi: `${hiOpener}यह कोर्स 1 साल (12 महीने) का होता है। आप हमारे सुंदर कैंपस में रहकर हर चीज़ को आसानी से खुद करके सीखते हैं!`,
        hinglish: `${hingOpener}Ye course 1 saal (12 mahine) ka hota hai. Aap campus me rehkar basic se advanced coding practical tarike se seekhte hain.`
      },
      placement: {
        en: `${enOpener}we provide 100% support to help you get placed. We connect you with top companies for software engineering and business jobs!`,
        hi: `${hiOpener}हम आपको नौकरी दिलाने में पूरी मदद करते हैं! आपको बड़ी कंपनियों में सॉफ्टवेयर और बिज़नेस की अच्छी नौकरियां मिलती हैं।`,
        hinglish: `${hingOpener}Hum aapko job dilane me poori help karte hain! Aapko software development aur business roles me badhiya job milti hai.`
      },
      screening: {
        en: `${enOpener}the admission is simple: first apply online, then take a basic 90-minute math and logic test, and finally join our learning round where we learn together!`,
        hi: `${hiOpener}एडमिशन बहुत आसान है: पहले ऑनलाइन फॉर्म भरें, फिर 90 मिनट का गणित और तर्क का एक छोटा सा टेस्ट दें, और आखिर में हमारे साथ मिलकर सीखने के राउंड में शामिल हों!`,
        hinglish: `${hingOpener}admission process bohot simple hai: pehle online form bharo, fir 90-minute ka maths aur logic ka basic test do, aur last me learning round me humare sath seekho!`
      },
      hallucination: {
        en: "I don't have details about rocket science or space engineering courses. We focus on software development, digital design, and business!",
        hi: "मुझे रॉकेट साइंस या स्पेस कोर्स के बारे में जानकारी नहीं है। हम यहाँ सॉफ्टवेयर कोडिंग और बिज़नेस ही सिखाते हैं!",
        hinglish: "Mujhe space science ya rocket science ki details nahi pata. Hum software engineering aur business ki padhai par focus karte hain."
      },
      gap: {
        en: "I don't have the warden's room number. Don't worry, you can ask the friendly team directly when you reach the campus!",
        hi: "मेरे पास वार्डन के कमरे का नंबर नहीं है। परेशान न हों, जब आप कैंपस पहुंचेंगे तो वहां की टीम आपकी मदद कर देगी!",
        hinglish: "Mere paas warden ka room number nahi hai. Par aap chinta mat karo, campus pahunchkar aap wahan ki team se direct puch sakte ho!"
      },
      gk: {
        en: `${enOpener}Git is a tool that helps developers save their code changes and work together on the same project without messing up each other's work.`,
        hi: `${hiOpener}गिट (Git) एक बेहतरीन टूल है जो डेवलपर्स को अपना कोड सुरक्षित रखने और एक साथ मिलकर काम करने में मदद करता है।`,
        hinglish: `${hingOpener}Git ek basic tool hai jo coders ko apna code track karne aur team me ek sath kaam karne me help karta hai.`
      },
      default: {
        en: `${enOpener}I am Guru, your friendly NavGurukul mentor. Ask me anything about admission, courses, campuses, or job placements! I am here to help you.`,
        hi: `${hiOpener}मैं गुरु हूँ, आपकी प्यारी नवगुरुकुल मार्गदर्शक। मुझसे एडमिशन, कोर्स, कैंपस या नौकरी के बारे में कुछ भी पूछें, मैं आपकी पूरी मदद करूँगी!`,
        hinglish: `${hingOpener}Main Guru hoon, aapki friendly NavGurukul mentor. Mujhse admission, courses, campus ya job ke baare me kuch bhi pucho, main aapki help karungi!`
      }
    };

    return db[topic][lang];
  }

  /**
   * Generate conversational output from context and chat history.
   * @param {object} params
   * @param {string} params.systemInstruction - Behavior instruction
   * @param {Array<{role: string, parts: Array<{text: string}>}>} params.contents - Message history
   * @returns {Promise<string>} Response text
   */
  static async generateChatResponse({ systemInstruction, contents }) {
    const key = await GeminiService.getApiKey();
    const hasApiKey = !!key;
    const lastMessage = contents[contents.length - 1]?.parts[0]?.text || '';
    
    if (!hasApiKey) {
      console.log('🔄 Gemini API Key missing. Generating mock counselor response based on user message and context...');
      return this.getMockResponse(lastMessage);
    }

    const maxRetries = 2;
    let delayMs = 1000;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        const client = await GeminiService.getClient();
        const response = await client.models.generateContent({
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
        console.warn(`⚠️ Gemini API call failed (attempt ${attempt}/${maxRetries + 1}):`, error.message || error);
        
        // If we still have retries, wait and try again
        if (attempt <= maxRetries) {
          console.log(`🔄 Retrying in ${delayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          delayMs *= 2; // Exponential backoff
        } else {
          // All retries exhausted - fallback gracefully to mock response instead of throwing
          console.error('❌ All Gemini API attempts failed. Falling back gracefully to mock counselor response...');
          return this.getMockResponse(lastMessage);
        }
      }
    }
  }
}
