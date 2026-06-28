/**
 * Maps technical Firebase Auth error codes/messages to clean, user-friendly copy.
 * @param {object|Error} err - The error object caught from Firebase.
 * @returns {string} User-friendly error message.
 */
export function getFriendlyAuthError(err) {
  if (!err) return 'An unknown error occurred.';
  const code = err.code || '';
  const message = err.message || '';
  
  switch (code) {
    case 'auth/user-not-found':
      return 'No account found. Please sign up first.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/invalid-credential':
      return 'Incorrect email or password.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/network-request-failed':
      return 'A network error occurred. Please check your connection.';
    case 'auth/too-many-requests':
      return 'Too many login attempts. Please try again later or reset your password.';
    default:
      if (message.toLowerCase().includes('wrong-password')) {
        return 'Incorrect password. Please try again.';
      }
      if (message.toLowerCase().includes('user-not-found')) {
        return 'No account found. Please sign up first.';
      }
      if (message.toLowerCase().includes('invalid-credential')) {
        return 'Incorrect email or password.';
      }
      return message || 'Authentication failed. Please try again.';
  }
}
