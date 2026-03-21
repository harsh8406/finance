import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';

function AppInner({ theme, toggleTheme }) {
  const { user, loading } = useAuth();

  if (loading) return (
    <div style={{
      minHeight: '100vh',
      background: theme === 'dark' ? '#0A0A0F' : '#F0F2F5',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: theme === 'dark' ? '#fff' : '#1a1a2e',
      fontFamily: "'DM Sans', sans-serif",
      fontSize: 15,
      transition: 'background 0.3s',
    }}>
      Loading...
    </div>
  );

  return user
    ? <Dashboard theme={theme} toggleTheme={toggleTheme} />
    : <AuthPage theme={theme} toggleTheme={toggleTheme} />;
}

export default function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('penny-theme') || 'dark';
  });

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('penny-theme', next);
      return next;
    });
  };

  return (
    <AuthProvider>
      <AppInner theme={theme} toggleTheme={toggleTheme} />
    </AuthProvider>
  );
}
