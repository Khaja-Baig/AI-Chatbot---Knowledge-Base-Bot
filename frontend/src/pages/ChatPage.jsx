import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import SessionSidebar from '../components/SessionSidebar';
import ChatWindow from '../components/ChatWindow';
import GuestUpgradePrompt from '../components/GuestUpgradePrompt';
import { ChatStorage } from '../utils/sessionStorage';
import BotAvatar from '../components/BotAvatar';

export default function ChatPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [guestMessageCount, setGuestMessageCount] = useState(0);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  // New UI features states
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem('sidebar-collapsed') === 'true');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const [config, setConfig] = useState({
    counselorName: 'Guru',
    greetingMessage: 'Hello! I am Guru, your NavGurukul Admissions Counselor. I can help you understand our courses, admissions process, eligibility, placements, and campus life. How can I help you today?',
    behaviorMode: 'warm'
  });

  // Handle light/dark theme class/attributes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Save sidebar collapse choice
  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', isSidebarCollapsed);
  }, [isSidebarCollapsed]);

  useEffect(() => {
    const handleAuthTransition = async () => {
      const savedSessionId = ChatStorage.getActiveSession();

      if (user) {
        // Clear any guest session ID from sessionStorage
        sessionStorage.removeItem('guestSessionId');
        
        // Fetch sessions and try to restore preferredSessionId
        await fetchSessions(savedSessionId);
      } else {
        setSessions([]);
        
        // Restore guest session if it is a valid guest session ID
        if (savedSessionId && savedSessionId.startsWith('session_guest_')) {
          setActiveSessionId(savedSessionId);
        } else {
          const freshId = `session_guest_${Date.now()}`;
          setActiveSessionId(freshId);
          ChatStorage.saveActiveSession(freshId);
        }
      }
      fetchConfig();
    };

    handleAuthTransition();
  }, [user]);

  const fetchSessions = async (preferredSessionId = null) => {
    try {
      const headers = {};
      if (user?.token) {
        headers['Authorization'] = `Bearer ${user.token}`;
      }
      const res = await fetch('http://localhost:5001/api/chat/sessions', { headers });
      if (res.ok) {
        const data = await res.json();
        
        let validSessionId = null;

        if (user) {
          if (preferredSessionId) {
            const isDbSession = data.some(s => s.sessionId === preferredSessionId);
            
            if (isDbSession) {
              validSessionId = preferredSessionId;
              setSessions(data);
            } else if (preferredSessionId.startsWith('session_user_')) {
              // Prepend placeholder for a fresh unsaved user session
              validSessionId = preferredSessionId;
              const newChatPlaceholder = {
                sessionId: preferredSessionId,
                updatedAt: new Date().toISOString(),
                messageCount: 0,
                lastMessage: 'New Chat'
              };
              setSessions([newChatPlaceholder, ...data]);
            } else {
              setSessions(data);
            }
          } else {
            setSessions(data);
          }

          if (validSessionId) {
            setActiveSessionId(validSessionId);
            ChatStorage.saveActiveSession(validSessionId);
          } else if (data.length > 0) {
            const firstId = data[0].sessionId;
            setActiveSessionId(firstId);
            ChatStorage.saveActiveSession(firstId);
          } else {
            // No history, start fresh user session
            const newId = `session_user_${Date.now()}`;
            setActiveSessionId(newId);
            ChatStorage.saveActiveSession(newId);
            setSessions([{
              sessionId: newId,
              updatedAt: new Date().toISOString(),
              messageCount: 0,
              lastMessage: 'New Chat'
            }]);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching sessions:', err);
    }
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch('http://localhost:5001/api/config');
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch (err) {
      console.error('Error fetching config:', err);
    }
  };

  const handleNewChat = () => {
    const newId = user ? `session_user_${Date.now()}` : `session_guest_${Date.now()}`;
    setActiveSessionId(newId);
    ChatStorage.saveActiveSession(newId);
    if (!user) {
      setSessions([]);
    } else {
      setSessions(prev => {
        const filtered = prev.filter(s => s.messageCount > 0 || s.sessionId === newId);
        if (filtered.some(s => s.sessionId === newId)) return filtered;
        return [
          {
            sessionId: newId,
            updatedAt: new Date().toISOString(),
            messageCount: 0,
            lastMessage: 'New Chat'
          },
          ...filtered
        ];
      });
    }
  };

  const handleDeleteSession = async (sessionId) => {
    if (!confirm('Are you sure you want to delete this session?')) return;
    try {
      ChatStorage.removeDraft(sessionId);

      const headers = {};
      if (user?.token) {
        headers['Authorization'] = `Bearer ${user.token}`;
      }
      const res = await fetch(`http://localhost:5001/api/chat/sessions/${sessionId}`, {
        method: 'DELETE',
        headers
      });
      if (res.ok) {
        setSessions(prev => prev.filter(s => s.sessionId !== sessionId));
        if (activeSessionId === sessionId) {
          ChatStorage.clearActiveSession();
          setActiveSessionId(null);
          await fetchSessions();
        }
      }
    } catch (err) {
      console.error('Error deleting session:', err);
    }
  };

  const handleRenameSession = async (sessionId, newTitle) => {
    // Optimistically update sessions list
    setSessions(prev => prev.map(s => {
      if (s.sessionId === sessionId) {
        return { ...s, title: newTitle };
      }
      return s;
    }));

    if (user) {
      try {
        const headers = { 'Content-Type': 'application/json' };
        if (user?.token) {
          headers['Authorization'] = `Bearer ${user.token}`;
        }
        const res = await fetch(`http://localhost:5001/api/chat/sessions/${sessionId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ title: newTitle })
        });
        if (!res.ok) {
          console.error('Failed to rename session on server');
          fetchSessions();
        }
      } catch (err) {
        console.error('Error renaming session:', err);
        fetchSessions();
      }
    }
  };

  const handleMessageSent = (sessionId) => {
    fetchSessions();
    if (!activeSessionId) {
      setActiveSessionId(sessionId);
    }
    
    // Track message counts for guests
    if (!user) {
      const nextCount = guestMessageCount + 1;
      setGuestMessageCount(nextCount);
      if (nextCount >= 7) {
        setShowUpgradePrompt(true);
      }
    }
  };

  const handleDismissUpgrade = () => {
    setShowUpgradePrompt(false);
    // Reset counter to 4, prompt will reappear after 3 more exchanges
    setGuestMessageCount(4);
  };

  return (
    <div className="app-container">
      <div 
        className={`sidebar-backdrop ${isSidebarOpen ? 'visible' : ''}`} 
        onClick={() => setIsSidebarOpen(false)}
      ></div>

      <SessionSidebar
        config={config}
        sessions={sessions}
        activeSessionId={activeSessionId}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onSelectSession={(id) => {
          setActiveSessionId(id);
          ChatStorage.saveActiveSession(id);
          setIsSidebarOpen(false);
        }}
        onNewChat={() => {
          handleNewChat();
          setIsSidebarOpen(false);
        }}
        onDeleteSession={handleDeleteSession}
        onRenameSession={handleRenameSession}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        user={user}
        onOpenSettings={() => setShowSettingsModal(true)}
        onLogoutClick={() => setShowLogoutModal(true)}
      />

      <div className="chat-area" style={{ position: 'relative' }}>
        <div className="chat-header">
          <div className="header-left-group">
            <button className="menu-toggle-btn" onClick={() => setIsSidebarOpen(true)}>
              ☰
            </button>
            <BotAvatar
              avatarUrl={config.counselorAvatarUrl}
              fallbackEmoji={config.counselorAvatar}
              size={40}
            />
            <div className="counselor-info">
              <h2>{config.counselorName || 'Guru'}</h2>
              <p>Online & Ready to Guide</p>
            </div>
          </div>
          
          <div className="header-right-group" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {user?.role === 'admin' && (
              <button
                onClick={() => navigate('/admin')}
                style={{
                  backgroundColor: 'rgba(79, 70, 229, 0.2)',
                  border: '1px solid var(--accent-color, #4f46e5)',
                  color: 'var(--text-primary)',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Dashboard
              </button>
            )}
          </div>
        </div>

        <ChatWindow
          activeSessionId={activeSessionId}
          config={config}
          onMessageSent={handleMessageSent}
          userId={user?.uid}
        />

        {showUpgradePrompt && (
          <GuestUpgradePrompt onDismiss={handleDismissUpgrade} />
        )}
      </div>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="modal-backdrop" onClick={() => setShowSettingsModal(false)}>
          <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="settings-modal-header">
              <h2>Settings</h2>
              <button className="close-modal-btn" onClick={() => setShowSettingsModal(false)}>✕</button>
            </div>
            <div className="settings-modal-body">
              <div className="settings-modal-sidebar">
                <button className="settings-tab-btn active">
                  Appearance
                </button>
              </div>
              <div className="settings-modal-content">
                <div className="setting-section">
                  <h3>Appearance Settings</h3>
                  <div className="setting-row">
                    <div className="setting-info">
                      <div className="setting-label">Theme Mode</div>
                      <div className="setting-desc">Switch between light and dark modes.</div>
                    </div>
                    <div className="theme-options">
                      <button 
                        className={`theme-opt-btn ${theme === 'light' ? 'active' : ''}`}
                        onClick={() => setTheme('light')}
                      >
                        <div className="theme-opt-preview light"></div>
                        <span>Light</span>
                      </button>
                      <button 
                        className={`theme-opt-btn ${theme === 'dark' ? 'active' : ''}`}
                        onClick={() => setTheme('dark')}
                      >
                        <div className="theme-opt-preview dark"></div>
                        <span>Dark</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="modal-backdrop" onClick={() => setShowLogoutModal(false)}>
          <div className="confirmation-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="confirmation-modal-title">Confirm Logout</h3>
            <p className="confirmation-modal-text">Are you sure you want to log out?</p>
            <div className="confirmation-modal-actions">
              <button 
                className="btn-secondary" 
                onClick={() => setShowLogoutModal(false)}
                style={{ padding: '8px 16px', borderRadius: '6px', fontSize: '0.85rem' }}
              >
                Cancel
              </button>
              <button 
                className="btn-danger" 
                onClick={async () => {
                  setShowLogoutModal(false);
                  await logout();
                }}
                style={{ padding: '8px 16px', borderRadius: '6px', fontSize: '0.85rem' }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
