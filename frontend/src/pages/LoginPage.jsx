import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getFriendlyAuthError } from '../utils/authErrors';
import GoogleButton from '../components/GoogleButton';
import PasswordInput from '../components/PasswordInput';
import AuthAssistantHeader from '../components/AuthAssistantHeader';

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
  const [flipState, setFlipState] = useState(''); // '' | 'half' | 'back'
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const [config, setConfig] = useState({
    counselorName: 'Guru',
    counselorAvatar: '🤖',
    counselorAvatarUrl: undefined
  });

  // Force light theme for guest mode on login page
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    document.body.classList.add('light-theme');
  }, []);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch('http://localhost:5001/api/config');
        if (res.ok) {
          const data = await res.json();
          setConfig(prev => ({
            ...prev,
            counselorName: data.counselorName || 'Guru',
            counselorAvatar: data.counselorAvatar || '🤖',
            counselorAvatarUrl: data.counselorAvatarUrl || ''
          }));
        }
      } catch (err) {
        console.error('Failed to load chatbot config:', err);
      }
    };
    fetchConfig();
  }, []);

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
    setIsGoogleLoading(true);

    try {
      const res = await loginWithGoogle();
      handleRedirect(res.user.role);
    } catch (err) {
      console.error(err);
      setError(getFriendlyAuthError(err));
      setIsLoading(false);
      setIsGoogleLoading(false);
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
      changeMode('login');
    } catch (err) {
      console.error(err);
      setError(getFriendlyAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const changeMode = (newMode) => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (prefersReducedMotion) {
      setError('');
      setMessage('');
      setMode(newMode);
      return;
    }

    setError('');
    setMessage('');
    setFlipState('half');
    
    setTimeout(() => {
      setMode(newMode);
      setFlipState('back');
      
      requestAnimationFrame(() => {
        setTimeout(() => {
          setFlipState('');
        }, 20);
      });
    }, 200);
  };

  return (
    <div className="login-page-container" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100dvh',
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

      <div className={`auth-card-container ${mode === 'signup' ? 'signup-mode' : ''}`}>
        <div className={`auth-card ${flipState === 'half' ? 'flip-half' : flipState === 'back' ? 'flip-back' : ''}`}>
        {/* Dynamic AI Assistant Header */}
        <AuthAssistantHeader
          counselorName={config.counselorName}
          counselorAvatar={config.counselorAvatar}
          counselorAvatarUrl={config.counselorAvatarUrl}
          mode={mode}
        />

        {/* Scrollable Form Body Container */}
        <div className="auth-form-body">
          {/* Error / Success Alerts */}
          {error && (
            <div className="auth-alert">
              ⚠️ {error}
            </div>
          )}

          {message && (
            <div className="auth-alert-success">
              ✅ {message}
            </div>
          )}

          {/* Form Selection based on Mode */}
          {mode === 'forgot' ? (
            <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="auth-input-group">
                <label htmlFor="forgot-email" className="auth-label">Email Address</label>
                <input
                  id="forgot-email"
                  type="email"
                  placeholder="you@example.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  disabled={isLoading}
                  className="auth-input"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="auth-submit-btn"
              >
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          ) : mode === 'signup' ? (
            <form onSubmit={handleEmailRegister} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="auth-grid-form">
                <div className="auth-grid-col">
                  {/* Full Name */}
                  <div className="auth-input-group">
                    <label htmlFor="reg-name" className="auth-label">Full Name</label>
                    <input
                      id="reg-name"
                      type="text"
                      placeholder="John Doe"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      disabled={isLoading}
                      className="auth-input"
                      required
                    />
                  </div>

                  {/* Email */}
                  <div className="auth-input-group">
                    <label htmlFor="reg-email" className="auth-label">Email Address</label>
                    <input
                      id="reg-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      className="auth-input"
                      required
                    />
                  </div>
                </div>

                <div className="auth-grid-divider"></div>

                <div className="auth-grid-col">
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
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="auth-submit-btn"
              >
                {isLoading ? 'Creating Account...' : 'Sign Up'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleEmailLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Email */}
              <div className="auth-input-group">
                <label htmlFor="login-email" className="auth-label">Email Address</label>
                <input
                  id="login-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="auth-input"
                  required
                />
              </div>

              {/* Password */}
              <div className="auth-input-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '-6px' }}>
                  <label htmlFor="login-password" className="auth-label">Password</label>
                  <button
                    type="button"
                    onClick={() => changeMode('forgot')}
                    className="auth-toggle-link"
                    style={{ fontSize: '0.8rem' }}
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

              <button
                type="submit"
                disabled={isLoading}
                className="auth-submit-btn"
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </button>
            </form>
          )}
        </div>

        {/* Docked Footer (Fixed Actions) */}
        <div className="auth-footer">
          {mode === 'forgot' ? (
            <div style={{ textAlign: 'center' }}>
              <button 
                onClick={() => changeMode('login')} 
                className="auth-toggle-link"
                style={{ fontSize: '0.85rem' }}
              >
                Back to Sign In
              </button>
            </div>
          ) : mode === 'signup' ? (
            <div className="auth-toggle-text">
              Already have an account?{' '}
              <button 
                onClick={() => changeMode('login')} 
                className="auth-toggle-link"
              >
                Sign In
              </button>
            </div>
          ) : (
            <div className="auth-toggle-text">
              Don't have an account?{' '}
              <button 
                onClick={() => changeMode('signup')} 
                className="auth-toggle-link"
              >
                Sign Up
              </button>
            </div>
          )}

          {mode !== 'forgot' && (
            <>
              <div className="auth-divider">
                <div className="auth-divider-line"></div>
                <span className="auth-divider-text">or</span>
                <div className="auth-divider-line"></div>
              </div>

              <GoogleButton
                onClick={handleGoogleLogin}
                disabled={isLoading}
                loading={isGoogleLoading}
                label="Continue with Google"
              />
            </>
          )}

          <div style={{ textAlign: 'center', marginTop: '4px' }}>
            <Link to="/" className="auth-back-link">
              <span>←</span> Back to Chat
            </Link>
          </div>
        </div>

      </div>
    </div>
  </div>
);
}
