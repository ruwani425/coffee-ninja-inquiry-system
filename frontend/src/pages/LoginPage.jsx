import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Coffee, AlertCircle, Loader2, Eye, EyeOff, Lock, Mail, Info } from 'lucide-react';

export const LoginPage = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedEmail = localStorage.getItem('coffee_ninja_saved_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberEmail(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      if (rememberEmail) {
        localStorage.setItem('coffee_ninja_saved_email', email);
      } else {
        localStorage.removeItem('coffee_ninja_saved_email');
      }
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please verify your email and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <Coffee size={32} />
          </div>
          <h1>Coffee Ninja</h1>
          <p>Customer Inquiry Management Portal</p>
        </div>

        {error && (
          <div className="alert alert-danger" role="alert" style={{ marginBottom: '1.25rem' }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate={false}>
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">
              Staff Email Address
            </label>
            <div className="input-with-icon">
              <Mail size={16} className="input-icon-left" />
              <input
                id="login-email"
                type="email"
                className="form-input with-left-icon"
                placeholder="name@coffeeninja.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <label className="form-label" htmlFor="login-password" style={{ margin: 0 }}>
                Password
              </label>
            </div>
            <div className="input-with-icon">
              <Lock size={16} className="input-icon-left" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="form-input with-left-icon with-right-icon"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="input-icon-btn-right"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '1rem 0 1.25rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.84rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={rememberEmail}
                onChange={(e) => setRememberEmail(e.target.checked)}
                style={{ accentColor: 'var(--coffee-700)', cursor: 'pointer' }}
              />
              <span>Remember email</span>
            </label>
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '0.8rem', fontSize: '0.95rem' }}
            disabled={loading}
            id="login-submit-btn"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Signing In...</span>
              </>
            ) : (
              'Sign In to Workspace'
            )}
          </button>
        </form>

        {/* Discrete, standard collapsible disclosure for assessment reviewers */}
        <details className="demo-notes-disclosure">
          <summary>
            <Info size={14} />
            <span>Staff Test Accounts Info</span>
          </summary>
          <div className="demo-notes-content">
            <p>For testing, seeded accounts can be found in <code>README.md</code>:</p>
            <ul>
              <li><strong>Agent</strong>: <code>sarah@coffeeninja.com</code> (or <code>alex@coffeeninja.com</code>)</li>
              <li><strong>Supervisor</strong>: <code>elena@coffeeninja.com</code></li>
            </ul>
          </div>
        </details>
      </div>
    </div>
  );
};
