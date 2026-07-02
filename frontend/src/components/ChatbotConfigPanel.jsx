import React, { useState, useEffect, useRef } from 'react';

export default function ChatbotConfigPanel({ config, onUpdateConfig }) {
  const [counselorName, setCounselorName] = useState(config.counselorName || '');
  const [counselorAvatar, setCounselorAvatar] = useState(config.counselorAvatar || '🤖');
  const [counselorAvatarUrl, setCounselorAvatarUrl] = useState(config.counselorAvatarUrl || '');
  const [sidebarLogoUrl, setSidebarLogoUrl] = useState(config.sidebarLogoUrl || '');
  const [greetingMessage, setGreetingMessage] = useState(config.greetingMessage || '');
  const [behaviorMode, setBehaviorMode] = useState(config.behaviorMode || 'warm');

  const avatarInputRef = useRef(null);
  const logoInputRef = useRef(null);

  useEffect(() => {
    setCounselorName(config.counselorName || '');
    setCounselorAvatar(config.counselorAvatar || '🤖');
    setCounselorAvatarUrl(config.counselorAvatarUrl || '');
    setSidebarLogoUrl(config.sidebarLogoUrl || '');
    setGreetingMessage(config.greetingMessage || '');
    setBehaviorMode(config.behaviorMode || 'warm');
  }, [config]);

  const handleImageUpload = (file, callback) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_WIDTH = 300;
        const MAX_HEIGHT = 300;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        callback(dataUrl);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveConfig = (e) => {
    e.preventDefault();
    onUpdateConfig({
      counselorName,
      counselorAvatar,
      counselorAvatarUrl,
      sidebarLogoUrl,
      greetingMessage,
      behaviorMode
    });
  };

  return (
    <div className="admin-settings-container">
      <div className="admin-settings-inner">
        <div className="settings-card">
          <h3>Counselor Config & Persona</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>
            Customize the chatbot's identity, greeting message, avatar, and conversation style.
          </p>

          <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label>Counselor Name</label>
              <input
                type="text"
                className="form-control"
                value={counselorName}
                onChange={(e) => setCounselorName(e.target.value)}
                placeholder="Persona Name..."
              />
            </div>

            <div className="form-group" style={{ display: 'flex', gap: '20px', alignItems: 'center', margin: '8px 0' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 500 }}>Bot Avatar Image</label>
                <div
                  onClick={() => avatarInputRef.current?.click()}
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    border: '2px dashed var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    position: 'relative',
                    backgroundColor: 'var(--bg-primary)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {counselorAvatarUrl ? (
                    <img src={counselorAvatarUrl} alt="Avatar Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '2rem' }}>{counselorAvatar || '🤖'}</span>
                  )}
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: 'rgba(0,0,0,0.6)',
                    color: '#fff',
                    fontSize: '0.65rem',
                    textAlign: 'center',
                    padding: '2px 0'
                  }}>
                    Upload
                  </div>
                </div>
                <input
                  type="file"
                  ref={avatarInputRef}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleImageUpload(file, setCounselorAvatarUrl);
                    }
                  }}
                  accept="image/*"
                  style={{ display: 'none' }}
                />
                {counselorAvatarUrl && (
                  <button
                    type="button"
                    onClick={() => setCounselorAvatarUrl('')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ef4444',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      marginTop: '6px',
                      display: 'block',
                      textAlign: 'center',
                      width: '80px'
                    }}
                  >
                    Clear Image
                  </button>
                )}
              </div>

              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 500 }}>Sidebar Logo Image</label>
                <div
                  onClick={() => logoInputRef.current?.click()}
                  style={{
                    width: '180px',
                    height: '80px',
                    borderRadius: '8px',
                    border: '2px dashed var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    position: 'relative',
                    backgroundColor: 'var(--bg-primary)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {sidebarLogoUrl ? (
                    <img src={sidebarLogoUrl} alt="Logo Preview" style={{ maxWidth: '95%', maxHeight: '95%', objectFit: 'contain' }} />
                  ) : (
                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.75rem', padding: '10px' }}>
                      <span style={{ display: 'block', fontSize: '1.25rem', marginBottom: '2px' }}>🖼️</span>
                      No Logo (Text Fallback)
                    </div>
                  )}
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: 'rgba(0,0,0,0.6)',
                    color: '#fff',
                    fontSize: '0.65rem',
                    textAlign: 'center',
                    padding: '2px 0'
                  }}>
                    Upload Logo
                  </div>
                </div>
                <input
                  type="file"
                  ref={logoInputRef}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleImageUpload(file, setSidebarLogoUrl);
                    }
                  }}
                  accept="image/*"
                  style={{ display: 'none' }}
                />
                {sidebarLogoUrl && (
                  <button
                    type="button"
                    onClick={() => setSidebarLogoUrl('')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ef4444',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      marginTop: '6px',
                      display: 'block',
                      textAlign: 'center',
                      width: '180px'
                    }}
                  >
                    Clear Logo
                  </button>
                )}
              </div>
            </div>

            <div className="form-group">
              <label>Counselor Avatar (Emoji Fallback)</label>
              <input
                type="text"
                className="form-control"
                value={counselorAvatar}
                onChange={(e) => setCounselorAvatar(e.target.value)}
                placeholder="Emoji (e.g. 🤖)..."
              />
            </div>

            <div className="form-group">
              <label>Greeting message</label>
              <textarea
                className="form-control"
                style={{ minHeight: '80px', resize: 'vertical' }}
                value={greetingMessage}
                onChange={(e) => setGreetingMessage(e.target.value)}
                placeholder="Greeting shown to new users..."
              />
            </div>

            <div className="form-group">
              <label>Conversation Style</label>
              <select
                className="form-control"
                value={behaviorMode}
                onChange={(e) => setBehaviorMode(e.target.value)}
              >
                <option value="warm">Warm & Supportive</option>
                <option value="formal">Formal & Structured</option>
                <option value="technical">Direct & Clear</option>
              </select>
            </div>

            <button type="submit" className="btn-primary" style={{ marginTop: '10px' }}>
              Save Persona Settings
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
