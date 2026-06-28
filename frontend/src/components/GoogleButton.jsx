import React from 'react';

export default function GoogleButton({ onClick, disabled, label = 'Continue with Google' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        backgroundColor: 'white',
        color: '#1f2937',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        padding: '12px',
        fontSize: '0.95rem',
        fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background-color 0.2s, opacity 0.2s',
        boxSizing: 'border-box',
        width: '100%',
        opacity: disabled ? 0.7 : 1
      }}
    >
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
        <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
        <path d="M3.964 10.707a5.416 5.416 0 01-.282-1.707c0-.593.102-1.17.282-1.707V4.96H.957A8.997 8.997 0 000 9c0 1.452.348 2.827.957 4.04l3.007-2.333z" fill="#FBBC05"/>
        <path d="M9 3.58c1.32.001 2.506.454 3.44 1.345l2.582-2.58C13.463.894 11.426 0 9 0 5.474 0 2.457 2.031.957 4.962L3.964 7.295C4.672 5.168 6.656 3.58 9 3.58z" fill="#EA4335"/>
      </svg>
      {label}
    </button>
  );
}
