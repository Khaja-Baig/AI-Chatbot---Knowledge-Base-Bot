import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function GuestUpgradePrompt({ onDismiss }) {
  const navigate = useNavigate();

  return (
    <div className="upgrade-prompt-overlay" style={{
      position: 'absolute',
      bottom: '90px', // Right above the chat input box
      left: '50%',
      transform: 'translateX(-50%)',
      width: '90%',
      maxWidth: '480px',
      backgroundColor: 'var(--bg-sidebar, #18181c)',
      border: '1px solid var(--accent-color, #4f46e5)',
      borderRadius: '12px',
      padding: '20px 24px',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
      zIndex: 10,
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      boxSizing: 'border-box'
    }}>
      <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
        <div style={{
          fontSize: '1.4rem',
          backgroundColor: 'rgba(79, 70, 229, 0.15)',
          color: 'var(--accent-color, #4f46e5)',
          borderRadius: '50%',
          width: '38px',
          height: '38px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          💬
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <h4 style={{ color: 'white', fontWeight: 600, fontSize: '0.95rem', margin: 0 }}>
            Your conversation is worth saving
          </h4>
          <p style={{ color: 'var(--text-secondary, #9ca3af)', fontSize: '0.85rem', lineHeight: '1.4', margin: 0 }}>
            Log in to save this chat history, access it from any device, and unlock future personalized admissions guidance.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
        <button
          onClick={onDismiss}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary, #9ca3af)',
            fontSize: '0.85rem',
            fontWeight: 500,
            cursor: 'pointer',
            padding: '8px 12px',
            borderRadius: '6px',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.04)'}
          onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
        >
          Continue as Guest
        </button>
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
      </div>

      <style>{`
        @keyframes slideUp {
          from {
            transform: translate(-50%, 20px);
            opacity: 0;
          }
          to {
            transform: translate(-50%, 0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
