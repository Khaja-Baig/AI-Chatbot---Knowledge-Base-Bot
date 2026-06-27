import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SessionSidebar({
  sessions,
  activeSessionId,
  isOpen,
  onClose,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onRenameSession,
  isCollapsed,
  setIsCollapsed,
  user,
  onOpenSettings,
  onLogoutClick
}) {
  const navigate = useNavigate();
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  
  const editInputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Focus rename input when active
  useEffect(() => {
    if (editingSessionId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingSessionId]);

  const formatDate = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' - ' + date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const getInitials = (u) => {
    if (!u) return '?';
    if (u.displayName) {
      const parts = u.displayName.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return parts[0].substring(0, 2).toUpperCase();
    }
    if (u.email) {
      const emailName = u.email.split('@')[0];
      const parts = emailName.split(/[._-]/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return emailName.substring(0, 2).toUpperCase();
    }
    return 'US';
  };

  const handleDoubleClick = (session, e) => {
    e.stopPropagation();
    if (isCollapsed) return; // Prevent renaming when collapsed
    setEditingSessionId(session.sessionId);
    setEditTitle(session.title || session.lastMessage || 'New Chat');
  };

  const handleSave = (sessionId) => {
    if (editTitle.trim()) {
      onRenameSession(sessionId, editTitle.trim());
    }
    setEditingSessionId(null);
  };

  const handleKeyDown = (e, sessionId) => {
    if (e.key === 'Enter') {
      handleSave(sessionId);
    } else if (e.key === 'Escape') {
      setEditingSessionId(null);
    }
  };

  return (
    <div 
      className={`sidebar ${isOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}
      style={{ willChange: 'width, padding' }}
    >
      <div className="sidebar-header">
        <div className="logo-container">
          <div className="logo-icon">NG</div>
          <div className="logo-text">NavGurukul AI</div>
        </div>
        
        {/* Sidebar Toggle Button (expanded view) */}
        {!isCollapsed && (
          <button 
            className="sidebar-toggle-btn"
            onClick={() => setIsCollapsed(true)}
            title="Collapse sidebar"
            style={{ marginLeft: 'auto' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="9" y1="3" x2="9" y2="21"></line>
              <path d="M17 16l-4-4 4-4"></path>
            </svg>
          </button>
        )}

        <button className="sidebar-close-btn" onClick={onClose}>✕</button>
      </div>

      {/* Sidebar Toggle Button (collapsed view) */}
      {isCollapsed && (
        <button 
          className="sidebar-toggle-btn"
          onClick={() => setIsCollapsed(false)}
          title="Expand sidebar"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="9" y1="3" x2="9" y2="21"></line>
            <path d="M13 8l4 4-4 4"></path>
          </svg>
        </button>
      )}

      <button className="new-chat-btn" onClick={onNewChat} title="New Chat">
        <span className="btn-icon">+</span>
        <span className="new-chat-btn-text">New Chat</span>
      </button>

      {!isCollapsed && (
        <div className="recent-title" style={{ marginTop: '24px', marginBottom: '12px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
          Recent Conversations
        </div>
      )}

      <div className="session-list">
        {sessions.length === 0 ? (
          !isCollapsed && (
            <div style={{ padding: '20px 0', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              No sessions yet.
            </div>
          )
        ) : (
          sessions.map((session) => (
            <div
              key={session.sessionId}
              className={`session-item ${session.sessionId === activeSessionId ? 'active' : ''}`}
              onClick={() => onSelectSession(session.sessionId)}
              onDoubleClick={(e) => handleDoubleClick(session, e)}
              title={isCollapsed ? (session.title || session.lastMessage || 'New Chat') : undefined}
            >
              <div className="session-item-inner">
                {/* Chat bubble icon */}
                <div className="session-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                </div>

                {!isCollapsed && (
                  <div className="session-content-wrapper">
                    <div className="session-meta">
                      <span>{formatDate(session.updatedAt)}</span>
                    </div>

                    {editingSessionId === session.sessionId ? (
                      <input
                        ref={editInputRef}
                        className="rename-session-input"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onBlur={() => handleSave(session.sessionId)}
                        onKeyDown={(e) => handleKeyDown(e, session.sessionId)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <div className="session-preview">
                        {session.title || session.lastMessage || 'New Chat'}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Actions (Edit and Delete) - Hover ONLY in expanded view */}
              {!isCollapsed && editingSessionId !== session.sessionId && (
                <div className="session-actions" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="action-btn edit"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingSessionId(session.sessionId);
                      setEditTitle(session.title || session.lastMessage || 'New Chat');
                    }}
                    title="Rename Chat"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"></path>
                    </svg>
                  </button>
                  <button
                    className="action-btn delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(session.sessionId);
                    }}
                    title="Delete Session"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* User Profile Section at the bottom of the sidebar */}
      <div className="user-profile-container" ref={dropdownRef}>
        {user ? (
          <>
            <button 
              className="user-profile-btn"
              onClick={() => setShowDropdown(!showDropdown)}
              title={isCollapsed ? (user.displayName || user.email.split('@')[0]) : undefined}
            >
              <div className="user-avatar">
                {getInitials(user)}
              </div>
              {!isCollapsed && (
                <>
                  <div className="user-details">
                    <div className="user-username">
                      {user.displayName || user.email.split('@')[0]}
                    </div>
                  </div>
                  <div className="profile-chevron">▾</div>
                </>
              )}
            </button>

            {/* Profile Dropdown Menu */}
            {showDropdown && (
              <div className="profile-dropdown">
                <button 
                  className="dropdown-item"
                  onClick={() => {
                    setShowDropdown(false);
                    onOpenSettings();
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                  </svg>
                  Settings
                </button>
                <button 
                  className="dropdown-item"
                  onClick={() => {
                    setShowDropdown(false);
                    onLogoutClick();
                  }}
                  style={{ color: '#ef4444' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  Logout
                </button>
              </div>
            )}
          </>
        ) : (
          /* Show Log In button for guest users */
          <button 
            className="user-profile-btn" 
            onClick={() => navigate('/login')}
            title={isCollapsed ? "Log In" : undefined}
            style={{ 
              backgroundColor: 'var(--accent-color)', 
              color: 'white',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              padding: isCollapsed ? '0' : '10px 14px',
              borderRadius: isCollapsed ? '50%' : '8px',
              fontWeight: 500,
              boxShadow: '0 2px 4px rgba(79, 70, 229, 0.2)'
            }}
          >
            {isCollapsed ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                <polyline points="10 17 15 12 10 7"></polyline>
                <line x1="15" y1="12" x2="3" y2="12"></line>
              </svg>
            ) : (
              <>
                <span style={{ marginRight: '4px' }}>🔑</span>
                <span>Log In</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
