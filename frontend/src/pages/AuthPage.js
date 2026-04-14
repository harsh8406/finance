import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function AuthPage({ theme, toggleTheme }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [nameError, setNameError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();

  const dark = theme === 'dark';

  const S = {
    page: {
      minHeight: '100vh',
      background: dark ? '#0A0A0F' : '#F0F2F5',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'DM Sans', sans-serif",
      transition: 'background 0.3s',
    },
    card: {
      background: dark ? 'rgba(255,255,255,0.05)' : '#ffffff',
      border: dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0',
      borderRadius: 20, padding: 40, width: 400,
      boxShadow: dark ? 'none' : '0 8px 32px rgba(0,0,0,0.10)',
      position: 'relative',
    },
    logo: {
      fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 28,
      color: dark ? '#fff' : '#1a1a2e', marginBottom: 4,
    },
    sub: { color: dark ? 'rgba(255,255,255,0.4)' : '#64748b', fontSize: 14, marginBottom: 28 },
    label: {
      display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: 0.8,
      textTransform: 'uppercase', color: dark ? 'rgba(255,255,255,0.4)' : '#64748b', marginBottom: 6,
    },
    input: (hasError) => ({
      width: '100%',
      background: dark ? 'rgba(255,255,255,0.07)' : '#f8fafc',
      border: hasError
        ? '1px solid #FF6B6B'
        : dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
      borderRadius: 10, padding: '11px 14px',
      color: dark ? '#fff' : '#1a1a2e',
      fontSize: 14, fontFamily: "'DM Sans', sans-serif",
      outline: 'none', boxSizing: 'border-box', marginBottom: hasError ? 4 : 16,
    }),
    fieldError: {
      fontSize: 11, color: '#FF6B6B', marginBottom: 12, marginTop: 2,
    },
    passwordWrapper: { position: 'relative', marginBottom: 16 },
    passwordInput: {
      width: '100%',
      background: dark ? 'rgba(255,255,255,0.07)' : '#f8fafc',
      border: dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
      borderRadius: 10, padding: '11px 14px',
      color: dark ? '#fff' : '#1a1a2e',
      fontSize: 14, fontFamily: "'DM Sans', sans-serif",
    },
    btn: {
      width: '100%', background: '#FF6B6B', color: '#fff', border: 'none',
      borderRadius: 10, padding: '12px', fontSize: 15, fontWeight: 600,
      cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", marginTop: 4,
    },
    toggle: {
      textAlign: 'center', marginTop: 20, fontSize: 13,
      color: dark ? 'rgba(255,255,255,0.4)' : '#64748b',
    },
    toggleLink: { color: '#FF6B6B', cursor: 'pointer', fontWeight: 600 },
    error: {
      background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)',
      borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#FF6B6B', marginBottom: 16,
    },
    themeBtn: {
      position: 'absolute', top: 16, right: 16,
      background: dark ? 'rgba(255,255,255,0.08)' : '#f1f5f9',
      border: dark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #e2e8f0',
      borderRadius: 8, padding: '6px 10px', cursor: 'pointer',
      fontSize: 16, lineHeight: 1,
      color: dark ? '#fff' : '#1a1a2e',
      display: 'flex', alignItems: 'center',
    },
  };

  const handleNameChange = (e) => {
    const val = e.target.value;
    // Only allow letters, spaces, apostrophes, hyphens and dots
    if (/^[a-zA-Z\s'.-]*$/.test(val)) {
      setForm(p => ({ ...p, name: val }));
      // Clear error once they start typing valid input
      if (nameError) setNameError('');
    }
    // If they try to type a number or symbol, show error but don't update
    else {
      setNameError('⚠️ Name cannot contain numbers or symbols');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate name on submit too
    if (mode === 'register') {
      if (!form.name.trim()) {
        setNameError('⚠️ Please enter your full name');
        return;
      }
      if (form.name.trim().length < 2) {
        setNameError('⚠️ Name must be at least 2 characters');
        return;
      }
      if (!/^[a-zA-Z\s'.-]+$/.test(form.name.trim())) {
        setNameError('⚠️ Name can only contain letters');
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'login') await login(form.email, form.password);
      else await register(form.name.trim(), form.email, form.password);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.page}>
      <style>{`
        input::-ms-reveal,
        input::-webkit-contacts-auto-fill-button,
        input::-webkit-credentials-auto-fill-button {
          filter: ${dark ? 'invert(1)' : 'invert(0)'} !important;
        }
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@800&family=DM+Sans:wght@300;400;600&display=swap" rel="stylesheet" />
      <div style={S.card}>

        {/* Theme Toggle */}
        <button style={S.themeBtn} onClick={toggleTheme} title="Toggle theme">
          {dark ? '☀️' : '🌙'}
        </button>

        <div style={S.logo}>Penny<span style={{ color: '#FF6B6B' }}>.</span></div>
        <div style={S.sub}>
          {mode === 'login' ? 'Welcome back! Sign in to continue.' : 'Create your account to get started.'}
        </div>

        {error && <div style={S.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <>
              <label style={S.label}>Full Name</label>
              <input
                style={S.input(!!nameError)}
                placeholder="Arjun Sharma"
                value={form.name}
                onChange={handleNameChange}
                required
              />
              {nameError && <div style={S.fieldError}>{nameError}</div>}
            </>
          )}

          <label style={S.label}>Email</label>
          <input
            style={S.input(false)} type="email" placeholder="you@example.com"
            value={form.email}
            onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
            required
          />

          <label style={S.label}>Password</label>
          <div style={S.passwordWrapper}>
            <input
              style={S.passwordInput}
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              required
            />
          </div>

          <button style={{ ...S.btn, opacity: loading ? 0.6 : 1 }} type="submit" disabled={loading}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div style={S.toggle}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <span
            style={S.toggleLink}
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError('');
              setNameError('');
              setShowPassword(false);
            }}
          >
            {mode === 'login' ? 'Register' : 'Sign In'}
          </span>
        </div>
      </div>
    </div>
  );
}