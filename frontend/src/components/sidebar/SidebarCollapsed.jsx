import React from 'react';
import SidebarIconBtn from './SidebarIconBtn';
import UserProfile from './UserProfile';

export default function SidebarCollapsed({
  sidebarLogoUrl,
  onExpand,
  onNewChat,
  onToggleHistory,
  isHistoryOpen,
  historyButtonRef,
  user,
  onOpenSettings,
  onLogoutClick
}) {
  return (
    <div className="sb-collapsed-layout">
      {/* Brand Icon only */}
      <div className="sb-collapsed-brand">
        {sidebarLogoUrl ? (
          <img src={sidebarLogoUrl} alt="Logo" className="sb-collapsed-logo-img" />
        ) : (
          'NG'
        )}
      </div>

      {/* Button Actions stacked vertically */}
      <div className="sb-collapsed-actions">
        {/* Toggle Expand Button */}
        <SidebarIconBtn
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="9" y1="3" x2="9" y2="21"></line>
              <path d="M13 8l4 4-4 4"></path>
            </svg>
          }
          onClick={onExpand}
          title="Expand sidebar"
          ariaLabel="Expand sidebar"
        />

        {/* Circular New Chat Button */}
        <SidebarIconBtn
          icon={<span style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>+</span>}
          onClick={onNewChat}
          title="New Chat"
          ariaLabel="New Chat"
        />

        {/* Circular History Button */}
        <SidebarIconBtn
          buttonRef={historyButtonRef}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          }
          onClick={onToggleHistory}
          title="Chat History"
          ariaLabel="Chat History"
          isActive={isHistoryOpen}
          aria-expanded={isHistoryOpen}
          aria-controls="chat-history-popover"
        />
      </div>

      {/* Pinned User Avatar Footer */}
      <UserProfile
        user={user}
        isCollapsed={true}
        onOpenSettings={onOpenSettings}
        onLogoutClick={onLogoutClick}
      />
    </div>
  );
}
