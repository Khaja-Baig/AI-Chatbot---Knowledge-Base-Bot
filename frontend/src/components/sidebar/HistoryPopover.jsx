import React from 'react';

export default function HistoryPopover({
  sessions,
  activeSessionId,
  onSelectSession,
  onClose,
  formatDate,
  popoverRef
}) {
  return (
    <div
      id="chat-history-popover"
      className="history-popover"
      ref={popoverRef}
      role="dialog"
      aria-label="Recent Conversations"
      tabIndex="-1"
    >
      <div className="popover-header">
        <h3 className="popover-title">Recent Conversations</h3>
      </div>
      <div className="popover-content">
        {sessions.length === 0 ? (
          <div className="popover-empty-text">No recent chats</div>
        ) : (
          sessions.map((session) => (
            <button
              type="button"
              key={session.sessionId}
              className={`popover-session-item ${session.sessionId === activeSessionId ? 'active' : ''}`}
              onClick={() => {
                onSelectSession(session.sessionId);
                onClose();
              }}
              title={session.title || session.lastMessage || 'New Chat'}
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
                  {session.title || session.lastMessage || 'New Chat'}
                </span>
                <span className="popover-session-time" style={{ display: 'block', marginTop: '2px' }}>
                  {formatDate(session.updatedAt)}
                </span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
