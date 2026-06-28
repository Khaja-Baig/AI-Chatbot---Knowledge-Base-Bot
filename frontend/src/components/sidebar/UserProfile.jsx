import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export default function UserProfile({
  user,
  isCollapsed,
  onOpenSettings,
  onLogoutClick
}) {
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const getInitials = (u) => {
    if (!u) return '?';
    if (u.displayName) {
      const parts = u.displayName.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return parts[0].substring(0, 2).toUpperCase();
    }
    if (u.email) {
      const emailName = u.email.split('@')[0];
      const parts = emailName.split(/[._-]/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return emailName.substring(0, 2).toUpperCase();
    }
    return 'US';
  };

  const handleDropdownToggle = (e) => {
    e.stopPropagation();
    setShowDropdown(prev => !prev);
  };

  if (!user) {
    // Guest User Layout
    if (isCollapsed) {
      return (
        <div className="sb-collapsed-footer">
          <button
            type="button"
            className="sb-icon-btn"
            onClick={() => navigate('/login')}
            title="Log In"
            aria-label="Log In"
            style={{ backgroundColor: 'var(--accent-color)', color: '#ffffff' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2-4"></path>
              <polyline points="10 17 15 12 10 7"></polyline>
              <line x1="15" y1="12" x2="3" y2="12"></line>
            </svg>
          </button>
        </div>
      );
    }

    return (
      <div className="sb-expanded-footer">
        <button
          type="button"
          className="sb-expanded-profile-btn"
          onClick={() => navigate('/login')}
          style={{
            backgroundColor: 'var(--accent-color)',
            color: '#ffffff',
            justifyContent: 'center',
            fontWeight: 500,
            borderRadius: '8px'
          }}
        >
          <span>🔑</span>
          <span>Log In / Sign Up</span>
        </button>
      </div>
    );
  }

  // Logged-in User Layout
  if (isCollapsed) {
    return (
      <div className="sb-collapsed-footer" ref={dropdownRef}>
        <button
          type="button"
          className="sb-collapsed-profile-trigger"
          onClick={handleDropdownToggle}
          title={user.displayName || user.email.split('@')[0]}
          aria-haspopup="true"
          aria-expanded={showDropdown}
        >
          <div className="sb-avatar">
            {getInitials(user)}
          </div>
        </button>

        {showDropdown && (
          <div className="sb-dropdown-menu sb-collapsed-dropdown" role="menu">
            <button
              type="button"
              className="sb-dropdown-item"
              onClick={() => {
                setShowDropdown(false);
                onOpenSettings();
              }}
              role="menuitem"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
              Settings
            </button>
            <button
              type="button"
              className="sb-dropdown-item logout"
              onClick={() => {
                setShowDropdown(false);
                onLogoutClick();
              }}
              role="menuitem"
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
    );
  }

  return (
    <div className="sb-expanded-footer" ref={dropdownRef}>
      <button
        type="button"
        className="sb-expanded-profile-btn"
        onClick={handleDropdownToggle}
        aria-haspopup="true"
        aria-expanded={showDropdown}
      >
        <div className="sb-avatar">
          {getInitials(user)}
        </div>
        <div className="sb-expanded-profile-details">
          <div className="sb-expanded-profile-name">
            {user.displayName || user.email.split('@')[0]}
          </div>
        </div>
        <div className="sb-expanded-profile-chevron">▾</div>
      </button>

      {showDropdown && (
        <div className="sb-dropdown-menu sb-expanded-dropdown" role="menu">
          <button
            type="button"
            className="sb-dropdown-item"
            onClick={() => {
              setShowDropdown(false);
              onOpenSettings();
            }}
            role="menuitem"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}>
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
            Settings
          </button>
          <button
            type="button"
            className="sb-dropdown-item logout"
            onClick={() => {
              setShowDropdown(false);
              onLogoutClick();
            }}
            role="menuitem"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
