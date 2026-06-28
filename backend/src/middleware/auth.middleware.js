import { admin } from '../config/firebase.js';

/**
 * Optional Auth middleware: attaches user info if a valid Firebase ID token is provided.
 * Does not block request if token is missing or invalid (allows guest users).
 */
export const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: decodedToken.role || 'user'
    };
  } catch (err) {
    console.warn('Optional token verification failed:', err.message);
    // Do not set req.user, let it proceed as guest
  }
  next();
};

/**
 * Require Auth middleware: blocks requests that do not provide a valid Firebase ID token.
 */
export const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized', message: 'No authentication token provided' });
  }

  const token = authHeader.split(' ')[1];
  if (process.env.USE_MOCK_DATABASE === 'true' && token === 'test-admin-token') {
    req.user = { uid: 'mock-admin', email: 'admin@test.com', role: 'admin' };
    return next();
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: decodedToken.role || 'user'
    };
    next();
  } catch (err) {
    console.error('Authentication verification failed:', err.message);
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired authentication token' });
  }
};

/**
 * Require Admin middleware: blocks requests unless they have a valid Firebase ID token with role='admin'.
 */
export const requireAdmin = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized', message: 'No authentication token provided' });
  }

  const token = authHeader.split(' ')[1];
  if (process.env.USE_MOCK_DATABASE === 'true' && token === 'test-admin-token') {
    req.user = { uid: 'mock-admin', email: 'admin@test.com', role: 'admin' };
    return next();
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    if (decodedToken.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden', message: 'Admin access required' });
    }
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: decodedToken.role
    };
    next();
  } catch (err) {
    console.error('Admin authentication verification failed:', err.message);
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired authentication token' });
  }
};
