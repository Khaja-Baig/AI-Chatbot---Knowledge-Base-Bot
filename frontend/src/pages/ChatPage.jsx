import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import SessionSidebar from '../components/SessionSidebar';
import ChatWindow from '../components/ChatWindow';
import GuestUpgradePrompt from '../components/GuestUpgradePrompt';

export default function ChatPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [guestMessageCount, setGuestMessageCount] = useState(0);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  const [config, setConfig] = useState({
    counselorName: 'Guru',
    greetingMessage: 'Hello! I am Guru, your NavGurukul Admissions Counselor. I can help you understand our courses, admissions process, eligibility, placements, and campus life. How can I help you today?',
    behaviorMode: 'warm'
  });

  useEffect(() => {
    // Persist guest session details
    if (!user) {
      const savedSessionId = sessionStorage.getItem('guestSessionId');
      if (savedSessionId) {
        setActiveSessionId(savedSessionId);
      } else {
        const freshId = `session_guest_${Date.now()}`;
        setActiveSessionId(freshId);
        sessionStorage.setItem('guestSessionId', freshId);
      }
    } else {
      // Clear storage to avoid mixups for logged in users
      sessionStorage.removeItem('guestSessionId');
    }
    
    fetchSessions();
    fetchConfig();
  }, [user]);

  const fetchSessions = async () => {
    try {
      const headers = {};
      if (user?.token) {
        headers['Authorization'] = `Bearer ${user.token}`;
      }
      const res = await fetch('http://localhost:5001/api/chat/sessions', { headers });
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
        // Set active session ID if none active
        if (data.length > 0 && !activeSessionId) {
          setActiveSessionId(data[0].sessionId);
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
    if (!user) {
      sessionStorage.setItem('guestSessionId', newId);
    }
    setSessions(prev => [
      {
        sessionId: newId,
        updatedAt: new Date().toISOString(),
        messageCount: 0,
        lastMessage: 'New Chat'
      },
      ...prev
    ]);
  };

  const handleDeleteSession = async (sessionId) => {
    if (!confirm('Are you sure you want to delete this session?')) return;
    try {
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
          setActiveSessionId(null);
          if (!user) {
            sessionStorage.removeItem('guestSessionId');
          }
        }
      }
    } catch (err) {
      console.error('Error deleting session:', err);
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
        sessions={sessions}
        activeSessionId={activeSessionId}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onSelectSession={(id) => {
          setActiveSessionId(id);
          setIsSidebarOpen(false);
        }}
        onNewChat={() => {
          handleNewChat();
          setIsSidebarOpen(false);
        }}
        onDeleteSession={handleDeleteSession}
      />

      <div className="chat-area" style={{ position: 'relative' }}>
        <div className="chat-header">
          <div className="header-left-group">
            <button className="menu-toggle-btn" onClick={() => setIsSidebarOpen(true)}>
              ☰
            </button>
            <div className="counselor-info">
              <h2>{config.counselorName || 'Guru'}</h2>
              <p>Online & Ready to Guide</p>
            </div>
          </div>
          
          <div className="header-right-group" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Hello, <strong style={{ color: 'white' }}>{user.displayName || user.email.split('@')[0]}</strong>
                </span>
                {user.role === 'admin' && (
                  <button
                    onClick={() => navigate('/admin')}
                    style={{
                      backgroundColor: 'rgba(79, 70, 229, 0.2)',
                      border: '1px solid var(--accent-color, #4f46e5)',
                      color: 'white',
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
                <button
                  onClick={logout}
                  style={{
                    backgroundColor: 'transparent',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={() => navigate('/login')}
                style={{
                  backgroundColor: 'var(--accent-color, #4f46e5)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(79, 70, 229, 0.2)'
                }}
              >
                Log In
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
    </div>
  );
}
