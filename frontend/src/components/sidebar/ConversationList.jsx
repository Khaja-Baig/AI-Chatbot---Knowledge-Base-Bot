import React from 'react';
import ConversationItem from './ConversationItem';

export default function ConversationList({
  sessions,
  activeSessionId,
  onSelectSession,
  onDeleteSession,
  onRenameSession,
  formatDate
}) {
  if (sessions.length === 0) {
    return (
      <div 
        style={{ 
          padding: '24px 16px', 
          textAlign: 'center', 
          fontSize: '0.85rem', 
          color: 'var(--text-muted)' 
        }}
      >
        No conversations yet.
      </div>
    );
  }

  return (
    <div 
      className="sb-expanded-list-scroll"
      role="listbox"
      aria-label="Recent Conversations"
    >
      {sessions.map((session) => (
        <ConversationItem
          key={session.sessionId}
          session={session}
          isActive={session.sessionId === activeSessionId}
          onSelect={onSelectSession}
          onDelete={onDeleteSession}
          onRename={onRenameSession}
          formatDate={formatDate}
        />
      ))}
    </div>
  );
}
