import React from 'react';

function stripMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
    .replace(/\*(.*?)\*/g, '$1')   // Italic
    .replace(/`(.*?)`/g, '$1')     // Inline Code
    .replace(/#+\s+/g, '')         // Headers
    .trim();
}

export default function HistoryPopover({
  sessions,
  activeSessionId,
  onSelectSession,
  onClose,
  formatDate,
  popoverRef,
  style
}) {
  return (
    <div
      id="chat-history-popover"
      className="history-popover"
      ref={popoverRef}
      role="dialog"
      aria-label="Recent"
      tabIndex="-1"
      style={style}
    >
      <div className="popover-header">
        <h3 className="popover-title">Recent</h3>
      </div>
      <div className="popover-content">
        {sessions.length === 0 ? (
          <div className="popover-empty-text">No recent chats</div>
        ) : (
          sessions.map((session) => {
            const rawTitle = session.title || session.firstMessage || session.lastMessage || 'New Chat';
            const displayTitle = stripMarkdown(rawTitle);
            return (
              <button
                type="button"
                key={session.sessionId}
                className={`popover-session-item ${session.sessionId === activeSessionId ? 'active' : ''}`}
                onClick={() => {
                  onSelectSession(session.sessionId);
                  onClose();
                }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: 'transparent',
                  border: 'none',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                <div className="popover-session-info">
                  <span className="popover-session-title" style={{ display: 'block' }}>
                    {displayTitle}
                  </span>
                  <span className="popover-session-time" style={{ display: 'block', marginTop: '2px' }}>
                    {formatDate(session.updatedAt)}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

