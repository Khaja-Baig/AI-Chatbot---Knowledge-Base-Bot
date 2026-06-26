import React from 'react';

export default function SessionSidebar({ sessions, activeSessionId, isOpen, onClose, onSelectSession, onNewChat, onDeleteSession }) {
  const formatDate = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' - ' + date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <div className="logo-container">
          <div className="logo-icon">NG</div>
          <div className="logo-text">NavGurukul AI</div>
        </div>
        <button className="sidebar-close-btn" onClick={onClose}>✕</button>
      </div>

      <button className="new-chat-btn" onClick={onNewChat}>
        <span>+</span> New Chat
      </button>

      <div style={{ marginTop: '24px', marginBottom: '12px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
        Recent Conversations
      </div>

      <div className="session-list">
        {sessions.length === 0 ? (
          <div style={{ padding: '20px 0', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            No sessions yet.
          </div>
        ) : (
          sessions.map((session) => (
            <div
              key={session.sessionId}
              className={`session-item ${session.sessionId === activeSessionId ? 'active' : ''}`}
              onClick={() => onSelectSession(session.sessionId)}
            >
              <div className="session-meta">
                <span>Session</span>
                <span>{formatDate(session.updatedAt)}</span>
              </div>
              <div className="session-preview">
                {session.lastMessage || 'New Chat'}
              </div>
              <button
                className="delete-session-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteSession(session.sessionId);
                }}
                title="Delete Session"
              >
                🗑️
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
