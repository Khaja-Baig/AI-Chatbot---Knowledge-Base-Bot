import React from 'react';

export default function SidebarIconBtn({
  icon,
  onClick,
  title,
  ariaLabel,
  isActive = false,
  className = '',
  buttonRef,
  ...props
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      className={`sb-icon-btn ${isActive ? 'active' : ''} ${className}`}
      onClick={onClick}
      title={title}
      aria-label={ariaLabel || title}
      {...props}
    >
      {icon}
    </button>
  );
}
