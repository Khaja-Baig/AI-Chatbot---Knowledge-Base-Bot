import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AdminSettings from '../components/AdminSettings';
import ChatWindow from '../components/ChatWindow';

export default function AdminShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'chat' | 'analytics'
  const [config, setConfig] = useState({
    counselorName: 'Guru',
    greetingMessage: 'Hello! I am Guru, your NavGurukul Admissions Counselor. I can help you understand our courses, admissions process, eligibility, placements, and campus life. How can I help you today?',
    behaviorMode: 'warm'
  });
  const [adminSessionId, setAdminSessionId] = useState(`admin_test_${Date.now()}`);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch('http://localhost:5001/api/config', {
        headers: {
          'Authorization': `Bearer ${user?.token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch (err) {
      console.error('Error fetching chatbot config in admin shell:', err);
    }
  };

  const handleUpdateConfig = async (newConfig) => {
    try {
      const res = await fetch('http://localhost:5001/api/config', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify(newConfig)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setConfig(data.config);
          alert('Configuration updated successfully.');
        }
      } else {
        const errData = await res.json();
        alert(`Error: ${errData.message || 'Failed to update config'}`);
      }
    } catch (err) {
      console.error('Error updating config:', err);
      alert('Failed to update configuration.');
    }
  };

  const handleNewTestSession = () => {
    setAdminSessionId(`admin_test_${Date.now()}`);
  };

  return (
    <div className="admin-layout-container" style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      backgroundColor: 'var(--bg-primary)',
      fontFamily: 'var(--font-sans)',
      overflow: 'hidden'
    }}>
      
      {/* Sidebar Nav */}
      <div className="admin-sidebar" style={{
        width: '260px',
        backgroundColor: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 20px',
        boxSizing: 'border-box',
        height: '100%'
      }}>
        
        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '40px' }}>
          <div style={{
            fontSize: '1.2rem',
            backgroundColor: 'var(--accent-color, #4f46e5)',
            color: 'white',
            borderRadius: '8px',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700
          }}>
            🤖
          </div>
          <div>
            <h3 style={{ color: 'white', fontSize: '1rem', fontWeight: 600, margin: 0 }}>Guru Admin</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', margin: 0 }}>Admissions Controls</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          <button
            onClick={() => setActiveTab('dashboard')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              width: '100%',
              padding: '12px 16px',
              border: 'none',
              borderRadius: '8px',
              backgroundColor: activeTab === 'dashboard' ? 'rgba(79, 70, 229, 0.15)' : 'transparent',
              color: activeTab === 'dashboard' ? 'white' : 'var(--text-secondary)',
              fontWeight: activeTab === 'dashboard' ? 600 : 500,
              fontSize: '0.9rem',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <span style={{ fontSize: '1.1rem' }}>📊</span> Dashboard
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              width: '100%',
              padding: '12px 16px',
              border: 'none',
              borderRadius: '8px',
              backgroundColor: activeTab === 'chat' ? 'rgba(79, 70, 229, 0.15)' : 'transparent',
              color: activeTab === 'chat' ? 'white' : 'var(--text-secondary)',
              fontWeight: activeTab === 'chat' ? 600 : 500,
              fontSize: '0.9rem',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <span style={{ fontSize: '1.1rem' }}>💬</span> Test Chatbot
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              width: '100%',
              padding: '12px 16px',
              border: 'none',
              borderRadius: '8px',
              backgroundColor: activeTab === 'analytics' ? 'rgba(79, 70, 229, 0.15)' : 'transparent',
              color: activeTab === 'analytics' ? 'white' : 'var(--text-secondary)',
              fontWeight: activeTab === 'analytics' ? 600 : 500,
              fontSize: '0.9rem',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.2s',
              opacity: 0.6
            }}
          >
            <span style={{ fontSize: '1.1rem' }}>📈</span> Analytics (WIP)
          </button>
        </div>

        {/* Return link */}
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            fontSize: '0.85rem',
            textAlign: 'left',
            cursor: 'pointer',
            padding: '8px 12px',
            marginBottom: '10px',
            textDecoration: 'underline'
          }}
        >
          ← Go to Public Chat
        </button>
      </div>

      {/* Main Content Area */}
      <div className="admin-main-content" style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden'
      }}>
        
        {/* Top Navbar */}
        <div className="admin-topbar" style={{
          height: '64px',
          backgroundColor: 'var(--bg-sidebar)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          padding: '0 32px',
          boxSizing: 'border-box',
          gap: '20px'
        }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Logged in as: <strong style={{ color: 'white' }}>{user?.email}</strong>
          </span>
          <button
            onClick={logout}
            style={{
              backgroundColor: 'transparent',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              borderRadius: '6px',
              padding: '6px 14px',
              fontSize: '0.8rem',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.05)'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            Logout
          </button>
        </div>

        {/* View Content */}
        <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
          {activeTab === 'dashboard' && (
            <AdminSettings
              config={config}
              onUpdateConfig={handleUpdateConfig}
              authToken={user?.token}
            />
          )}

          {activeTab === 'chat' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{
                padding: '16px 32px',
                backgroundColor: 'rgba(255,255,255,0.02)',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxSizing: 'border-box'
              }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Isolated testing console. Chat behaves according to your current configuration.
                </span>
                <button
                  onClick={handleNewTestSession}
                  style={{
                    backgroundColor: 'transparent',
                    border: '1px solid var(--accent-color, #4f46e5)',
                    color: 'var(--accent-color, #4f46e5)',
                    borderRadius: '4px',
                    padding: '4px 10px',
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  Restart Session
                </button>
              </div>
              <div style={{ flex: 1, position: 'relative', height: 'calc(100% - 53px)' }}>
                <ChatWindow
                  activeSessionId={adminSessionId}
                  config={config}
                  onMessageSent={() => {}}
                />
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '80%',
              color: 'var(--text-secondary)'
            }}>
              <span style={{ fontSize: '3rem', marginBottom: '16px' }}>📊</span>
              <h3 style={{ margin: '0 0 8px 0', color: 'white' }}>Analytics Dashboard</h3>
              <p style={{ margin: 0 }}>User interactions, conversation statistics, and query analysis coming soon.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
