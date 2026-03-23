import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const CATEGORIES = [
  { id: 'food',          label: 'Food & Dining',     icon: '🍜', color: '#FF6B6B' },
  { id: 'transport',     label: 'Transport',          icon: '🚇', color: '#4ECDC4' },
  { id: 'shopping',      label: 'Shopping',           icon: '🛍️', color: '#FFE66D' },
  { id: 'health',        label: 'Health',             icon: '💊', color: '#A8E6CF' },
  { id: 'entertainment', label: 'Entertainment',      icon: '🎬', color: '#C3B1E1' },
  { id: 'bills',         label: 'Bills & Utilities',  icon: '⚡', color: '#F7B731' },
  { id: 'education',     label: 'Education',          icon: '📚', color: '#74B9FF' },
  { id: 'other',         label: 'Other',              icon: '📦', color: '#AAAAAA' },
];

const formatINR = (val) => '₹' + Number(val).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const getCat = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[7];

// ── Budget Alert Toast ────────────────────────────────────────────────────────
function BudgetAlert({ dark, totalSpent, budget, onClose }) {
  const over = totalSpent - budget;
  const pct  = budget > 0 ? (totalSpent / budget) * 100 : 0;

  return (
    <div style={{
      position: 'fixed', top: 24, right: 24, zIndex: 1000,
      width: 340, borderRadius: 16,
      background: dark ? '#1a0a0a' : '#fff5f5',
      border: '1px solid rgba(255,107,107,0.4)',
      boxShadow: '0 8px 32px rgba(255,107,107,0.2)',
      padding: '18px 20px', fontFamily: "'DM Sans', sans-serif",
      animation: 'slideIn 0.3s ease',
    }}>
      <style>{`@keyframes slideIn { from { transform: translateX(120%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ fontSize: 28, lineHeight: 1 }}>🚨</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#FF6B6B', marginBottom: 4 }}>
            Budget Exceeded!
          </div>
          <div style={{ fontSize: 13, color: dark ? 'rgba(255,255,255,0.7)' : '#64748b', lineHeight: 1.5 }}>
            You've spent {formatINR(totalSpent)} against a budget of {formatINR(budget)}.{' '}
            You are <span style={{ color: '#FF6B6B', fontWeight: 700 }}>{formatINR(over)}</span> over budget.
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#FF6B6B', lineHeight: 1, padding: 0 }}>✕</button>
      </div>
      <div style={{ marginTop: 12, height: 4, background: 'rgba(255,107,107,0.2)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: '100%', background: '#FF6B6B', borderRadius: 2 }} />
      </div>
      <div style={{ marginTop: 8, fontSize: 11, color: '#FF6B6B', fontWeight: 600 }}>
        {pct.toFixed(0)}% of budget used
      </div>
    </div>
  );
}

// ── SMS Import Toast ──────────────────────────────────────────────────────────
function SmsToast({ dark, onConfirm, onDelete }) {
  const [pending,  setPending]  = useState(null);
  const [editing,  setEditing]  = useState(false);
  const [form,     setForm]     = useState({});
  const [checking, setChecking] = useState(false);

  const S = useMemo(() => {
    const bg     = dark ? '#1a1a2e' : '#ffffff';
    const border = dark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #e2e8f0';
    const text   = dark ? '#ffffff' : '#1a1a2e';
    const muted  = dark ? 'rgba(255,255,255,0.45)' : '#64748b';
    const inputBg= dark ? 'rgba(255,255,255,0.07)' : '#f8fafc';
    const inputBd= dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0';
    return { bg, border, text, muted, inputBg, inputBd };
  }, [dark]);

  useEffect(() => {
    const check = async () => {
      if (pending || checking) return;
      setChecking(true);
      try {
        const res = await api.get('/expenses?sortBy=date&order=desc');
        const smsExp = res.data.find(e => e.note?.startsWith('Auto-imported'));
        if (smsExp) {
          setPending(smsExp);
          setForm({ title: smsExp.title, amount: smsExp.amount, category: smsExp.category });
        }
      } catch {}
      finally { setChecking(false); }
    };
    check();
    const iv = setInterval(check, 10000);
    return () => clearInterval(iv);
  }, [pending]);

  if (!pending) return null;
  const cat = getCat(form.category);

  const confirm = async () => {
    try {
      await api.put(`/expenses/${pending._id}`, { ...form, amount: Number(form.amount), note: 'SMS import — confirmed' });
      setPending(null);
      onConfirm?.();
    } catch (err) { alert(err.response?.data?.message || 'Could not save'); }
  };

  const remove = async () => {
    await api.delete(`/expenses/${pending._id}`);
    setPending(null);
    onDelete?.();
  };

  return (
    <div style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 999, width: 320, background: S.bg, border: S.border, borderRadius: 18, boxShadow: '0 12px 40px rgba(0,0,0,0.25)', padding: '18px 20px', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ fontSize: 26 }}>{cat.icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: S.text }}>New payment detected</div>
          <div style={{ fontSize: 11, color: S.muted }}>via SMS auto-import</div>
        </div>
        <button onClick={() => setPending(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: S.muted, lineHeight: 1 }}>✕</button>
      </div>

      {editing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
          <input style={{ padding: '8px 12px', borderRadius: 8, background: S.inputBg, border: S.inputBd, color: S.text, fontSize: 13 }} value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Merchant name" />
          <input style={{ padding: '8px 12px', borderRadius: 8, background: S.inputBg, border: S.inputBd, color: S.text, fontSize: 13 }} type="number" min="1" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder="Amount" />
          <select style={{ padding: '8px 12px', borderRadius: 8, background: dark ? '#1e1e2e' : '#f8fafc', border: S.inputBd, color: dark ? '#ffffff' : '#1a1a2e', fontSize: 13 }} value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
            {CATEGORIES.map(c => (<option key={c.id} value={c.id} style={{ background: dark ? '#1e1e2e' : '#ffffff', color: dark ? '#ffffff' : '#1a1a2e' }}>{c.icon} {c.label}</option>))}
          </select>
        </div>
      ) : (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontWeight: 600, fontSize: 15, color: S.text, marginBottom: 2 }}>{form.title}</div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 24, color: '#FF6B6B', marginBottom: 4 }}>{formatINR(form.amount)}</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: cat.color + '22', color: cat.color, borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>{cat.icon} {cat.label}</div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={remove} style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(255,107,107,0.1)', border: 'none', color: '#FF6B6B', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>🗑</button>
        <button onClick={() => setEditing(e => !e)} style={{ padding: '8px 12px', borderRadius: 8, background: dark ? 'rgba(255,255,255,0.08)' : '#f1f5f9', border: 'none', color: S.muted, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>{editing ? 'Preview' : '✏️ Edit'}</button>
        <button onClick={confirm} style={{ flex: 1, padding: '8px 0', borderRadius: 8, background: '#FF6B6B', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>✅ Confirm</button>
      </div>
    </div>
  );
}

// ── Donut Chart ───────────────────────────────────────────────────────────────
function DonutChart({ segments, size = 120, dark }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return <div style={{ width: size, height: size }} />;
  let cum = 0;
  const r = 40, cx = 60, cy = 60, stroke = 16;
  const paths = segments.map((seg) => {
    const pct = seg.value / total;
    const s = cum * 2 * Math.PI - Math.PI / 2;
    cum += pct;
    const e = cum * 2 * Math.PI - Math.PI / 2;
    return { d: `M ${cx + r * Math.cos(s)} ${cy + r * Math.sin(s)} A ${r} ${r} 0 ${pct > 0.5 ? 1 : 0} 1 ${cx + r * Math.cos(e)} ${cy + r * Math.sin(e)}`, color: seg.color };
  });
  return (
    <svg width={size} height={size} viewBox="0 0 120 120">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'} strokeWidth={stroke} />
      {paths.map((p, i) => (<path key={i} d={p.d} fill="none" stroke={p.color} strokeWidth={stroke} strokeLinecap="butt" />))}
    </svg>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
function makeStyles(dark) {
  const bg            = dark ? '#0A0A0F'                         : '#F0F2F5';
  const surface       = dark ? 'rgba(255,255,255,0.05)'          : '#ffffff';
  const surfaceBorder = dark ? '1px solid rgba(255,255,255,0.07)': '1px solid #e2e8f0';
  const text          = dark ? '#ffffff'                         : '#1a1a2e';
  const textMuted     = dark ? 'rgba(255,255,255,0.4)'           : '#64748b';
  const inputBg       = dark ? 'rgba(255,255,255,0.07)'          : '#f8fafc';
  const inputBorder   = dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0';
  const rowBg         = dark ? 'rgba(255,255,255,0.04)'          : '#f8fafc';
  const rowBorder     = dark ? '1px solid rgba(255,255,255,0.05)': '1px solid #e2e8f0';
  const btnSecBg      = dark ? 'rgba(255,255,255,0.08)'          : '#f1f5f9';
  const btnSecColor   = dark ? 'rgba(255,255,255,0.7)'           : '#475569';
  const btnSecBorder  = dark ? 'none'                            : '1px solid #e2e8f0';
  const sidebarBg     = dark ? 'rgba(255,255,255,0.03)'          : '#ffffff';
  const sidebarBorder = dark ? '1px solid rgba(255,255,255,0.07)': '1px solid #e2e8f0';
  const overlayCard   = dark ? '#111118'                         : '#ffffff';
  const overlayBorder = dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0';
  const labelColor    = dark ? 'rgba(255,255,255,0.4)'           : '#64748b';
  const progressTrack = dark ? 'rgba(255,255,255,0.1)'           : '#e2e8f0';
  return {
    app:         { fontFamily:"'Inter', sans-serif", background: bg, minHeight: '100vh', color: text, display: 'flex', transition: 'background 0.3s, color 0.3s' },
    sidebar:     { width: 220, background: sidebarBg, borderRight: sidebarBorder, display: 'flex', flexDirection: 'column', padding: '32px 0', flexShrink: 0, transition: 'background 0.3s' },
    logo:        { fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: 20, padding: '0 24px 32px', letterSpacing: '-0.5px', color: text },
    navItem: (a) => ({ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 24px', cursor: 'pointer', borderLeft: a ? '2px solid #FF6B6B' : '2px solid transparent', background: a ? 'rgba(255,107,107,0.08)' : 'transparent', color: a ? '#FF6B6B' : textMuted, fontSize: 14, fontWeight: 500, transition: 'all 0.2s', marginBottom: 2 }),
    main:        { flex: 1, overflow: 'auto', padding: '32px', maxHeight: '100vh' },
    pageHeader:  { fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 28, marginBottom: 4, color: text },
    sub:         { color: textMuted, fontSize: 13, marginBottom: 28 },
    grid:        { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: 16, marginBottom: 24 },
    card:        { background: surface, borderRadius: 16, padding: 20, border: surfaceBorder, transition: 'background 0.3s' },
    cardLabel:   { fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: labelColor, marginBottom: 8 },
    row:         { display: 'flex', gap: 16, marginBottom: 24 },
    expRow:      { display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: rowBg, borderRadius: 12, marginBottom: 8, border: rowBorder, transition: 'background 0.3s' },
    pill: (c)   => ({ background: c + '22', color: c, borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600 }),
    btn: (p)    => ({ background: p ? '#FF6B6B' : btnSecBg, color: p ? '#fff' : btnSecColor, border: p ? 'none' : btnSecBorder, borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s' }),
    formOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
    formCard:    { background: overlayCard, borderRadius: 20, padding: 32, width: 440, border: overlayBorder, boxShadow: '0 24px 64px rgba(0,0,0,0.3)' },
    label:       { fontSize: 11, fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase', color: labelColor, marginBottom: 6, display: 'block' },
    input:       { width: '100%', background: inputBg, border: inputBorder, borderRadius: 10, padding: '11px 14px', color: text, fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: 'none', boxSizing: 'border-box' },
    progressBar: { height: 6, background: progressTrack, borderRadius: 3, overflow: 'hidden', marginTop: 10 },
    text, textMuted, surface, surfaceBorder, inputBg, inputBorder, dark,
  };
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard({ theme, toggleTheme }) {
  const { user, logout } = useAuth();
  const dark = theme === 'dark';
  const S = useMemo(() => makeStyles(dark), [dark]);

  const [view,             setView]           = useState('dashboard');
  const [expenses,         setExpenses]       = useState([]);
  const [budget,           setBudget]         = useState(15000);
  const [analytics,        setAnalytics]      = useState(null);
  const [filterCat,        setFilterCat]      = useState('all');
  const [sortBy,           setSortBy]         = useState('date');
  const [showForm,         setShowForm]       = useState(false);
  const [editId,           setEditId]         = useState(null);
  const [loading,          setLoading]        = useState(false);
  const [amountError,      setAmountError]    = useState('');
  const [showBudgetAlert,  setShowBudgetAlert]= useState(false);
  const prevTotalRef = useRef(0);

  const [form, setForm] = useState({
    title: '', amount: '', category: 'food',
    date: new Date().toISOString().slice(0, 10), note: '',
  });

  const now   = new Date();
  const month = now.getMonth() + 1;
  const year  = now.getFullYear();
  const maxDate    = now.toISOString().slice(0, 10);
  const minDateObj = new Date(now);
  minDateObj.setDate(minDateObj.getDate() - 5);
  const minDate = minDateObj.toISOString().slice(0, 10);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [expRes, budRes, anaRes] = await Promise.all([
        api.get(`/expenses?month=${month}&year=${year}&sortBy=${sortBy}`),
        api.get(`/budget?month=${month}&year=${year}`),
        api.get(`/expenses/analytics?month=${month}&year=${year}`),
      ]);
      setExpenses(expRes.data);
      setBudget(budRes.data.amount);
      setAnalytics(anaRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [month, year, sortBy]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const totalSpent    = analytics?.total || 0;
  const remaining     = budget - totalSpent;
  const budgetPct     = Math.min(100, (totalSpent / budget) * 100);
  const progressColor = (p) => p > 85 ? '#FF6B6B' : p > 60 ? '#FFE66D' : '#4ECDC4';

  // ── Trigger budget alert when total crosses budget threshold ──
  useEffect(() => {
    if (totalSpent === 0 || budget === 0) return;
    const prev = prevTotalRef.current;
    if (totalSpent >= budget && prev < budget && prev !== 0) {
      setShowBudgetAlert(true);
    }
    prevTotalRef.current = totalSpent;
  }, [totalSpent, budget]);

  const filtered = useMemo(() =>
    filterCat === 'all' ? expenses : expenses.filter(e => e.category === filterCat),
    [expenses, filterCat]);

  const topCategories = useMemo(() => {
    if (!analytics?.byCategory) return [];
    return CATEGORIES.map(c => ({ ...c, total: analytics.byCategory[c.id] || 0 }))
      .filter(c => c.total > 0).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [analytics]);

  const openAdd = () => {
    setEditId(null); setAmountError('');
    setForm({ title: '', amount: '', category: 'food', date: maxDate, note: '' });
    setShowForm(true);
  };

  const handleEdit = (e) => {
    setAmountError('');
    setForm({ title: e.title, amount: String(e.amount), category: e.category, date: e.date?.slice(0, 10) || maxDate, note: e.note || '' });
    setEditId(e._id); setShowForm(true); setView('expenses');
  };

  const handleSubmit = async () => {
    setAmountError('');
    if (!form.title.trim()) { alert('Please enter a title.'); return; }
    const amt = Number(form.amount);
    if (!form.amount || amt < 1) { setAmountError('⚠️ Amount must be at least ₹1'); return; }
    if (form.date < minDate || form.date > maxDate) { alert(`Date must be within the last 5 days. Future dates are not allowed.`); return; }
    try {
      if (editId) { await api.put(`/expenses/${editId}`, { ...form, amount: amt }); }
      else { await api.post('/expenses', { ...form, amount: amt }); }
      setShowForm(false); setEditId(null); setAmountError('');
      setForm({ title: '', amount: '', category: 'food', date: maxDate, note: '' });
      await fetchAll();
    } catch (err) { alert(err.response?.data?.message || 'Error saving expense'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    await api.delete(`/expenses/${id}`); fetchAll();
  };

  const handleBudgetUpdate = async (val) => {
    setBudget(val);
    await api.put('/budget', { month, year, amount: val });
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Poppins:wght@500;600;700&display=swap" rel="stylesheet" />
      <div style={S.app}>

        {/* ── SIDEBAR ── */}
        <div style={S.sidebar}>
          <div style={S.logo}>Penny<span style={{ color: '#FF6B6B' }}>.</span></div>
          {[
            { id: 'dashboard', icon: '⬡', label: 'Dashboard' },
            { id: 'expenses',  icon: '◈', label: 'Expenses' },
            { id: 'analytics', icon: '◉', label: 'Analytics' },
            { id: 'budget',    icon: '◎', label: 'Budget' },
          ].map(n => (
            <div key={n.id} style={S.navItem(view === n.id)} onClick={() => setView(n.id)}>
              <span>{n.icon}</span> {n.label}
            </div>
          ))}
          <div style={{ flex: 1 }} />
          <div style={{ padding: '0 16px', marginBottom: 12 }}>
            <button onClick={toggleTheme} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: dark ? 'rgba(255,255,255,0.07)' : '#f1f5f9', border: dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0', borderRadius: 10, padding: '9px 0', cursor: 'pointer', color: dark ? 'rgba(255,255,255,0.7)' : '#475569', fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", transition: 'all 0.2s' }}>
              {dark ? '☀️ Light Mode' : '🌙 Dark Mode'}
            </button>
          </div>
          <div style={{ padding: '0 24px', marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: S.textMuted, marginBottom: 4 }}>👤 {user?.name}</div>
            <div style={{ fontSize: 20, fontFamily: "'Syne', sans-serif", fontWeight: 700, color: S.text }}>{formatINR(totalSpent)}</div>
            <div style={{ fontSize: 11, color: S.textMuted }}>spent this month</div>
          </div>
          <button style={{ ...S.btn(false), margin: '0 16px', justifyContent: 'center' }} onClick={logout}>Sign Out</button>
        </div>

        {/* ── MAIN ── */}
        <div style={S.main}>
          {loading && <div style={{ color: S.textMuted, fontSize: 13, marginBottom: 16 }}>Loading...</div>}

          {/* ── DASHBOARD ── */}
          {view === 'dashboard' && (
            <div>
              <div style={S.pageHeader}>Good {now.getHours() < 12 ? 'morning' : now.getHours() < 18 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0]} 👋</div>
              <div style={S.sub}>Your financial overview for {now.toLocaleString('default', { month: 'long' })} {year}</div>

              {/* Inline budget exceeded banner */}
              {totalSpent >= budget && budget > 0 && (
                <div style={{ marginBottom: 20, padding: '14px 18px', borderRadius: 12, background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.35)', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 22 }}>🚨</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#FF6B6B' }}>Budget Exceeded</div>
                    <div style={{ fontSize: 12, color: S.textMuted, marginTop: 2 }}>You are {formatINR(totalSpent - budget)} over your {formatINR(budget)} budget this month.</div>
                  </div>
                  <button onClick={() => setView('budget')} style={{ ...S.btn(true), padding: '6px 14px', fontSize: 12 }}>Review</button>
                </div>
              )}

              <div style={S.grid}>
                {[
                  { label: 'Total Spent',   value: formatINR(totalSpent),                        sub: `${analytics?.count || 0} transactions`,          color: '#FF6B6B' },
                  { label: 'Remaining',     value: formatINR(Math.max(0, remaining)),             sub: remaining < 0 ? 'Over budget!' : `${(100 - budgetPct).toFixed(0)}% left`, color: remaining < 0 ? '#FF6B6B' : '#4ECDC4' },
                  { label: 'Daily Average', value: formatINR(analytics?.avgPerDay || 0),          sub: 'this month',                                     color: '#FFE66D' },
                  { label: 'Top Category',  value: topCategories[0] ? `${topCategories[0].icon} ${topCategories[0].label.split(' ')[0]}` : '—', sub: topCategories[0] ? formatINR(topCategories[0].total) : '—', color: '#C3B1E1' },
                ].map((c, i) => (
                  <div key={i} style={S.card}>
                    <div style={S.cardLabel}>{c.label}</div>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 22, color: c.color }}>{c.value}</div>
                    <div style={{ fontSize: 12, color: S.textMuted, marginTop: 4 }}>{c.sub}</div>
                  </div>
                ))}
              </div>

              <div style={S.row}>
                <div style={{ ...S.card, flex: 1 }}>
                  <div style={S.cardLabel}>Budget Health</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 8 }}>
                    <div style={{ position: 'relative' }}>
                      <DonutChart dark={dark} size={100} segments={[
                        { color: budgetPct >= 100 ? '#FF6B6B' : budgetPct > 85 ? '#FFE66D' : '#4ECDC4', value: totalSpent },
                        { color: dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)', value: Math.max(0, budget - totalSpent) },
                      ]} />
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, fontFamily: "'Syne', sans-serif", color: S.text }}>{budgetPct.toFixed(0)}%</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 13, color: S.textMuted }}>Budget: {formatINR(budget)}</div>
                      <div style={{ fontSize: 13, color: '#FF6B6B', marginTop: 4 }}>Spent: {formatINR(totalSpent)}</div>
                      <div style={{ fontSize: 13, color: remaining < 0 ? '#FF6B6B' : '#4ECDC4', marginTop: 4 }}>
                        {remaining < 0 ? `Over: ${formatINR(Math.abs(remaining))}` : `Left: ${formatINR(remaining)}`}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ ...S.card, flex: 1.5 }}>
                  <div style={S.cardLabel}>By Category</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                    <DonutChart dark={dark} size={90} segments={topCategories.map(c => ({ color: c.color, value: c.total }))} />
                    <div style={{ flex: 1 }}>
                      {topCategories.slice(0, 4).map(c => (
                        <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <div style={{ width: 8, height: 8, borderRadius: 2, background: c.color }} />
                            <span style={{ fontSize: 12, color: S.textMuted }}>{c.label.split(' ')[0]}</span>
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 600, color: S.text }}>{formatINR(c.total)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: S.text }}>Recent Transactions</div>
                <button style={S.btn(false)} onClick={() => setView('expenses')}>View all →</button>
              </div>
              {expenses.slice(0, 4).map((e) => {
                const cat = getCat(e.category);
                return (
                  <div key={e._id} style={S.expRow}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: cat.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{cat.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, fontSize: 14, color: S.text }}>{e.title}</div>
                      <div style={{ fontSize: 11, color: S.textMuted }}>{e.date?.slice(0, 10)}{e.note ? ' · ' + e.note : ''}</div>
                    </div>
                    <div style={S.pill(cat.color)}>{cat.label.split(' ')[0]}</div>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, color: '#FF6B6B' }}>{formatINR(e.amount)}</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── EXPENSES ── */}
          {view === 'expenses' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <div><div style={S.pageHeader}>Expenses</div><div style={S.sub}>{filtered.length} transactions</div></div>
                <button style={S.btn(true)} onClick={openAdd}>+ Add Expense</button>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                {[{ id: 'all', label: 'All', icon: '' }, ...CATEGORIES].map(c => (
                  <button key={c.id} onClick={() => setFilterCat(c.id)} style={{ ...S.btn(filterCat === c.id), padding: '7px 14px', fontSize: 12 }}>{c.icon} {c.label?.split(' ')[0] || c.label}</button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: S.textMuted }}>Sort:</span>
                {['date', 'amount', 'title'].map(s => (
                  <button key={s} onClick={() => setSortBy(s)} style={{ ...S.btn(sortBy === s), padding: '5px 12px', fontSize: 12 }}>{s.charAt(0).toUpperCase() + s.slice(1)}</button>
                ))}
              </div>
              {filtered.map((e) => {
                const cat = getCat(e.category);
                return (
                  <div key={e._id} style={S.expRow}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: cat.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{cat.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, fontSize: 14, color: S.text }}>{e.title}</div>
                      <div style={{ fontSize: 11, color: S.textMuted }}>{e.date?.slice(0, 10)}{e.note ? ' · ' + e.note : ''}</div>
                    </div>
                    <div style={S.pill(cat.color)}>{cat.label.split(' ')[0]}</div>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, minWidth: 80, textAlign: 'right', color: '#FF6B6B' }}>{formatINR(e.amount)}</div>
                    <button onClick={() => handleEdit(e)} style={{ ...S.btn(false), padding: '6px 10px' }}>✏️</button>
                    <button onClick={() => handleDelete(e._id)} style={{ ...S.btn(false), padding: '6px 10px', color: '#FF6B6B' }}>🗑</button>
                  </div>
                );
              })}
              {filtered.length === 0 && <div style={{ textAlign: 'center', padding: '40px', color: S.textMuted, fontSize: 13 }}>No expenses in this category</div>}
            </div>
          )}

          {/* ── ANALYTICS ── */}
          {view === 'analytics' && analytics && (
            <div>
              <div style={S.pageHeader}>Analytics</div>
              <div style={S.sub}>Your spending patterns this month</div>
              <div style={S.card}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, marginBottom: 18, color: S.text }}>Category Breakdown</div>
                {CATEGORIES.map(c => {
                  const total = analytics.byCategory?.[c.id] || 0;
                  if (!total) return null;
                  const pct = analytics.total > 0 ? (total / analytics.total) * 100 : 0;
                  return (
                    <div key={c.id} style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
                          <span>{c.icon}</span><span style={{ fontWeight: 500, color: S.text }}>{c.label}</span>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: c.color }}>{formatINR(total)} <span style={{ color: S.textMuted, fontWeight: 400 }}>({pct.toFixed(1)}%)</span></div>
                      </div>
                      <div style={S.progressBar}><div style={{ height: '100%', width: `${pct}%`, background: c.color, borderRadius: 3, transition: 'width 0.6s ease' }} /></div>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginTop: 20 }}>
                {[
                  { label: 'Total Spent',     value: formatINR(analytics.total),                sub: `${analytics.count} transactions` },
                  { label: 'Highest Expense', value: formatINR(analytics.highest?.amount || 0), sub: analytics.highest?.title },
                  { label: 'Daily Average',   value: formatINR(analytics.avgPerDay),             sub: 'per day' },
                ].map((s, i) => (
                  <div key={i} style={S.card}>
                    <div style={S.cardLabel}>{s.label}</div>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 20, marginTop: 4, color: S.text }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: S.textMuted, marginTop: 4 }}>{s.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── BUDGET ── */}
          {view === 'budget' && (
            <div>
              <div style={S.pageHeader}>Budget</div>
              <div style={S.sub}>Set your monthly spending limit</div>
              <div style={{ ...S.card, maxWidth: 520, marginBottom: 20 }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 18, marginBottom: 16, color: S.text }}>Monthly Budget</div>
                <div style={{ fontSize: 36, fontFamily: "'Syne', sans-serif", fontWeight: 800, color: budgetPct >= 100 ? '#FF6B6B' : budgetPct > 85 ? '#FF6B6B' : '#4ECDC4', marginBottom: 16 }}>{formatINR(budget)}</div>
                <input type="range" min={1000} max={100000} step={500} value={budget}
                  onChange={e => setBudget(Number(e.target.value))}
                  onMouseUp={e => handleBudgetUpdate(Number(e.target.value))}
                  onTouchEnd={() => handleBudgetUpdate(budget)}
                  style={{ width: '100%', appearance: 'none', WebkitAppearance: 'none', height: 4, background: `linear-gradient(to right, #FF6B6B ${budgetPct}%, ${dark ? 'rgba(255,255,255,0.15)' : '#e2e8f0'} ${budgetPct}%)`, borderRadius: 2, outline: 'none', cursor: 'pointer', marginBottom: 8 }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: S.textMuted, marginBottom: 16 }}><span>₹1,000</span><span>₹1,00,000</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                  <span style={{ color: S.textMuted }}>Spent</span>
                  <span style={{ fontWeight: 600, color: S.text }}>{formatINR(totalSpent)}</span>
                </div>
                <div style={S.progressBar}><div style={{ height: '100%', width: `${budgetPct}%`, background: progressColor(budgetPct), borderRadius: 3, transition: 'width 0.6s ease' }} /></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: S.textMuted }}>
                  <span>{budgetPct.toFixed(1)}% used</span>
                  <span style={{ color: remaining < 0 ? '#FF6B6B' : S.textMuted }}>{remaining < 0 ? `${formatINR(Math.abs(remaining))} over budget` : `${formatINR(remaining)} remaining`}</span>
                </div>
                {totalSpent >= budget && (
                  <div style={{ marginTop: 16, background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#FF6B6B' }}>
                    🚨 You have exceeded your budget by {formatINR(totalSpent - budget)}. Consider reviewing your expenses.
                  </div>
                )}
                {totalSpent < budget && budgetPct > 85 && (
                  <div style={{ marginTop: 16, background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#FF6B6B' }}>
                    ⚠️ You've used {budgetPct.toFixed(0)}% of your budget. Consider cutting back.
                  </div>
                )}
              </div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, marginBottom: 14, fontSize: 16, color: S.text }}>Spending by Category</div>
              {CATEGORIES.map(c => {
                const total = analytics?.byCategory?.[c.id] || 0;
                if (!total) return null;
                const pct = (total / budget) * 100;
                return (
                  <div key={c.id} style={{ ...S.card, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ fontSize: 24 }}>{c.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 500, color: S.text }}>{c.label}</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: c.color }}>{formatINR(total)}</span>
                      </div>
                      <div style={S.progressBar}><div style={{ height: '100%', width: `${Math.min(100, pct)}%`, background: c.color, borderRadius: 3, transition: 'width 0.6s ease' }} /></div>
                    </div>
                    <div style={{ fontSize: 13, color: S.textMuted, minWidth: 40, textAlign: 'right' }}>{pct.toFixed(1)}%</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── ADD / EDIT MODAL ── */}
        {showForm && (
          <div style={S.formOverlay} onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
            <div style={S.formCard}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 20, marginBottom: 24, color: S.text }}>{editId ? 'Edit Expense' : 'Add Expense'}</div>
              <div style={{ marginBottom: 14 }}>
                <label style={S.label}>Title</label>
                <input style={S.input} placeholder="e.g. Zomato Order" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                <div style={{ flex: 1 }}>
                  <label style={S.label}>Amount (₹)</label>
                  <input style={{ ...S.input, borderColor: amountError ? '#FF6B6B' : undefined }} type="number" placeholder="1" min="1" step="1" value={form.amount}
                    onChange={e => { setAmountError(''); setForm(p => ({ ...p, amount: e.target.value })); }} />
                  {amountError && <div style={{ fontSize: 11, color: '#FF6B6B', marginTop: 5 }}>{amountError}</div>}
                </div>
                <div style={{ flex: 1 }}>
                  <label style={S.label}>Date</label>
                  <input style={S.input} type="date" value={form.date} min={minDate} max={maxDate} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
                  <div style={{ fontSize: 11, color: S.textMuted, marginTop: 5 }}>Last 5 days only · No future dates</div>
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={S.label}>Category</label>
                <select style={{ ...S.input, cursor: 'pointer' }} value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                  {CATEGORIES.map(c => (<option key={c.id} value={c.id} style={{ background: dark ? '#111' : '#fff', color: dark ? '#fff' : '#1a1a2e' }}>{c.icon} {c.label}</option>))}
                </select>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={S.label}>Note (optional)</label>
                <input style={S.input} placeholder="Add a note..." value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button style={{ ...S.btn(false), flex: 1, justifyContent: 'center' }} onClick={() => setShowForm(false)}>Cancel</button>
                <button style={{ ...S.btn(true), flex: 1, justifyContent: 'center' }} onClick={handleSubmit}>{editId ? 'Save Changes' : 'Add Expense'}</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── BUDGET EXCEEDED POPUP — slides in from top right ── */}
      {showBudgetAlert && (
        <BudgetAlert dark={dark} totalSpent={totalSpent} budget={budget} onClose={() => setShowBudgetAlert(false)} />
      )}

      {/* ── SMS IMPORT TOAST — bottom right ── */}
      <SmsToast dark={dark} onConfirm={fetchAll} onDelete={fetchAll} />
    </>
  );
}