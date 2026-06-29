import React from 'react';
import SidebarIconBtn from './SidebarIconBtn';
import ConversationList from './ConversationList';
import UserProfile from './UserProfile';

export default function SidebarExpanded({
  sidebarLogoUrl,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onRenameSession,
  onCollapse,
  user,
  onOpenSettings,
  onLogoutClick,
  formatDate,
  isMobile
}) {
  return (
    <div className="sb-expanded-layout">
      {/* Brand Header */}
      <header className="sb-expanded-header">
        <div className="sb-expanded-brand">
          {sidebarLogoUrl ? (
            <img src={sidebarLogoUrl} alt="NavGurukul AI" className="sb-brand-logo-img" />
          ) : (
            <>
              <div className="sb-expanded-brand-icon">NG</div>
              <div className="sb-expanded-brand-text">NavGurukul AI</div>
            </>
          )}
        </div>
        <SidebarIconBtn
          icon={
            isMobile ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="9" y1="3" x2="9" y2="21"></line>
                <path d="M17 16l-4-4 4-4"></path>
              </svg>
            )
          }
          onClick={onCollapse}
          title={isMobile ? "Close sidebar" : "Collapse sidebar"}
          ariaLabel={isMobile ? "Close sidebar" : "Collapse sidebar"}
        />
      </header>

      {/* Action Area: New Chat */}
      <section className="sb-expanded-action-row">
        <button
          type="button"
          className="sb-expanded-new-chat-btn"
          onClick={onNewChat}
          title="New Chat"
        >
          <span className="sb-expanded-new-chat-icon">+</span>
          <span>New Chat</span>
        </button>
      </section>

      {/* Conversations Heading */}
      <h2 className="sb-expanded-list-title">Recent</h2>

      {/* Scrollable Conversation List */}
      <ConversationList
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={onSelectSession}
        onDeleteSession={onDeleteSession}
        onRenameSession={onRenameSession}
        formatDate={formatDate}
      />

      {/* Pinned User Profile Footer */}
      <UserProfile
        user={user}
        isCollapsed={false}
        onOpenSettings={onOpenSettings}
        onLogoutClick={onLogoutClick}
      />
    </div>
  );
}
