import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function GuestUpgradePrompt({ onDismiss }) {
  const navigate = useNavigate();

  return (
    <div className="upgrade-prompt-overlay">
      <div className="upgrade-prompt-body">
        <div className="upgrade-prompt-icon-badge">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <div className="upgrade-prompt-text-group">
          <h4 className="upgrade-prompt-title">
            Your conversation is worth saving
          </h4>
          <p className="upgrade-prompt-subtitle">
            Log in to save this chat history, access it from any device, and unlock future personalized admissions guidance.
          </p>
        </div>
      </div>

      <div className="upgrade-prompt-actions">
        <button
          onClick={onDismiss}
          className="guest-upgrade-dismiss-btn"
        >
          Continue as Guest
        </button>
        <button
          onClick={() => navigate('/login')}
          className="guest-upgrade-confirm-btn"
        >
          Log In
        </button>
      </div>

      <style>{`
        .upgrade-prompt-overlay {
          position: fixed;
          bottom: 100px;
          left: 50%;
          transform: translateX(-50%);
          width: calc(100% - 32px);
          max-width: 480px;
          background-color: var(--bg-sidebar, #f5f0e6);
          border: 1px solid var(--accent-color, #6d28d9);
          border-radius: 12px;
          padding: 20px 24px;
          box-shadow: 0 10px 30px -5px rgba(109, 40, 217, 0.12), 0 8px 10px -6px rgba(109, 40, 217, 0.08);
          z-index: 10;
          display: flex;
          flex-direction: column;
          gap: 16px;
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          box-sizing: border-box;
          font-family: var(--font-sans), sans-serif;
        }

        .upgrade-prompt-body {
          display: flex;
          gap: 14px;
          align-items: flex-start;
        }

        .upgrade-prompt-icon-badge {
          background-color: rgba(109, 40, 217, 0.12);
          color: var(--accent-color, #6d28d9);
          border-radius: 50%;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(109, 40, 217, 0.08);
        }

        .upgrade-prompt-text-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .upgrade-prompt-title {
          color: var(--text-primary, #2d1f4d);
          font-weight: 600;
          font-size: 0.95rem;
          margin: 0;
          line-height: 1.3;
        }

        .upgrade-prompt-subtitle {
          color: var(--text-secondary, #605280);
          font-size: 0.85rem;
          line-height: 1.4;
          margin: 0;
        }

        .upgrade-prompt-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          align-items: center;
        }

        .guest-upgrade-dismiss-btn {
          background: transparent;
          color: var(--text-secondary, #605280);
          border: 1px solid var(--border-color, rgba(109, 40, 217, 0.12));
          border-radius: 6px;
          padding: 8px 16px;
          font-family: var(--font-sans), sans-serif;
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .guest-upgrade-dismiss-btn:hover {
          background: rgba(109, 40, 217, 0.05);
          color: var(--accent-color, #6d28d9);
          border-color: var(--accent-color, #6d28d9);
        }

        .guest-upgrade-dismiss-btn:focus-visible {
          outline: 2px solid var(--accent-color, #6d28d9);
          outline-offset: 2px;
        }

        .guest-upgrade-confirm-btn {
          background: var(--accent-color, #6d28d9);
          color: white;
          border: 1px solid transparent;
          border-radius: 6px;
          padding: 8px 16px;
          font-family: var(--font-sans), sans-serif;
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(109, 40, 217, 0.15);
          transition: all 0.15s ease;
        }

        .guest-upgrade-confirm-btn:hover {
          background: var(--accent-color, #6d28d9);
          opacity: 0.95;
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(109, 40, 217, 0.25);
        }

        .guest-upgrade-confirm-btn:active {
          transform: translateY(0);
          box-shadow: 0 4px 10px rgba(109, 40, 217, 0.15);
        }

        .guest-upgrade-confirm-btn:focus-visible {
          outline: 2px solid var(--accent-color, #6d28d9);
          outline-offset: 2px;
        }

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
