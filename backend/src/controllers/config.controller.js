import { db } from '../config/firebase.js';

const CONFIG_DOC_ID = 'chatbot';

const DEFAULT_CONFIG = {
  counselorName: 'Guru',
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

      return res.status(200).json(snap.data());
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
    try {
      const docRef = db.collection('config').doc(CONFIG_DOC_ID);
      await docRef.set(newConfig, { merge: true });
      
      const updatedSnap = await docRef.get();
      return res.status(200).json({
        success: true,
        config: updatedSnap.data()
      });
    } catch (error) {
      console.error('Error updating chatbot config:', error);
      return res.status(500).json({ error: 'Failed to update chatbot configuration.' });
    }
  }
}
