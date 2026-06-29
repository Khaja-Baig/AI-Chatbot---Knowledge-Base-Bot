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
  const [signupStep, setSignupStep] = useState(1);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const [config, setConfig] = useState({
    counselorName: 'Guru',
    counselorAvatar: '🤖',
    counselorAvatarUrl: undefined
  });

  // Force light theme for guest mode on login page
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    document.body.classList.add('light-theme');
    
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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
      const code = err?.code || '';
      const msg = err?.message || '';
      const isPopupError = 
        code === 'auth/popup-closed-by-user' || 
        code === 'auth/cancelled-popup-request' || 
        code === 'auth/popup-blocked' ||
        msg.includes('popup-blocked') ||
        msg.includes('popup-closed-by-user') ||
        msg.includes('cancelled-popup-request');

      if (!isPopupError) {
        setError(getFriendlyAuthError(err));
      }
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
    setSignupStep(1);
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

  if (isMobile) {
    return (
      <div className="login-page-container">
        <div className="auth-mobile-backdrop" />
        <div className="auth-mobile-card">
          {/* Top-left back button for step navigation (Google style) */}
          {mode === 'signup' && signupStep > 1 && (
            <button 
              type="button" 
              onClick={() => {
                setError('');
                setSignupStep(prev => prev - 1);
              }}
              className="auth-card-back-arrow"
              aria-label="Go back to previous step"
              disabled={isLoading}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
          
          <AuthAssistantHeader
            counselorName={config.counselorName}
            counselorAvatar={config.counselorAvatar}
            counselorAvatarUrl={config.counselorAvatarUrl}
            mode={mode}
            step={mode === 'signup' ? signupStep : undefined}
          />

          {/* Progress dots for mobile signup onboarding */}
          {mode === 'signup' && (
            <div className="auth-step-dots">
              <div className={`auth-step-dot ${signupStep === 1 ? 'active' : ''}`} />
              <div className={`auth-step-dot ${signupStep === 2 ? 'active' : ''}`} />
              <div className={`auth-step-dot ${signupStep === 3 ? 'active' : ''}`} />
            </div>
          )}

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
                  <label htmlFor="forgot-email-mobile" className="auth-label">Email Address</label>
                  <input
                    id="forgot-email-mobile"
                    type="email"
                    placeholder="you@example.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    disabled={isLoading}
                    className="auth-input"
                    required
                    autoComplete="off"
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
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  setError('');
                  if (signupStep === 1) {
                    if (!displayName.trim()) {
                      return setError('Please enter your full name.');
                    }
                    setSignupStep(2);
                  } else if (signupStep === 2) {
                    if (!email.trim()) {
                      return setError('Please enter your email address.');
                    }
                    if (!/\S+@\S+\.\S+/.test(email)) {
                      return setError('Please enter a valid email address.');
                    }
                    setSignupStep(3);
                  } else {
                    handleEmailRegister(e);
                  }
                }} 
                style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
              >
                <div className="auth-wizard-wrapper">
                  {signupStep === 1 && (
                    <div className="auth-step-pane">
                      {/* Full Name */}
                      <div className="auth-input-group">
                        <label htmlFor="reg-name-mobile" className="auth-label">Full Name</label>
                        <input
                          id="reg-name-mobile"
                          type="text"
                          placeholder="John Doe"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          disabled={isLoading}
                          className="auth-input"
                          required
                          autoFocus
                          autoComplete="off"
                        />
                      </div>
                      <button type="submit" className="auth-submit-btn" style={{ width: '100%' }}>
                        Continue
                      </button>
                    </div>
                  )}

                  {signupStep === 2 && (
                    <div className="auth-step-pane">
                      {/* Email */}
                      <div className="auth-input-group">
                        <label htmlFor="reg-email-mobile" className="auth-label">Email Address</label>
                        <input
                          id="reg-email-mobile"
                          type="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          disabled={isLoading}
                          className="auth-input"
                          required
                          autoFocus
                          autoComplete="off"
                        />
                      </div>
                      <button type="submit" className="auth-submit-btn" style={{ width: '100%' }}>
                        Continue
                      </button>
                    </div>
                  )}

                  {signupStep === 3 && (
                    <div className="auth-step-pane" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {/* Password */}
                      <PasswordInput
                        id="reg-password-mobile"
                        label="Password"
                        placeholder="At least 6 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isLoading}
                      />

                      {/* Confirm Password */}
                      <PasswordInput
                        id="reg-confirm-password-mobile"
                        label="Confirm Password"
                        placeholder="Confirm your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={isLoading}
                      />
                      
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="auth-submit-btn"
                        style={{ width: '100%', marginTop: '8px' }}
                      >
                        {isLoading ? 'Creating Account...' : 'Sign Up'}
                      </button>
                    </div>
                  )}
                </div>
              </form>
            ) : (
              <form onSubmit={handleEmailLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Email */}
                <div className="auth-input-group">
                  <label htmlFor="login-email-mobile" className="auth-label">Email Address</label>
                  <input
                    id="login-email-mobile"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    className="auth-input"
                    required
                    autoComplete="off"
                  />
                </div>

                {/* Password */}
                <div className="auth-input-group">
                  <label htmlFor="login-password-mobile" className="auth-label">Password</label>
                  <PasswordInput
                    id="login-password-mobile"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                  />
                  <div className="auth-forgot-link-wrapper">
                    <button
                      type="button"
                      onClick={() => changeMode('forgot')}
                      className="auth-toggle-link"
                    >
                      Forgot password?
                    </button>
                  </div>
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

            <div className="auth-back-link-wrapper">
              <Link to="/" className="auth-back-link">
                <span>←</span> Back to Chat
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page-container" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      height: '100dvh',
      overflowY: 'auto',
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

      <div className={`auth-card-container ${mode === 'signup' ? 'signup-mode' : ''}`} style={{ margin: 'auto' }}>
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
                <label htmlFor="login-password" className="auth-label">Password</label>
                <PasswordInput
                  id="login-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
                <div className="auth-forgot-link-wrapper">
                  <button
                    type="button"
                    onClick={() => changeMode('forgot')}
                    className="auth-toggle-link"
                  >
                    Forgot password?
                  </button>
                </div>
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
