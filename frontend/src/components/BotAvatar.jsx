import React from 'react';

export default function BotAvatar({ avatarUrl, fallbackEmoji = '🤖', size = 40, className = '' }) {
  const containerStyle = {
    width: typeof size === 'number' ? `${size}px` : size,
    height: typeof size === 'number' ? `${size}px` : size,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
    backgroundColor: 'var(--bg-bubble-model, #1e1e24)',
    border: '1.5px solid var(--border-color)',
    boxShadow: '0 4px 12px -2px rgba(109, 40, 217, 0.08)',
  };

  // If avatarUrl is undefined, it means the config is still loading.
  // Render a neutral placeholder to prevent a flash of the incorrect fallback image.
  if (avatarUrl === undefined) {
    return (
      <div 
        style={{
          ...containerStyle,
          backgroundColor: 'var(--bg-active-tab, rgba(255, 255, 255, 0.05))',
        }} 
        className={`bot-avatar-container loading-placeholder ${className}`} 
      />
    );
  }

  const finalAvatarUrl = avatarUrl || '/guru_avatar.png';

  if (finalAvatarUrl) {
    return (
      <div style={containerStyle} className={`bot-avatar-container ${className}`}>
        <img
          src={finalAvatarUrl}
          alt="Bot Avatar"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
          onError={(e) => {
            e.target.style.display = 'none';
            const parent = e.target.parentNode;
            if (parent) {
              parent.style.fontSize = typeof size === 'number' ? `${size * 0.55}px` : `calc(${size} * 0.55)`;
              parent.innerHTML = fallbackEmoji;
            }
          }}
        />
      </div>
    );
  }

  // Fallback to emoji
  return (
    <div
      style={{
        ...containerStyle,
        fontSize: typeof size === 'number' ? `${size * 0.55}px` : `calc(${size} * 0.55)`,
        userSelect: 'none',
      }}
      className={`bot-avatar-container emoji-fallback ${className}`}
    >
      {fallbackEmoji}
    </div>
  );
}
