import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Coffee, AlertCircle, Loader2, KeyRound } from 'lucide-react';

export const LoginPage = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const setPresetUser = (presetEmail, presetPass) => {
    setEmail(presetEmail);
    setPassword(presetPass);
    setError('');
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
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">
              Staff Email Address
            </label>
            <input
              id="login-email"
              type="email"
              className="form-input"
              placeholder="e.g. sarah@coffeeninja.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              className="form-input"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}
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

        {/* Evaluation Helper: Quick Seeded Accounts Switcher */}
        <div className="preset-accounts">
          <div className="preset-title">⚡ Quick Fill Seeded Accounts for Testing</div>
          <div className="preset-buttons">
            <button
              type="button"
              className="preset-btn"
              onClick={() => setPresetUser('sarah@coffeeninja.com', 'NinjaPass123!')}
              id="preset-sarah"
            >
              <span className="name">Sarah Jenkins</span>
              <span className="role">Agent (Specialist)</span>
            </button>

            <button
              type="button"
              className="preset-btn"
              onClick={() => setPresetUser('alex@coffeeninja.com', 'NinjaPass123!')}
              id="preset-alex"
            >
              <span className="name">Alex Rivera</span>
              <span className="role">Agent (Specialist)</span>
            </button>

            <button
              type="button"
              className="preset-btn"
              onClick={() => setPresetUser('elena@coffeeninja.com', 'NinjaBoss123!')}
              id="preset-elena"
              style={{ gridColumn: 'span 2' }}
            >
              <span className="name">Elena Rostova</span>
              <span className="role">Supervisor (Full Team Access)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
