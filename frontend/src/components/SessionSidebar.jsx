import React, { useState, useEffect, useRef } from 'react';
import SidebarExpanded from './sidebar/SidebarExpanded';
import SidebarCollapsed from './sidebar/SidebarCollapsed';
import HistoryPopover from './sidebar/HistoryPopover';
import './sidebar/Sidebar.css';

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
  const [showHistoryPopover, setShowHistoryPopover] = useState(false);
  
  const historyButtonRef = useRef(null);
  const popoverRef = useRef(null);

  // Close popover on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        popoverRef.current && 
        !popoverRef.current.contains(event.target) && 
        historyButtonRef.current && 
        !historyButtonRef.current.contains(event.target)
      ) {
        setShowHistoryPopover(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Escape key listener for popover closure
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && showHistoryPopover) {
        setShowHistoryPopover(false);
        historyButtonRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showHistoryPopover]);

  // Close popover if sidebar is expanded
  useEffect(() => {
    if (!isCollapsed) {
      setShowHistoryPopover(false);
    }
  }, [isCollapsed]);

  // Focus popover on open
  useEffect(() => {
    if (showHistoryPopover && popoverRef.current) {
      popoverRef.current.focus();
    }
  }, [showHistoryPopover]);

  const formatDate = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' - ' + date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <>
      <div 
        className={`sidebar-root ${isOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}
        style={{ willChange: 'width' }}
      >

        {isCollapsed ? (
          <SidebarCollapsed
            onExpand={() => setIsCollapsed(false)}
            onNewChat={onNewChat}
            onToggleHistory={() => setShowHistoryPopover(prev => !prev)}
            isHistoryOpen={showHistoryPopover}
            historyButtonRef={historyButtonRef}
            user={user}
            onOpenSettings={onOpenSettings}
            onLogoutClick={onLogoutClick}
          />
        ) : (
          <SidebarExpanded
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSelectSession={onSelectSession}
            onNewChat={onNewChat}
            onDeleteSession={onDeleteSession}
            onRenameSession={onRenameSession}
            onCollapse={() => setIsCollapsed(true)}
            user={user}
            onOpenSettings={onOpenSettings}
            onLogoutClick={onLogoutClick}
            formatDate={formatDate}
          />
        )}
      </div>

      {/* Floating Popover for Collapsed Chat History */}
      {isCollapsed && showHistoryPopover && (
        <HistoryPopover
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={onSelectSession}
          onClose={() => setShowHistoryPopover(false)}
          formatDate={formatDate}
          popoverRef={popoverRef}
        />
      )}
    </>
  );
}
