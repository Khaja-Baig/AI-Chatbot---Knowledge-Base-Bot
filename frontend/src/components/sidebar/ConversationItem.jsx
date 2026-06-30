import React, { useState, useEffect, useRef } from 'react';

function stripMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
    .replace(/\*(.*?)\*/g, '$1')   // Italic
    .replace(/`(.*?)`/g, '$1')     // Inline Code
    .replace(/#+\s+/g, '')         // Headers
    .trim();
}

export default function ConversationItem({
  session,
  isActive,
  onSelect,
  onDelete,
  onRename,
  formatDate
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const inputRef = useRef(null);

  const rawTitle = session.title || session.firstMessage || session.lastMessage || 'New Chat';
  const displayTitle = stripMarkdown(rawTitle);

  // Automatically focus and select input text when editing begins
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = (e) => {
    e.stopPropagation();
    setEditTitle(displayTitle);
    setIsEditing(true);
  };

  const handleSave = () => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== displayTitle) {
      onRename(session.sessionId, trimmed);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsEditing(false);
    }
  };

  const handleItemClick = (e) => {
    if (isEditing) return;
    onSelect(session.sessionId);
  };

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    handleStartEdit(e);
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    onDelete(session.sessionId);
  };

  return (
    <button
      type="button"
      className={`sb-conv-item ${isActive ? 'active' : ''}`}
      onClick={handleItemClick}
      onDoubleClick={handleDoubleClick}
      role="option"
      aria-selected={isActive}
      tabIndex={0}
    >
      <div className="sb-conv-content">
        <div className="sb-conv-title-row">
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              className="sb-conv-rename-input"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="sb-conv-title">
              {displayTitle}
            </span>
          )}
        </div>
        <div className="sb-conv-meta">
          {formatDate(session.updatedAt)}
        </div>
      </div>

      {!isEditing && (
        <div className="sb-conv-actions" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="sb-conv-action-btn edit"
            onClick={handleStartEdit}
            title="Rename Chat"
            aria-label="Rename Chat"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"></path>
            </svg>
          </button>
          <button
            type="button"
            className="sb-conv-action-btn delete"
            onClick={handleDeleteClick}
            title="Delete Chat"
            aria-label="Delete Chat"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      )}
    </button>
  );
}
