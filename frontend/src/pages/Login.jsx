import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { Sparkles, Shield, User, Lock } from 'lucide-react';

const Login = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login, register } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      showNotification('Please fill in all fields', 'warning');
      return;
    }

    setLoading(true);

    if (isRegister) {
      if (password !== confirmPassword) {
        showNotification('Passwords do not match', 'warning');
        setLoading(false);
        return;
      }

      const res = await register(username, password);
      if (res.success) {
        showNotification('Registration successful! Please login.', 'success');
        setIsRegister(false);
        setPassword('');
        setConfirmPassword('');
      } else {
        showNotification(res.error, 'error');
      }
    } else {
      const res = await login(username, password);
      if (res.success) {
        showNotification('Successfully logged in!', 'success');
        navigate('/');
      } else {
        showNotification(res.error, 'error');
      }
    }
    setLoading(false);
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      width: '100vw',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'var(--bg-primary)',
      background: 'radial-gradient(circle at 10% 20%, var(--primary-light) 0%, transparent 40%), radial-gradient(circle at 90% 80%, rgba(217, 70, 239, 0.08) 0%, transparent 40%)',
      fontFamily: 'var(--font-sans)',
      padding: '20px'
    }}>
      <style>{`
        .login-card {
          width: 100%;
          max-width: 440px;
          padding: 2.5rem;
          border-radius: 16px;
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          backdrop-filter: var(--glass-blur);
          box-shadow: var(--shadow-lg);
          animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .login-logo {
          width: 50px;
          height: 50px;
          border-radius: 12px;
          background: linear-gradient(135deg, var(--primary), var(--accent));
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1.5rem auto;
          box-shadow: 0 4px 10px rgba(99, 102, 241, 0.3);
        }

        .input-group {
          position: relative;
          margin-bottom: 1.25rem;
        }

        .input-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
        }

        .login-input {
          padding-left: 42px !important;
        }
      `}</style>

      <div className="login-card">
        <div className="login-logo">
          <Sparkles size={24} />
        </div>

        <h2 style={{ textAlign: 'center', fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>
          {isRegister ? 'Create Account' : 'Welcome Back'}
        </h2>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem' }}>
          {isRegister ? 'Sign up to access the QA AI platform' : 'Enter credentials to access dashboard'}
        </p>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <User size={18} className="input-icon" />
            <input 
              type="text" 
              placeholder="Username" 
              className="input-field login-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="input-group">
            <Lock size={18} className="input-icon" />
            <input 
              type="password" 
              placeholder="Password" 
              className="input-field login-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          {isRegister && (
            <div className="input-group">
              <Lock size={18} className="input-icon" />
              <input 
                type="password" 
                placeholder="Confirm Password" 
                className="input-field login-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '0.85rem', marginTop: '0.5rem' }}
            disabled={loading}
          >
            {loading ? 'Processing...' : (isRegister ? 'Sign Up' : 'Sign In')}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <button 
            onClick={() => {
              setIsRegister(!isRegister);
              setPassword('');
              setConfirmPassword('');
            }}
            style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}
          >
            {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>

        {!isRegister && (
          <div style={{ 
            marginTop: '2rem', 
            padding: '12px', 
            backgroundColor: 'var(--bg-tertiary)', 
            borderRadius: '8px', 
            border: '1px solid var(--border-color)',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)'
          }}>
            <p style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, marginBottom: '4px' }}>
              <Shield size={14} /> Quick Demo Access:
            </p>
            <p>Username: <strong style={{ color: 'var(--text-primary)' }}>admin</strong></p>
            <p>Password: <strong style={{ color: 'var(--text-primary)' }}>admin123</strong></p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
