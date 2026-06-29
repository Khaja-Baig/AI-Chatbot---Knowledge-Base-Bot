import React, { useState, useEffect, useRef } from 'react';
import SidebarExpanded from './sidebar/SidebarExpanded';
import SidebarCollapsed from './sidebar/SidebarCollapsed';
import HistoryPopover from './sidebar/HistoryPopover';
import './sidebar/Sidebar.css';

export default function SessionSidebar({
  config,
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
  const [popoverTop, setPopoverTop] = useState(110);
  
  const historyButtonRef = useRef(null);
  const popoverRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile width
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update popover position to align with history button top, constraining within viewport
  useEffect(() => {
    const updatePosition = () => {
      if (showHistoryPopover && historyButtonRef.current) {
        const rect = historyButtonRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const popoverHeight = 480; // max-height of popover is 480px
        
        let calculatedTop = rect.top;
        if (calculatedTop + popoverHeight > viewportHeight) {
          calculatedTop = Math.max(16, viewportHeight - popoverHeight - 16);
        }
        setPopoverTop(calculatedTop);
      }
    };

    updatePosition();
    if (showHistoryPopover) {
      window.addEventListener('resize', updatePosition);
    }
    return () => {
      window.removeEventListener('resize', updatePosition);
    };
  }, [showHistoryPopover]);

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

  // Close popover if sidebar is expanded or on mobile
  useEffect(() => {
    if (!isCollapsed || isMobile) {
      setShowHistoryPopover(false);
    }
  }, [isCollapsed, isMobile]);

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

  const useCollapsedView = isCollapsed && !isMobile;

  return (
    <>
      <div 
        className={`sidebar-root ${isOpen ? 'open' : ''} ${useCollapsedView ? 'collapsed' : ''}`}
        style={{ willChange: 'width' }}
      >

        {useCollapsedView ? (
          <SidebarCollapsed
            sidebarLogoUrl={config?.sidebarLogoUrl}
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
            sidebarLogoUrl={config?.sidebarLogoUrl}
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSelectSession={onSelectSession}
            onNewChat={onNewChat}
            onDeleteSession={onDeleteSession}
            onRenameSession={onRenameSession}
            onCollapse={isMobile ? onClose : () => setIsCollapsed(true)}
            user={user}
            onOpenSettings={onOpenSettings}
            onLogoutClick={onLogoutClick}
            formatDate={formatDate}
            isMobile={isMobile}
          />
        )}
      </div>

      {/* Floating Popover for Collapsed Chat History */}
      {useCollapsedView && showHistoryPopover && (
        <HistoryPopover
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={onSelectSession}
          onClose={() => setShowHistoryPopover(false)}
          formatDate={formatDate}
          popoverRef={popoverRef}
          style={{ top: `${popoverTop}px` }}
        />
      )}
    </>
  );
}
