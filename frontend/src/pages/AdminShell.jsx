import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ChatbotConfigPanel from '../components/ChatbotConfigPanel';
import KnowledgeBaseManager from '../components/KnowledgeBaseManager';
import ChatWindow from '../components/ChatWindow';
import '../components/sidebar/Sidebar.css';
import UserProfile from '../components/sidebar/UserProfile';
import { API_BASE_URL } from '../lib/api';


export default function AdminShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Layout and view states
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'api_config' | 'chat' | 'analytics'
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('admin_sidebar_collapsed') === 'true';
  });
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    if (window.innerWidth <= 768) {
      setIsSidebarOpen(false);
    }
  };

  // Chatbot Config state
  const [config, setConfig] = useState({
    counselorName: 'Guru',
    greetingMessage: 'Hello! I am Guru, your NavGurukul Admissions Counselor. I can help you understand our courses, admissions process, eligibility, placements, and campus life. How can I help you today?',
    behaviorMode: 'warm',
    counselorAvatar: '🤖',
    counselorAvatarUrl: undefined,
    sidebarLogoUrl: ''
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

  const fetchConfig = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/config`, {
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
      const res = await fetch(`${API_BASE_URL}/api/config/ai-config`, {
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
      const res = await fetch(`${API_BASE_URL}/api/config`, {
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
      const res = await fetch(`${API_BASE_URL}/api/config/ai-config`, {
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

  const useCollapsedView = isCollapsed && !isMobile;

  return (
    <div className="admin-layout-container" style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      backgroundColor: 'var(--bg-primary)',
      fontFamily: 'var(--font-sans)',
      overflow: 'hidden',
      position: 'relative'
    }}>
      
      {/* Backdrop for Mobile Admin Sidebar */}
      <div 
        className={`sidebar-backdrop ${isSidebarOpen ? 'visible' : ''}`} 
        onClick={() => setIsSidebarOpen(false)}
      ></div>
      
      {/* Sidebar Nav */}
      <div className={`sidebar-root ${isSidebarOpen ? 'open' : ''} ${useCollapsedView ? 'collapsed' : ''}`}>
        {!useCollapsedView ? (
          <div className="sb-expanded-layout">
            {/* Brand Header */}
            <header className="sb-expanded-header">
              <div className="sb-expanded-brand">
                <div className="sb-expanded-brand-icon">NG</div>
                <div className="sb-expanded-brand-text">NavGurukul AI</div>
              </div>
              <button 
                className="sb-icon-btn"
                onClick={() => {
                  if (isMobile) {
                    setIsSidebarOpen(false);
                  } else {
                    setIsCollapsed(true);
                    localStorage.setItem('admin_sidebar_collapsed', 'true');
                  }
                }}
                title={isMobile ? "Close sidebar" : "Collapse sidebar"}
              >
                {isMobile ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="9" y1="3" x2="9" y2="21"></line>
                    <path d="M17 16l-4-4 4-4"></path>
                  </svg>
                )}
              </button>
            </header>

            {/* Go back link styled identically to sidebar tabs */}
            <section className="sb-expanded-action-row" style={{ marginBottom: '20px' }}>
              <button
                onClick={() => {
                  navigate('/');
                  if (isMobile) setIsSidebarOpen(false);
                }}
                className="sb-expanded-new-chat-btn"
                title="Return to Public Chat"
                style={{ width: '100%' }}
              >
                <span style={{ fontSize: '1rem', marginRight: '4px', flexShrink: 0 }}>🏠</span>
                <span>Return to Chat</span>
              </button>
            </section>

            {/* Navigation Tabs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, padding: '0 var(--sb-space-lg)' }}>
              <button
                onClick={() => handleTabClick('chatbot_config')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  justifyContent: 'flex-start',
                  width: '100%',
                  padding: '12px 16px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: activeTab === 'chatbot_config' ? 'var(--bg-active-tab)' : 'transparent',
                  color: activeTab === 'chatbot_config' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: activeTab === 'chatbot_config' ? 600 : 500,
                  fontSize: '0.9rem',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>🎨</span> 
                Counselor Persona
              </button>

              <button
                onClick={() => handleTabClick('dashboard')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  justifyContent: 'flex-start',
                  width: '100%',
                  padding: '12px 16px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: activeTab === 'dashboard' ? 'var(--bg-active-tab)' : 'transparent',
                  color: activeTab === 'dashboard' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: activeTab === 'dashboard' ? 600 : 500,
                  fontSize: '0.9rem',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>🧠</span> 
                Knowledge Base (Vector DB)
              </button>

              <button
                onClick={() => handleTabClick('api_config')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  justifyContent: 'flex-start',
                  width: '100%',
                  padding: '12px 16px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: activeTab === 'api_config' ? 'var(--bg-active-tab)' : 'transparent',
                  color: activeTab === 'api_config' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: activeTab === 'api_config' ? 600 : 500,
                  fontSize: '0.9rem',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>🔑</span> 
                API Configuration
              </button>

              <button
                onClick={() => handleTabClick('chat')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  justifyContent: 'flex-start',
                  width: '100%',
                  padding: '12px 16px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: activeTab === 'chat' ? 'var(--bg-active-tab)' : 'transparent',
                  color: activeTab === 'chat' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: activeTab === 'chat' ? 600 : 500,
                  fontSize: '0.9rem',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>💬</span> 
                Test Chatbot
              </button>

              <button
                onClick={() => handleTabClick('analytics')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  justifyContent: 'flex-start',
                  width: '100%',
                  padding: '12px 16px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: activeTab === 'analytics' ? 'var(--bg-active-tab)' : 'transparent',
                  color: activeTab === 'analytics' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: activeTab === 'analytics' ? 600 : 500,
                  fontSize: '0.9rem',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  opacity: 0.6
                }}
              >
                <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>📈</span> 
                Analytics (WIP)
              </button>
            </div>


            {/* Pinned User Profile Footer */}
            <UserProfile
              user={user}
              isCollapsed={false}
              onOpenSettings={() => {
                setShowSettingsModal(true);
                if (isMobile) setIsSidebarOpen(false);
              }}
              onLogoutClick={() => {
                setShowLogoutModal(true);
                if (isMobile) setIsSidebarOpen(false);
              }}
            />
          </div>
        ) : (
          <div className="sb-collapsed-layout">
            {/* Collapsed Brand Icon */}
            <div className="sb-collapsed-brand">
              NG
            </div>

            {/* Collapsed Actions */}
            <div className="sb-collapsed-actions" style={{ marginBottom: '20px' }}>
              <button 
                className="sb-icon-btn"
                onClick={() => {
                  setIsCollapsed(false);
                  localStorage.setItem('admin_sidebar_collapsed', 'false');
                }}
                title="Expand sidebar"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="9" y1="3" x2="9" y2="21"></line>
                  <path d="M13 8l4 4-4 4"></path>
                </svg>
              </button>
            </div>

            {/* Collapsed Return to Chat Button */}
            <div style={{ marginBottom: '20px' }}>
              <button
                onClick={() => navigate('/')}
                className="sb-icon-btn"
                title="Return to Public Chat"
                style={{ backgroundColor: 'var(--accent-color)', color: '#ffffff' }}
              >
                <span style={{ fontSize: '1.1rem' }}>🏠</span>
              </button>
            </div>

            {/* Collapsed Navigation Tabs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, alignItems: 'center' }}>
              <button
                onClick={() => setActiveTab('chatbot_config')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '40px',
                  height: '40px',
                  border: 'none',
                  borderRadius: '50%',
                  backgroundColor: activeTab === 'chatbot_config' ? 'var(--bg-active-tab)' : 'transparent',
                  color: activeTab === 'chatbot_config' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                title="Counselor Persona"
              >
                <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>🎨</span> 
              </button>

              <button
                onClick={() => setActiveTab('dashboard')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '40px',
                  height: '40px',
                  border: 'none',
                  borderRadius: '50%',
                  backgroundColor: activeTab === 'dashboard' ? 'var(--bg-active-tab)' : 'transparent',
                  color: activeTab === 'dashboard' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                title="Knowledge Base (Vector DB)"
              >
                <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>🧠</span> 
              </button>

              <button
                onClick={() => setActiveTab('api_config')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '40px',
                  height: '40px',
                  border: 'none',
                  borderRadius: '50%',
                  backgroundColor: activeTab === 'api_config' ? 'var(--bg-active-tab)' : 'transparent',
                  color: activeTab === 'api_config' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                title="API Configuration"
              >
                <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>🔑</span> 
              </button>

              <button
                onClick={() => setActiveTab('chat')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '40px',
                  height: '40px',
                  border: 'none',
                  borderRadius: '50%',
                  backgroundColor: activeTab === 'chat' ? 'var(--bg-active-tab)' : 'transparent',
                  color: activeTab === 'chat' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                title="Test Chatbot"
              >
                <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>💬</span> 
              </button>

              <button
                onClick={() => setActiveTab('analytics')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '40px',
                  height: '40px',
                  border: 'none',
                  borderRadius: '50%',
                  backgroundColor: activeTab === 'analytics' ? 'var(--bg-active-tab)' : 'transparent',
                  color: activeTab === 'analytics' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  opacity: 0.6
                }}
                title="Analytics (WIP)"
              >
                <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>📈</span> 
              </button>
            </div>

            {/* Pinned User Profile Footer */}
            <UserProfile
              user={user}
              isCollapsed={true}
              onOpenSettings={() => setShowSettingsModal(true)}
              onLogoutClick={() => setShowLogoutModal(true)}
            />
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="admin-main-content" style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden'
      }}>
        
        {/* Mobile Admin Header */}
        <div className="admin-mobile-header" style={{
          display: isMobile ? 'flex' : 'none',
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-color)',
          alignItems: 'center',
          gap: '12px',
          backgroundColor: 'var(--bg-sidebar)',
          flexShrink: 0
        }}>
          <button 
            className="menu-toggle-btn" 
            onClick={() => setIsSidebarOpen(true)}
          >
            ☰
          </button>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
            Admin Dashboard
          </span>
        </div>
        
        {/* View Content */}
        <div style={{ 
          flex: 1, 
          overflow: activeTab === 'chat' ? 'hidden' : 'auto', 
          position: 'relative',
          display: activeTab === 'chat' ? 'flex' : 'block',
          flexDirection: 'column'
        }}>
          {activeTab === 'chatbot_config' && (
            <ChatbotConfigPanel
              config={config}
              onUpdateConfig={handleUpdateConfig}
            />
          )}

          {activeTab === 'dashboard' && (
            <KnowledgeBaseManager
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
              <div style={{ 
                flex: 1, 
                position: 'relative', 
                height: 'calc(100% - 53px)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}>
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
