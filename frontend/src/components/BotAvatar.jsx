import React from 'react';

export default function BotAvatar({ avatarUrl, fallbackEmoji = '🤖', size = 40, className = '' }) {
  const containerStyle = {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
    backgroundColor: 'var(--bg-bubble-model, #1e1e24)',
    border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
  };

  if (avatarUrl) {
    return (
      <div style={containerStyle} className={`bot-avatar-container ${className}`}>
        <img
          src={avatarUrl}
          alt="Bot Avatar"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
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
        fontSize: `${size * 0.55}px`,
        userSelect: 'none',
      }}
      className={`bot-avatar-container emoji-fallback ${className}`}
    >
      {fallbackEmoji}
    </div>
  );
}
