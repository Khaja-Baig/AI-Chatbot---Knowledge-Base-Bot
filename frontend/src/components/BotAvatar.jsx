import React, { useState, useEffect } from 'react';

export default function BotAvatar({ avatarUrl, fallbackEmoji = '🤖', size = 40, className = '' }) {
  const [imgError, setImgError] = useState(false);

  // Reset error state when avatarUrl changes
  useEffect(() => {
    setImgError(false);
  }, [avatarUrl]);

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
    fontSize: typeof size === 'number' ? `${size * 0.55}px` : `calc(${size} * 0.55)`,
    lineHeight: '1',
    userSelect: 'none',
  };

  const finalAvatarUrl = avatarUrl || '/guru_avatar.png';

  if (finalAvatarUrl && !imgError) {
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
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  // Fallback to emoji
  return (
    <div
      style={containerStyle}
      className={`bot-avatar-container emoji-fallback ${className}`}
    >
      {fallbackEmoji}
    </div>
  );
}
