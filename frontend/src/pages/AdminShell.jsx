import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AdminSettings from '../components/AdminSettings';
import ChatWindow from '../components/ChatWindow';

export default function AdminShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  // Layout and view states
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'api_config' | 'chat' | 'analytics'
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('admin_sidebar_collapsed') === 'true';
  });
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Chatbot Config state
  const [config, setConfig] = useState({
    counselorName: 'Guru',
    greetingMessage: 'Hello! I am Guru, your NavGurukul Admissions Counselor. I can help you understand our courses, admissions process, eligibility, placements, and campus life. How can I help you today?',
    behaviorMode: 'warm'
  });
  const [adminSessionId, setAdminSessionId] = useState(`admin_test_${Date.now()}`);

  // Dynamic API Configuration state
  const [apiConfig, setApiConfig] = useState({
    activeProvider: 'gemini',
    apiKey_gemini: '',
    apiKey_openai: '',
    apiKey_claude: ''
  });
  const [apiConfigStatus, setApiConfigStatus] = useState({ type: '', message: '' });

  // Theme state
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });

  // Apply theme class attributes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.className = theme === 'light' ? 'light-theme' : '';
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Load configs on boot
  useEffect(() => {
    if (user?.token) {
      fetchConfig();
      fetchApiConfig();
    }
  }, [user]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
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

  const fetchApiConfig = async () => {
    try {
      const res = await fetch('http://localhost:5001/api/config/ai-config', {
        headers: {
          'Authorization': `Bearer ${user?.token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setApiConfig(data);
      }
    } catch (err) {
      console.error('Error fetching AI API config in admin shell:', err);
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

  const handleSaveApiConfig = async (e) => {
    e.preventDefault();
    setApiConfigStatus({ type: 'success', message: 'Saving API configuration...' });
    try {
      const res = await fetch('http://localhost:5001/api/config/ai-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify(apiConfig)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setApiConfig(data.config);
          setApiConfigStatus({ type: 'success', message: 'API credentials saved securely!' });
          setTimeout(() => setApiConfigStatus({ type: '', message: '' }), 3000);
        } else {
          setApiConfigStatus({ type: 'error', message: data.error || 'Failed to save configuration.' });
        }
      } else {
        const data = await res.json();
        setApiConfigStatus({ type: 'error', message: data.error || 'Failed to save configuration.' });
      }
    } catch (err) {
      console.error('Error saving API config:', err);
      setApiConfigStatus({ type: 'error', message: 'Failed to connect to server.' });
    }
  };

  const handleNewTestSession = () => {
    setAdminSessionId(`admin_test_${Date.now()}`);
  };

  const getInitials = (usr) => {
    if (!usr) return 'AD';
    if (usr.displayName) {
      const parts = usr.displayName.split(' ');
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return usr.displayName.substring(0, 2).toUpperCase();
    }
    if (usr.email) {
      return usr.email.substring(0, 2).toUpperCase();
    }
    return 'AD';
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
      <div 
        className={`sidebar ${isCollapsed ? 'collapsed' : ''}`} 
        style={{ 
          transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), padding 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important',
          willChange: 'width, padding'
        }}
      >
        <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div className="logo-container">
            <div className="logo-icon">NG</div>
            <div className="logo-text">NavGurukul AI</div>
          </div>
          
          {!isCollapsed && (
            <button 
              className="sidebar-toggle-btn"
              onClick={() => {
                setIsCollapsed(true);
                localStorage.setItem('admin_sidebar_collapsed', 'true');
              }}
              title="Collapse sidebar"
              style={{ marginLeft: 'auto' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="9" y1="3" x2="9" y2="21"></line>
                <path d="M17 16l-4-4 4-4"></path>
              </svg>
            </button>
          )}
        </div>

        {isCollapsed && (
          <button 
            className="sidebar-toggle-btn"
            onClick={() => {
              setIsCollapsed(false);
              localStorage.setItem('admin_sidebar_collapsed', 'false');
            }}
            title="Expand sidebar"
            style={{ margin: '0 auto 20px auto', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="9" y1="3" x2="9" y2="21"></line>
              <path d="M13 8l4 4-4 4"></path>
            </svg>
          </button>
        )}

        {/* Go back link styled identically to sidebar tabs */}
        <button
          onClick={() => navigate('/')}
          className="new-chat-btn"
          title="Return to Public Chat"
          style={{
            marginBottom: '20px',
            justifyContent: isCollapsed ? 'center' : 'flex-start',
            height: isCollapsed ? '40px' : 'auto',
            padding: isCollapsed ? '0' : '10px 14px',
            borderRadius: isCollapsed ? '50%' : '6px'
          }}
        >
          <span style={{ fontSize: '1rem', flexShrink: 0 }}>🏠</span>
          {!isCollapsed && <span className="new-chat-btn-text" style={{ marginLeft: '4px' }}>Return to Chat</span>}
        </button>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, alignItems: isCollapsed ? 'center' : 'stretch' }}>
          <button
            onClick={() => setActiveTab('dashboard')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: isCollapsed ? '0' : '12px',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              width: isCollapsed ? '40px' : '100%',
              height: isCollapsed ? '40px' : 'auto',
              padding: isCollapsed ? '0' : '12px 16px',
              border: 'none',
              borderRadius: isCollapsed ? '50%' : '8px',
              backgroundColor: activeTab === 'dashboard' ? 'var(--bg-active-tab)' : 'transparent',
              color: activeTab === 'dashboard' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'dashboard' ? 600 : 500,
              fontSize: '0.9rem',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            title={isCollapsed ? 'Knowledge & Persona' : undefined}
          >
            <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>📊</span> 
            {!isCollapsed && 'Knowledge Base'}
          </button>

          <button
            onClick={() => setActiveTab('api_config')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: isCollapsed ? '0' : '12px',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              width: isCollapsed ? '40px' : '100%',
              height: isCollapsed ? '40px' : 'auto',
              padding: isCollapsed ? '0' : '12px 16px',
              border: 'none',
              borderRadius: isCollapsed ? '50%' : '8px',
              backgroundColor: activeTab === 'api_config' ? 'var(--bg-active-tab)' : 'transparent',
              color: activeTab === 'api_config' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'api_config' ? 600 : 500,
              fontSize: '0.9rem',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            title={isCollapsed ? 'API Configuration' : undefined}
          >
            <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>🔑</span> 
            {!isCollapsed && 'API Configuration'}
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: isCollapsed ? '0' : '12px',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              width: isCollapsed ? '40px' : '100%',
              height: isCollapsed ? '40px' : 'auto',
              padding: isCollapsed ? '0' : '12px 16px',
              border: 'none',
              borderRadius: isCollapsed ? '50%' : '8px',
              backgroundColor: activeTab === 'chat' ? 'var(--bg-active-tab)' : 'transparent',
              color: activeTab === 'chat' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'chat' ? 600 : 500,
              fontSize: '0.9rem',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            title={isCollapsed ? 'Test Chatbot' : undefined}
          >
            <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>💬</span> 
            {!isCollapsed && 'Test Chatbot'}
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: isCollapsed ? '0' : '12px',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              width: isCollapsed ? '40px' : '100%',
              height: isCollapsed ? '40px' : 'auto',
              padding: isCollapsed ? '0' : '12px 16px',
              border: 'none',
              borderRadius: isCollapsed ? '50%' : '8px',
              backgroundColor: activeTab === 'analytics' ? 'var(--bg-active-tab)' : 'transparent',
              color: activeTab === 'analytics' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'analytics' ? 600 : 500,
              fontSize: '0.9rem',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.2s',
              opacity: 0.6
            }}
            title={isCollapsed ? 'Analytics' : undefined}
          >
            <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>📈</span> 
            {!isCollapsed && 'Analytics (WIP)'}
          </button>
        </div>

        {/* User Profile dropdown section at the bottom of the sidebar */}
        <div className="user-profile-container" ref={dropdownRef} style={{ width: '100%' }}>
          <button 
            className="user-profile-btn"
            onClick={() => setShowDropdown(!showDropdown)}
            title={isCollapsed ? (user?.displayName || user?.email?.split('@')[0]) : undefined}
            style={{ width: '100%' }}
          >
            <div className="user-avatar">
              {getInitials(user)}
            </div>
            {!isCollapsed && (
              <>
                <div className="user-details">
                  <div className="user-username" style={{ textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    {user?.displayName || user?.email?.split('@')[0]}
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
                  setShowSettingsModal(true);
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
                  setShowLogoutModal(true);
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
        </div>
      </div>

      {/* Main Content Area */}
      <div className="admin-main-content" style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden'
      }}>
        
        {/* View Content */}
        <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
          {activeTab === 'dashboard' && (
            <AdminSettings
              config={config}
              onUpdateConfig={handleUpdateConfig}
              authToken={user?.token}
            />
          )}

          {activeTab === 'api_config' && (
            <div className="admin-settings-container">
              <div className="admin-settings-inner">
                <div className="settings-card">
                  <h3>AI API Configuration</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>
                    Configure keys for AI models dynamically. These are used at runtime by the chatbot and indexing services.
                  </p>
                  
                  <form onSubmit={handleSaveApiConfig} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="form-group">
                      <label>Active AI Provider</label>
                      <select
                        className="form-control"
                        value={apiConfig.activeProvider}
                        onChange={(e) => setApiConfig({ ...apiConfig, activeProvider: e.target.value })}
                      >
                        <option value="gemini">Google Gemini (Active)</option>
                        <option value="openai">OpenAI GPT (Future Expansion)</option>
                        <option value="claude">Anthropic Claude (Future Expansion)</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Gemini API Key</label>
                      <input
                        type="password"
                        className="form-control"
                        value={apiConfig.apiKey_gemini}
                        onChange={(e) => setApiConfig({ ...apiConfig, apiKey_gemini: e.target.value })}
                        placeholder={apiConfig.apiKey_gemini ? '••••••••••••••••' : 'Enter Gemini API Key...'}
                      />
                    </div>

                    <div className="form-group" style={{ opacity: apiConfig.activeProvider === 'openai' ? 1 : 0.6 }}>
                      <label>OpenAI API Key (Placeholder)</label>
                      <input
                        type="password"
                        className="form-control"
                        value={apiConfig.apiKey_openai}
                        onChange={(e) => setApiConfig({ ...apiConfig, apiKey_openai: e.target.value })}
                        placeholder={apiConfig.apiKey_openai ? '••••••••••••••••' : 'Enter OpenAI API Key (future)...'}
                        disabled={apiConfig.activeProvider !== 'openai'}
                      />
                    </div>

                    <div className="form-group" style={{ opacity: apiConfig.activeProvider === 'claude' ? 1 : 0.6 }}>
                      <label>Claude API Key (Placeholder)</label>
                      <input
                        type="password"
                        className="form-control"
                        value={apiConfig.apiKey_claude}
                        onChange={(e) => setApiConfig({ ...apiConfig, apiKey_claude: e.target.value })}
                        placeholder={apiConfig.apiKey_claude ? '••••••••••••••••' : 'Enter Claude API Key (future)...'}
                        disabled={apiConfig.activeProvider !== 'claude'}
                      />
                    </div>

                    {apiConfigStatus.message && (
                      <div className={`notification ${apiConfigStatus.type}`} style={{ marginTop: '10px' }}>
                        {apiConfigStatus.message}
                      </div>
                    )}

                    <button type="submit" className="btn-primary" style={{ marginTop: '10px' }}>
                      Save API Credentials
                    </button>
                  </form>
                </div>
              </div>
            </div>
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
              <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)' }}>Analytics Dashboard</h3>
              <p style={{ margin: 0 }}>User interactions, conversation statistics, and query analysis coming soon.</p>
            </div>
          )}
        </div>
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
