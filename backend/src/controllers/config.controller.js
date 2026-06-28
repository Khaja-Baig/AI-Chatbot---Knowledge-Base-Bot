import { db } from '../config/firebase.js';
import { GeminiService } from '../services/gemini.service.js';

const CONFIG_DOC_ID = 'chatbot';

const DEFAULT_CONFIG = {
  counselorName: 'Guru',
  counselorAvatar: '🤖',
  counselorAvatarUrl: '',
  sidebarLogoUrl: '',
  greetingMessage: 'Hello! I am Guru, your NavGurukul Admissions Counselor. I can help you understand our courses, admissions process, eligibility, placements, and campus life. How can I help you today?',
  behaviorMode: 'warm',
  maxHistoryTurns: 10
};

export class ConfigController {
  /**
   * Get the current chatbot configuration.
   */
  static async getConfig(req, res) {
    try {
      const docRef = db.collection('config').doc(CONFIG_DOC_ID);
      const snap = await docRef.get();

      if (!snap.exists) {
        // Save default config first
        await docRef.set(DEFAULT_CONFIG);
        return res.status(200).json(DEFAULT_CONFIG);
      }

      // Merge defaults in case new fields like counselorAvatarUrl are missing
      return res.status(200).json({ ...DEFAULT_CONFIG, ...snap.data() });
    } catch (error) {
      console.error('Error fetching chatbot config:', error);
      return res.status(500).json({ error: 'Failed to retrieve chatbot configuration.' });
    }
  }

  /**
   * Update the chatbot configuration.
   */
  static async updateConfig(req, res) {
    const newConfig = req.body;
    
    // Validate base64 string sizes to prevent massive uploads (max 512KB per image)
    if (newConfig.counselorAvatarUrl && newConfig.counselorAvatarUrl.length > 700000) {
      return res.status(400).json({ error: 'Avatar image is too large. Max size is 512KB.' });
    }
    if (newConfig.sidebarLogoUrl && newConfig.sidebarLogoUrl.length > 700000) {
      return res.status(400).json({ error: 'Sidebar logo image is too large. Max size is 512KB.' });
    }

    try {
      const docRef = db.collection('config').doc(CONFIG_DOC_ID);
      await docRef.set(newConfig, { merge: true });
      
      const updatedSnap = await docRef.get();
      return res.status(200).json({
        success: true,
        config: { ...DEFAULT_CONFIG, ...updatedSnap.data() }
      });
    } catch (error) {
      console.error('Error updating chatbot config:', error);
      return res.status(500).json({ error: 'Failed to update chatbot configuration.' });
    }
  }

  /**
   * Helper to mask API keys before sending to client.
   */
  static maskKey(key) {
    if (!key) return '';
    if (key.length <= 8) return '••••••••';
    return '••••••••' + key.substring(key.length - 4);
  }

  /**
   * Get the current dynamic AI configurations (masked).
   */
  static async getAIConfig(req, res) {
    try {
      const docRef = db.collection('config').doc('ai_settings');
      const snap = await docRef.get();

      const defaultSettings = {
        activeProvider: 'gemini',
        apiKey_gemini: '',
        apiKey_openai: '',
        apiKey_claude: ''
      };

      if (!snap.exists) {
        return res.status(200).json(defaultSettings);
      }

      const data = snap.data();
      return res.status(200).json({
        activeProvider: data.activeProvider || 'gemini',
        apiKey_gemini: ConfigController.maskKey(data.apiKey_gemini),
        apiKey_openai: ConfigController.maskKey(data.apiKey_openai),
        apiKey_claude: ConfigController.maskKey(data.apiKey_claude)
      });
    } catch (error) {
      console.error('Error getting dynamic AI settings:', error);
      return res.status(500).json({ error: 'Failed to fetch AI configuration.' });
    }
  }

  /**
   * Update the dynamic AI configuration.
   */
  static async updateAIConfig(req, res) {
    const { activeProvider, apiKey_gemini, apiKey_openai, apiKey_claude } = req.body;
    try {
      const docRef = db.collection('config').doc('ai_settings');
      const snap = await docRef.get();

      let currentData = {};
      if (snap.exists) {
        currentData = snap.data();
      }

      const updateData = {
        activeProvider: activeProvider || 'gemini'
      };

      // Process Gemini Key
      if (apiKey_gemini !== undefined) {
        if (apiKey_gemini.startsWith('••••••••')) {
          // Keep old key if masked
          updateData.apiKey_gemini = currentData.apiKey_gemini || '';
        } else {
          updateData.apiKey_gemini = apiKey_gemini.trim();
        }
      }

      // Process OpenAI Key
      if (apiKey_openai !== undefined) {
        if (apiKey_openai.startsWith('••••••••')) {
          updateData.apiKey_openai = currentData.apiKey_openai || '';
        } else {
          updateData.apiKey_openai = apiKey_openai.trim();
        }
      }

      // Process Claude Key
      if (apiKey_claude !== undefined) {
        if (apiKey_claude.startsWith('••••••••')) {
          updateData.apiKey_claude = currentData.apiKey_claude || '';
        } else {
          updateData.apiKey_claude = apiKey_claude.trim();
        }
      }

      await docRef.set(updateData, { merge: true });

      // Invalidate the cached API key so it takes effect instantly
      GeminiService.invalidateCache();

      const finalSnap = await docRef.get();
      const finalData = finalSnap.data();

      return res.status(200).json({
        success: true,
        config: {
          activeProvider: finalData.activeProvider,
          apiKey_gemini: ConfigController.maskKey(finalData.apiKey_gemini),
          apiKey_openai: ConfigController.maskKey(finalData.apiKey_openai),
          apiKey_claude: ConfigController.maskKey(finalData.apiKey_claude)
        }
      });
    } catch (error) {
      console.error('Error saving dynamic AI settings:', error);
      return res.status(500).json({ error: 'Failed to save AI configuration.' });
    }
  }
}
