import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function AuthPage({ theme, toggleTheme }) {
  const [mode, setMode]             = useState('login');
  const [form, setForm]             = useState({ name: '', email: '', password: '' });
  const [error, setError]           = useState('');
  const [nameError, setNameError]   = useState('');
  const [emailError, setEmailError] = useState('');
  const [passError, setPassError]   = useState('');
  const [loading, setLoading]       = useState(false);
  const { login, register }         = useAuth();

  const dark = theme === 'dark';

  const validateUsername = (val) => {
    if (val.length === 0) return 'Username is required';
    if (val.length < 4)   return 'Username must be at least 4 characters';
    if (val.length > 20)  return 'Username cannot exceed 20 characters';

    if (!/^[A-Za-z]/.test(val))
      return '⚠️ Username must start with a letter';

    if (/[^A-Za-z0-9\-_.@]/.test(val))
      return '⚠️ Username can only contain letters, numbers and - _ . @';

    // No repeated special characters
    if (/[-]{2,}/.test(val)) return '⚠️ Special characters cannot be repeated — use each only once';
    if (/[_]{2,}/.test(val)) return '⚠️ Special characters cannot be repeated — use each only once';
    if (/[.]{2,}/.test(val)) return '⚠️ Special characters cannot be repeated — use each only once';
    if (/[@]{2,}/.test(val)) return '⚠️ Special characters cannot be repeated — use each only once';

    // No repeated digits
    if (/(\d)\1/.test(val)) return '⚠️ Numbers cannot be repeated — each digit must appear only once';

    // Count occurrences of each special char — max 1 each
    const specials = ['-', '_', '.', '@'];
    for (const s of specials) {
      if ((val.split(s).length - 1) > 1)
        return `⚠️ The character "${s}" can only be used once`;
    }

    return '';
  };

  // ── Email: must end with @gmail.com
  const validateEmail = (val) => {
    if (val.length === 0) return '';
    if (!val.endsWith('@gmail.com'))
      return '⚠️ Enter a valid email address.';
    if (val === '@gmail.com')
      return '⚠️ Enter a valid email address.';
    return '';
  };

  // ── Password rules
  const validatePassword = (pass) => {
    if (pass.length === 0) return '';
    if (pass.length < 6)   return 'Password must be at least 6 characters';
    if (pass.length > 32)  return 'Password cannot exceed 32 characters';
    if (/\s/.test(pass))   return '⚠️ Password cannot contain spaces';
    if (/(.)\1{2,}/.test(pass))
      return '⚠️ Password cannot have the same character repeated 3 or more times in a row';
    return '';
  };

  const handleNameChange = (val) => {
    setForm(p => ({ ...p, name: val }));
    setNameError(val.length > 0 ? validateUsername(val) : '');
  };

  const handleEmailChange = (val) => {
    setForm(p => ({ ...p, email: val }));
    setEmailError(val.length > 0 ? validateEmail(val) : '');
  };

  const handlePassChange = (val) => {
    setForm(p => ({ ...p, password: val }));
    if (mode === 'register') setPassError(val.length > 0 ? validatePassword(val) : '');
  };

  const S = {
    page: {
      minHeight: '100vh',
      background: dark ? '#0A0A0F' : '#F0F2F5',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'DM Sans', sans-serif", transition: 'background 0.3s',
    },
    card: {
      background: dark ? 'rgba(255,255,255,0.05)' : '#ffffff',
      border: dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0',
      borderRadius: 20, padding: 40, width: 420,
      boxShadow: dark ? 'none' : '0 8px 32px rgba(0,0,0,0.10)',
      position: 'relative',
    },
    logo: {
      fontFamily: "'Space Grotesk', sans-serif",
      fontWeight: 700, fontSize: 32, letterSpacing: '-1px',
      color: dark ? '#ffffff' : '#0f172a',
      marginBottom: 4,
    },
    sub: { color: dark ? 'rgba(255,255,255,0.4)' : '#64748b', fontSize: 14, marginBottom: 28 },
    label: {
      display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: dark ? 'rgba(255,255,255,0.4)' : '#64748b', marginBottom: 6,
    },
    input: (err) => ({
      width: '100%',
      background: dark ? 'rgba(255,255,255,0.07)' : '#f8fafc',
      border: err ? '1px solid #FF6B6B' : dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
      borderRadius: 10, padding: '11px 14px',
      color: dark ? '#fff' : '#1a1a2e',
      fontSize: 14, fontFamily: "'DM Sans', sans-serif",
      outline: 'none', boxSizing: 'border-box', marginBottom: 4,
    }),
    btn: {
      width: '100%', background: '#FF6B6B', color: '#fff', border: 'none',
      borderRadius: 10, padding: '12px', fontSize: 15, fontWeight: 600,
      cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", marginTop: 12,
    },
    toggle: { textAlign: 'center', marginTop: 20, fontSize: 13, color: dark ? 'rgba(255,255,255,0.4)' : '#64748b' },
    toggleLink: { color: '#FF6B6B', cursor: 'pointer', fontWeight: 600 },
    errorBox: {
      background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)',
      borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#FF6B6B', marginBottom: 16,
    },
    fieldErr: { fontSize: 12, color: '#FF6B6B', marginTop: 4, marginBottom: 12, lineHeight: 1.5 },
    themeBtn: {
      position: 'absolute', top: 16, right: 16,
      background: dark ? 'rgba(255,255,255,0.08)' : '#f1f5f9',
      border: dark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #e2e8f0',
      borderRadius: 8, padding: '6px 10px', cursor: 'pointer',
      fontSize: 16, lineHeight: 1, color: dark ? '#1a1a2e' : '#1a1a2e',
      display: 'flex', alignItems: 'center',
    },
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (mode === 'register') {
      const ne = validateUsername(form.name);
      const ee = validateEmail(form.email);
      const pe = validatePassword(form.password);
      if (ne) { setNameError(ne); return; }
      if (ee) { setEmailError(ee); return; }
      if (pe) { setPassError(pe); return; }
    } else {
      const ee = validateEmail(form.email);
      if (ee) { setEmailError(ee); return; }
    }
    setLoading(true);
    try {
      if (mode === 'login') await login(form.email, form.password);
      else await register(form.name.trim(), form.email, form.password);
    } catch (err) {
      const data = err.response?.data;
      if (data?.errors?.length > 0) setError(data.errors.map(e => e.msg).join(' · '));
      else setError(data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.page}>
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=DM+Sans:wght@300;400;600&display=swap" rel="stylesheet" />
      <div style={S.card}>
        <button style={S.themeBtn} onClick={toggleTheme}>{dark ? '☀️' : '🌙'}</button>

        <div style={S.logo}>
          <span style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            color: dark ? '#ffffff' : '#0f172a',
          }}>
            Penny
          </span>
        </div>

        <div style={S.sub}>
          {mode === 'login' ? 'Welcome back! Sign in to continue.' : 'Create your account to get started.'}
        </div>
        {error && <div style={S.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit}>

          {/* ── Username ── */}
          {mode === 'register' && (
            <>
              <label style={S.label}>User Name</label>
              <input
                style={S.input(!!nameError)}
                placeholder="max@123"
                value={form.name}
                onChange={e => handleNameChange(e.target.value)}
                maxLength={20}
                required
              />
              {nameError && <div style={S.fieldErr}>{nameError}</div>}
            </>
          )}

          {/* ── Email ── */}
          <label style={S.label}>Email</label>
          <input
            style={{ ...S.input(!!emailError), marginBottom: emailError ? 4 : 16 }}
            type="text"
            placeholder="yourname@gmail.com"
            value={form.email}
            onChange={e => handleEmailChange(e.target.value)}
            required
          />
          {emailError && <div style={S.fieldErr}>{emailError}</div>}

          {/* ── Password ── */}
          <label style={S.label}>Password</label>
          <input
            style={{ ...S.input(!!passError), marginBottom: passError ? 4 : 8 }}
            type="password"
            placeholder="••••••••"
            value={form.password}
            onChange={e => handlePassChange(e.target.value)}
            maxLength={33}
            required
          />
          {mode === 'register' && passError && (
            <div style={S.fieldErr}>{passError}</div>
          )}

          <button style={{ ...S.btn, opacity: loading ? 0.6 : 1 }} type="submit" disabled={loading}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div style={S.toggle}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <span style={S.toggleLink} onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setError(''); setNameError(''); setEmailError(''); setPassError('');
            setForm({ name: '', email: '', password: '' });
          }}>
            {mode === 'login' ? 'Register' : 'Sign In'}
          </span>
        </div>
      </div>
    </div>
  );
}