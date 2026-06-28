const KEYS = {
  ACTIVE_SESSION: 'chat_active_session_id',
  DRAFT_PREFIX: 'chat_draft_msg_'
};

export const ChatStorage = {
  /**
   * Save active session ID to sessionStorage.
   * @param {string} sessionId 
   */
  saveActiveSession(sessionId) {
    if (sessionId) {
      sessionStorage.setItem(KEYS.ACTIVE_SESSION, sessionId);
    } else {
      sessionStorage.removeItem(KEYS.ACTIVE_SESSION);
    }
  },

  /**
   * Retrieve active session ID from sessionStorage.
   * @returns {string|null}
   */
  getActiveSession() {
    return sessionStorage.getItem(KEYS.ACTIVE_SESSION);
  },

  /**
   * Clear active session ID.
   */
  clearActiveSession() {
    sessionStorage.removeItem(KEYS.ACTIVE_SESSION);
  },

  /**
   * Save draft message for a specific session.
   * @param {string} sessionId 
   * @param {string} text 
   */
  saveDraft(sessionId, text) {
    if (!sessionId) return;
    if (text && text.trim()) {
      sessionStorage.setItem(`${KEYS.DRAFT_PREFIX}${sessionId}`, text);
    } else {
      sessionStorage.removeItem(`${KEYS.DRAFT_PREFIX}${sessionId}`);
    }
  },

  /**
   * Get draft message for a specific session.
   * @param {string} sessionId 
   * @returns {string}
   */
  getDraft(sessionId) {
    if (!sessionId) return '';
    return sessionStorage.getItem(`${KEYS.DRAFT_PREFIX}${sessionId}`) || '';
  },

  /**
   * Remove draft message for a specific session.
   * @param {string} sessionId 
   */
  removeDraft(sessionId) {
    if (!sessionId) return;
    sessionStorage.removeItem(`${KEYS.DRAFT_PREFIX}${sessionId}`);
  }
};
