import React, { useState } from 'react';

export default function AuthAssistantHeader({ 
  counselorName = 'Guru', 
  counselorAvatar = '🤖', 
  counselorAvatarUrl = '', 
  mode 
}) {
  const [imgError, setImgError] = useState(false);
  
  const avatarToUse = (!imgError && (counselorAvatarUrl || '/guru_avatar.png')) || '';
  
  const isImageUrl = avatarToUse && (
    avatarToUse.startsWith('http://') || 
    avatarToUse.startsWith('https://') || 
    avatarToUse.startsWith('/') ||
    avatarToUse.startsWith('data:')
  );

  // Dynamic greetings based on mode
  const getGreeting = () => {
    if (mode === 'forgot') {
      return 'Reset Password';
    }
    return `Hi! I'm ${counselorName}, your AI Counselor.`;
  };

  const getSubtitle = () => {
    if (mode === 'forgot') {
      return 'Enter your email to receive a password reset link.';
    }
    if (mode === 'signup') {
      return 'Create an account to build your admissions knowledge profile.';
    }
    return 'Sign in to start chatting and save your conversation history.';
  };

  return (
    <div className="auth-assistant-header" style={{
      textAlign: 'center',
      marginBottom: '24px',
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      width: '100%'
    }}>
      {/* Avatar Container */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--accent-color, #4f46e5) 0%, #6366f1 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
          overflow: 'hidden'
        }}>
          {isImageUrl ? (
            <img 
              src={avatarToUse} 
              alt={counselorName} 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              onError={() => setImgError(true)}
            />
          ) : (
            <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>{counselorAvatar || '🤖'}</span>
          )}
        </div>
      </div>

      {/* Greeting Title */}
      <h1 style={{ 
        fontSize: '1.35rem', 
        fontWeight: 600, 
        color: 'var(--text-primary)', 
        marginBottom: '6px', 
        marginTop: 0,
        lineHeight: 1.3
      }}>
        {getGreeting()}
      </h1>

      {/* Greeting Subtitle */}
      <p style={{ 
        color: 'var(--text-secondary)', 
        fontSize: '0.85rem', 
        margin: 0, 
        lineHeight: 1.4,
        maxWidth: '320px'
      }}>
        {getSubtitle()}
      </p>
    </div>
  );
}
