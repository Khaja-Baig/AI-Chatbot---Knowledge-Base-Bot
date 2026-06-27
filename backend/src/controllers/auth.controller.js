import { db } from '../config/firebase.js';

export class AuthController {
  /**
   * Register a new user in the Firestore database.
   * Hardcodes the role to 'user' so admin rights cannot be self-assigned.
   */
  static async register(req, res) {
    const { uid, email, displayName } = req.body;

    if (!uid || !email) {
      return res.status(400).json({ error: 'uid and email are required fields.' });
    }

    try {
      const userRef = db.collection('users').doc(uid);
      
      // Save user to database with default user role
      await userRef.set({
        email: email.trim(),
        displayName: (displayName || '').trim(),
        role: 'user',
        createdAt: new Date().toISOString()
      });

      console.log(`👤 Created user document in Firestore: ${email} (${uid})`);

      return res.status(200).json({
        success: true,
        message: 'User registered successfully.'
      });
    } catch (err) {
      console.error('Error creating user document in Firestore:', err);
      return res.status(500).json({ 
        error: 'Failed to create user profile in database.', 
        details: err.message 
      });
    }
  }
}
