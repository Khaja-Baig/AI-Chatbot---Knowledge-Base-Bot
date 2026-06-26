import React, { useState, useEffect } from 'react';
import SessionSidebar from './components/SessionSidebar';
import ChatWindow from './components/ChatWindow';
import AdminSettings from './components/AdminSettings';

export default function App() {
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'admin'
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [config, setConfig] = useState({
    counselorName: 'Guru',
    greetingMessage: 'Hello! I am Guru, your NavGurukul Admissions Counselor. I can help you understand our courses, admissions process, eligibility, placements, and campus life. How can I help you today?',
    behaviorMode: 'warm'
  });

  useEffect(() => {
    fetchSessions();
    fetchConfig();
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await fetch('http://localhost:5001/api/chat/sessions');
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
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
      console.error('Error fetching chatbot config:', err);
    }
  };

  const handleUpdateConfig = async (newConfig) => {
    try {
      const res = await fetch('http://localhost:5001/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setConfig(data.config);
          alert('Configuration updated successfully.');
        }
      }
    } catch (err) {
      console.error('Error updating config:', err);
    }
  };

  const handleNewChat = () => {
    const newId = `session_${Date.now()}`;
    setActiveSessionId(newId);
    setSessions(prev => [
      {
        sessionId: newId,
        updatedAt: new Date().toISOString(),
        messageCount: 0,
        lastMessage: 'New Chat'
      },
      ...prev
    ]);
    setActiveTab('chat');
  };

  const handleDeleteSession = async (sessionId) => {
    if (!confirm('Are you sure you want to delete this session?')) return;
    try {
      const res = await fetch(`http://localhost:5001/api/chat/sessions/${sessionId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setSessions(prev => prev.filter(s => s.sessionId !== sessionId));
        if (activeSessionId === sessionId) {
          setActiveSessionId(null);
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
          setActiveTab('chat');
          setIsSidebarOpen(false);
        }}
        onNewChat={() => {
          handleNewChat();
          setIsSidebarOpen(false);
        }}
        onDeleteSession={handleDeleteSession}
      />

      <div className="chat-area">
        <div className="chat-header">
          <div className="header-left-group">
            <button className="menu-toggle-btn" onClick={() => setIsSidebarOpen(true)}>
              ☰
            </button>
            <div className="counselor-info">
              <h2>
                {activeTab === 'chat' ? (config.counselorName || 'Counselor') : 'Settings & Data'}
              </h2>
              <p>
                {activeTab === 'chat' ? 'Online & Ready to Guide' : 'Platform Configurations'}
              </p>
            </div>
          </div>
          <div className="tabs-container">
            <button
              className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveTab('chat')}
            >
              Chat
            </button>
            <button
              className={`tab-btn ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin')}
            >
              Admin Controls
            </button>
          </div>
        </div>

        {activeTab === 'chat' ? (
          <ChatWindow
            activeSessionId={activeSessionId}
            config={config}
            onMessageSent={handleMessageSent}
          />
        ) : (
          <AdminSettings
            config={config}
            onUpdateConfig={handleUpdateConfig}
          />
        )}
      </div>
    </div>
  );
}
