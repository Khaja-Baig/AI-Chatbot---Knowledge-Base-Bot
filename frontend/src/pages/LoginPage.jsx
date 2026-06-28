import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getFriendlyAuthError } from '../utils/authErrors';
import GoogleButton from '../components/GoogleButton';
import PasswordInput from '../components/PasswordInput';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  
  // mode: 'login' | 'signup' | 'forgot'
  const [mode, setMode] = useState('login');
  
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login, loginWithGoogle, resetPassword, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect back to original route, or default to appropriate page depending on role
  const handleRedirect = (role) => {
    const from = location.state?.from?.pathname;
    if (role === 'admin') {
      navigate('/admin/dashboard', { replace: true });
    } else {
      navigate(from || '/', { replace: true });
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return setError('Please fill in all fields.');
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      const res = await login(email, password);
      handleRedirect(res.user.role);
    } catch (err) {
      console.error(err);
      setError(getFriendlyAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailRegister = async (e) => {
    e.preventDefault();
    if (!email || !password || !displayName || !confirmPassword) {
      return setError('Please fill in all fields.');
    }
    if (password.length < 6) {
      return setError('Password must be at least 6 characters.');
    }
    if (password !== confirmPassword) {
      return setError('Passwords do not match.');
    }

    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      const res = await register(email, password, displayName);
      handleRedirect(res.user.role);
    } catch (err) {
      console.error(err);
      setError(getFriendlyAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      const res = await loginWithGoogle();
      handleRedirect(res.user.role);
    } catch (err) {
      console.error(err);
      setError(getFriendlyAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!forgotEmail) return setError('Please enter your email.');
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      await resetPassword(forgotEmail);
      setMessage('Password reset email sent. Please check your inbox.');
      setMode('login');
    } catch (err) {
      console.error(err);
      setError(getFriendlyAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const changeMode = (newMode) => {
    setError('');
    setMessage('');
    setMode(newMode);
  };

  return (
    <div className="login-page-container" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: 'var(--bg-primary)',
      padding: '24px',
      position: 'relative',
      fontFamily: 'var(--font-sans)',
      boxSizing: 'border-box'
    }}>
      {/* Decorative blurred glow background elements */}
      <div style={{
        position: 'absolute',
        width: '300px',
        height: '300px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(79, 70, 229, 0.15) 0%, rgba(0, 0, 0, 0) 70%)',
        top: '10%',
        left: '20%',
        filter: 'blur(40px)',
        zIndex: 0,
        pointerEvents: 'none'
      }}></div>
      <div style={{
        position: 'absolute',
        width: '350px',
        height: '350px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(79, 70, 229, 0.1) 0%, rgba(0, 0, 0, 0) 75%)',
        bottom: '10%',
        right: '15%',
        filter: 'blur(50px)',
        zIndex: 0,
        pointerEvents: 'none'
      }}></div>

      <div className="login-card" style={{
        width: '100%',
        maxWidth: '420px',
        backgroundColor: 'var(--bg-sidebar)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        padding: '40px 32px',
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        backdropFilter: 'blur(8px)',
        zIndex: 1,
        position: 'relative',
        boxSizing: 'border-box'
      }}>
        
        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', marginTop: 0 }}>
            {mode === 'forgot' ? 'Reset Password' : mode === 'signup' ? 'Create Account' : 'Welcome Back'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
            {mode === 'forgot' 
              ? 'Enter your email to receive a password reset link' 
              : mode === 'signup' 
                ? 'Sign up to build your admissions knowledge profile'
                : 'Sign in to access your dashboard and save your history'
            }
          </p>
        </div>

        {/* Error / Success Alerts */}
        {error && (
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: '#f87171',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            marginBottom: '20px',
            lineHeight: '1.4'
          }}>
            ⚠️ {error}
          </div>
        )}

        {message && (
          <div style={{
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            color: '#34d399',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            marginBottom: '20px',
            lineHeight: '1.4'
          }}>
            ✅ {message}
          </div>
        )}

        {/* Form Selection based on Mode */}
        {mode === 'forgot' ? (
          <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="forgot-email" style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Email Address</label>
              <input
                id="forgot-email"
                type="email"
                placeholder="you@example.com"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                disabled={isLoading}
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  padding: '12px 16px',
                  fontSize: '0.9rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                  width: '100%'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                backgroundColor: 'var(--accent-color, #4f46e5)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '0.95rem',
                fontWeight: 500,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.7 : 1,
                transition: 'opacity 0.2s',
                marginTop: '8px'
              }}
            >
              {isLoading ? 'Sending...' : 'Send Reset Link'}
            </button>

            <button
              type="button"
              onClick={() => changeMode('login')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '0.85rem',
                cursor: 'pointer',
                textAlign: 'center',
                textDecoration: 'underline'
              }}
            >
              Back to Sign In
            </button>
          </form>
        ) : mode === 'signup' ? (
          /* Sign Up Form Mode */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <form onSubmit={handleEmailRegister} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Full Name */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="reg-name" style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Full Name</label>
                <input
                  id="reg-name"
                  type="text"
                  placeholder="John Doe"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={isLoading}
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    padding: '12px 16px',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    width: '100%'
                  }}
                />
              </div>

              {/* Email */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="reg-email" style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Email Address</label>
                <input
                  id="reg-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    padding: '12px 16px',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    width: '100%'
                  }}
                />
              </div>

              {/* Password */}
              <PasswordInput
                id="reg-password"
                label="Password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />

              {/* Confirm Password */}
              <PasswordInput
                id="reg-confirm-password"
                label="Confirm Password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
              />

              <button
                type="submit"
                disabled={isLoading}
                style={{
                  backgroundColor: 'var(--accent-color, #4f46e5)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px',
                  fontSize: '0.95rem',
                  fontWeight: 500,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.7 : 1,
                  transition: 'opacity 0.2s',
                  marginTop: '12px'
                }}
              >
                {isLoading ? 'Creating Account...' : 'Sign Up'}
              </button>
            </form>

            <div style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Already have an account?{' '}
              <button 
                onClick={() => changeMode('login')} 
                style={{ background: 'none', border: 'none', color: 'var(--accent-color, #4f46e5)', cursor: 'pointer', fontWeight: 500, padding: 0 }}
              >
                Sign In
              </button>
            </div>

            {/* Divider */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              margin: '8px 0',
              color: 'var(--text-muted)'
            }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }}></div>
              <span style={{ padding: '0 12px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>or</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }}></div>
            </div>

            {/* Google Signup */}
            <GoogleButton
              onClick={handleGoogleLogin}
              disabled={isLoading}
              label="Continue with Google"
            />
          </div>
        ) : (
          /* Normal Sign In Mode */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <form onSubmit={handleEmailLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Email */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="login-email" style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Email Address</label>
                <input
                  id="login-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    padding: '12px 16px',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    width: '100%'
                  }}
                />
              </div>

              {/* Password */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '-6px' }}>
                  <label htmlFor="login-password" style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Password</label>
                  <button
                    type="button"
                    onClick={() => changeMode('forgot')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent-color, #4f46e5)',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      textDecoration: 'none',
                      padding: 0
                    }}
                  >
                    Forgot password?
                  </button>
                </div>
                <PasswordInput
                  id="login-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                style={{
                  backgroundColor: 'var(--accent-color, #4f46e5)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px',
                  fontSize: '0.95rem',
                  fontWeight: 500,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.7 : 1,
                  transition: 'opacity 0.2s',
                  marginTop: '8px'
                }}
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </button>
            </form>

            <div style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Don't have an account?{' '}
              <button 
                onClick={() => changeMode('signup')} 
                style={{ background: 'none', border: 'none', color: 'var(--accent-color, #4f46e5)', cursor: 'pointer', fontWeight: 500, padding: 0 }}
              >
                Sign Up
              </button>
            </div>

            {/* Divider */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              margin: '8px 0',
              color: 'var(--text-muted)'
            }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }}></div>
              <span style={{ padding: '0 12px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>or</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }}></div>
            </div>

            {/* Google Login */}
            <GoogleButton
              onClick={handleGoogleLogin}
              disabled={isLoading}
              label="Continue with Google"
            />
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '32px' }}>
          <Link to="/" style={{
            color: 'var(--text-secondary)',
            fontSize: '0.85rem',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span>←</span> Back to Chat
          </Link>
        </div>

      </div>
    </div>
  );
}
