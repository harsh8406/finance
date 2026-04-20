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

const INCOME_SOURCES = [
  { id: 'salary',     label: 'Salary',       icon: '💼' },
  { id: 'freelance',  label: 'Freelance',    icon: '💻' },
  { id: 'business',   label: 'Business',     icon: '🏪' },
  { id: 'investment', label: 'Investment',   icon: '📈' },
  { id: 'gift',       label: 'Gift',         icon: '🎁' },
  { id: 'refund',     label: 'Refund',       icon: '↩️' },
  { id: 'other',      label: 'Other',        icon: '💰' },
];

const formatINR = (val) => '₹' + Number(val).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const getCat    = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[7];
const getSrc    = (id) => INCOME_SOURCES.find((s) => s.id === id) || INCOME_SOURCES[6];

// ── Budget / Income Alert Toast ───────────────────────────────────────────────
function BudgetAlert({ dark, totalSpent, totalIncome, onClose }) {
  const over = totalSpent - totalIncome;
  const pct  = totalIncome > 0 ? (totalSpent / totalIncome) * 100 : 0;

  if (totalSpent < totalIncome) return null;

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
      <style>{`@keyframes slideIn { from{transform:translateX(120%);opacity:0} to{transform:translateX(0);opacity:1} }`}</style>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ fontSize: 28, lineHeight: 1 }}>🚨</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#FF6B6B', marginBottom: 4 }}>Income Exceeded!</div>
          <div style={{ fontSize: 13, color: dark ? 'rgba(255,255,255,0.7)' : '#64748b', lineHeight: 1.5 }}>
            You've spent {formatINR(totalSpent)} against an income of {formatINR(totalIncome)}.{' '}
            You are <span style={{ color: '#FF6B6B', fontWeight: 700 }}>{formatINR(over)}</span> over your income.
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#FF6B6B', lineHeight: 1, padding: 0 }}>✕</button>
      </div>
      <div style={{ marginTop: 12, height: 4, background: 'rgba(255,107,107,0.2)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: '100%', background: '#FF6B6B', borderRadius: 2 }} />
      </div>
      <div style={{ marginTop: 8, fontSize: 11, color: '#FF6B6B', fontWeight: 600 }}>{pct.toFixed(0)}% of income spent</div>
    </div>
  );
}

// ── Spending Bar Chart ────────────────────────────────────────────────────────
function SpendingBarChart({ analytics, dark }) {
  const S = {
    muted: dark ? 'rgba(255,255,255,0.4)' : '#64748b',
    track: dark ? 'rgba(255,255,255,0.07)' : '#f1f5f9',
    grid:  dark ? 'rgba(255,255,255,0.06)' : '#e2e8f0',
  };

  const data = useMemo(() => {
    if (!analytics?.byCategory) return [];
    return CATEGORIES
      .map(c => ({ ...c, total: analytics.byCategory[c.id] || 0 }))
      .filter(c => c.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [analytics]);

  if (!data.length) return (
    <div style={{ textAlign: 'center', padding: '40px 0', color: S.muted, fontSize: 13 }}>No spending data yet this month</div>
  );

  const max = data[0].total;
  const chartH = 200;
  const barW   = Math.min(48, Math.floor((500 - data.length * 12) / data.length));
  const gridLines = [0.25, 0.5, 0.75, 1].map(f => ({ y: chartH - chartH * f, f }));

  return (
    <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
      <div style={{ minWidth: data.length * (barW + 16) + 60, position: 'relative' }}>
        <svg width="100%" height={chartH + 48} style={{ overflow: 'visible', display: 'block' }}>
          {gridLines.map((gl, i) => (
            <g key={i}>
              <line x1={48} y1={gl.y + 4} x2="100%" y2={gl.y + 4} stroke={S.grid} strokeWidth={1} strokeDasharray="4 4" />
              <text x={44} y={gl.y + 8} textAnchor="end" fontSize={9} fill={S.muted} fontFamily="'DM Sans', sans-serif">{formatINR(max * gl.f)}</text>
            </g>
          ))}
          {data.map((cat, i) => {
            const barH = Math.max(4, (cat.total / max) * chartH);
            const x = 52 + i * (barW + 16);
            const y = chartH - barH + 4;
            const rx = Math.min(6, barW / 3);
            return (
              <g key={cat.id}>
                <rect x={x} y={4} width={barW} height={chartH} rx={rx} fill={S.track} />
                <rect x={x} y={y} width={barW} height={barH} rx={rx} fill={cat.color} />
                <text x={x + barW / 2} y={y - 6} textAnchor="middle" fontSize={9} fontWeight={700} fill={cat.color} fontFamily="'DM Sans', sans-serif">{formatINR(cat.total)}</text>
                <text x={x + barW / 2} y={chartH + 22} textAnchor="middle" fontSize={16}>{cat.icon}</text>
                <text x={x + barW / 2} y={chartH + 40} textAnchor="middle" fontSize={9} fill={S.muted} fontFamily="'DM Sans', sans-serif">{cat.label.split(' ')[0]}</text>
              </g>
            );
          })}
        </svg>
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
  const bg            = dark ? '#0A0A0F'                          : '#F0F2F5';
  const surface       = dark ? 'rgba(255,255,255,0.05)'           : '#ffffff';
  const surfaceBorder = dark ? '1px solid rgba(255,255,255,0.07)' : '1px solid #e2e8f0';
  const text          = dark ? '#ffffff'                          : '#1a1a2e';
  const textMuted     = dark ? 'rgba(255,255,255,0.4)'            : '#64748b';
  const inputBg       = dark ? 'rgba(255,255,255,0.07)'           : '#f8fafc';
  const inputBorder   = dark ? '1px solid rgba(255,255,255,0.1)'  : '1px solid #e2e8f0';
  const rowBg         = dark ? 'rgba(255,255,255,0.04)'           : '#f8fafc';
  const rowBorder     = dark ? '1px solid rgba(255,255,255,0.05)' : '1px solid #e2e8f0';
  const btnSecBg      = dark ? 'rgba(255,255,255,0.08)'           : '#f1f5f9';
  const btnSecColor   = dark ? 'rgba(255,255,255,0.7)'            : '#475569';
  const btnSecBorder  = dark ? 'none'                             : '1px solid #e2e8f0';
  const sidebarBg     = dark ? 'rgba(255,255,255,0.03)'           : '#ffffff';
  const sidebarBorder = dark ? '1px solid rgba(255,255,255,0.07)' : '1px solid #e2e8f0';
  const overlayCard   = dark ? '#111118'                          : '#ffffff';
  const overlayBorder = dark ? '1px solid rgba(255,255,255,0.1)'  : '1px solid #e2e8f0';
  const labelColor    = dark ? 'rgba(255,255,255,0.4)'            : '#64748b';
  const progressTrack = dark ? 'rgba(255,255,255,0.1)'            : '#e2e8f0';
  return {
    app:         { fontFamily: "'Inter', sans-serif", background: bg, minHeight: '100vh', color: text, display: 'flex', transition: 'background 0.3s, color 0.3s' },
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
    btnGreen: () => ({ background: '#4ECDC4', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s' }),
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

  const [view,            setView]           = useState('dashboard');
  const [expenses,        setExpenses]       = useState([]);
  const [incomes,         setIncomes]        = useState([]);
  const [budget,          setBudget]         = useState(15000);
  const [analytics,       setAnalytics]      = useState(null);
  const [filterCat,       setFilterCat]      = useState('all');
  const [sortBy,          setSortBy]         = useState('date');
  const [showForm,        setShowForm]       = useState(false);
  const [showIncomeForm,  setShowIncomeForm]  = useState(false);
  const [editId,          setEditId]         = useState(null);
  const [editIncomeId,    setEditIncomeId]    = useState(null);
  const [loading,         setLoading]        = useState(false);
  const [amountError,     setAmountError]    = useState('');
  const [incAmountError,  setIncAmountError] = useState('');
  const [showBudgetAlert, setShowBudgetAlert]= useState(false);
  const prevTotalRef = useRef(0);

  const [form, setForm] = useState({
    title: '', amount: '', category: 'food',
    date: new Date().toISOString().slice(0, 10), note: '',
  });

  const [incomeForm, setIncomeForm] = useState({
    title: '', amount: '', source: 'salary',
    date: new Date().toISOString().slice(0, 10), note: '',
  });

  const now        = new Date();
  const month      = now.getMonth() + 1;
  const year       = now.getFullYear();
  const maxDate    = now.toISOString().slice(0, 10);
  const minDateObj = new Date(now);
  minDateObj.setDate(minDateObj.getDate() - 5);
  const minDate = minDateObj.toISOString().slice(0, 10);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [expRes, budRes, anaRes, incRes] = await Promise.all([
        api.get(`/expenses?month=${month}&year=${year}&sortBy=${sortBy}`),
        api.get(`/budget?month=${month}&year=${year}`),
        api.get(`/expenses/analytics?month=${month}&year=${year}`),
        api.get(`/income?month=${month}&year=${year}`),
      ]);
      setExpenses(expRes.data);
      setBudget(budRes.data.amount);
      setAnalytics(anaRes.data);
      setIncomes(incRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [month, year, sortBy]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const totalSpent  = analytics?.total || 0;
  const totalIncome = useMemo(() => incomes.reduce((sum, i) => sum + i.amount, 0), [incomes]);
  const balance     = totalIncome - totalSpent;
  const spentPct    = totalIncome > 0 ? Math.min(100, (totalSpent / totalIncome) * 100) : 0;
  const budgetPct   = Math.min(100, (totalSpent / budget) * 100);

  const progressColor = (p) => p > 85 ? '#FF6B6B' : p > 60 ? '#FFE66D' : '#4ECDC4';

  useEffect(() => {
    if (totalSpent === 0 || totalIncome === 0) return;
    const prev = prevTotalRef.current;
    if (totalSpent >= totalIncome && prev < totalIncome && prev !== 0) setShowBudgetAlert(true);
    prevTotalRef.current = totalSpent;
  }, [totalSpent, totalIncome]);

  useEffect(() => {
    if (totalSpent < totalIncome) {
      setShowBudgetAlert(false);
      prevTotalRef.current = totalSpent;
    }
  }, [totalSpent, totalIncome]);

  const filtered = useMemo(() =>
    filterCat === 'all' ? expenses : expenses.filter(e => e.category === filterCat),
    [expenses, filterCat]);

  const topCategories = useMemo(() => {
    if (!analytics?.byCategory) return [];
    return CATEGORIES.map(c => ({ ...c, total: analytics.byCategory[c.id] || 0 }))
      .filter(c => c.total > 0).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [analytics]);

  // ── Expense handlers ──
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
    if (form.date < minDate || form.date > maxDate) { alert('Date must be within the last 5 days.'); return; }
    try {
      if (editId) await api.put(`/expenses/${editId}`, { ...form, amount: amt });
      else        await api.post('/expenses', { ...form, amount: amt });
      setShowForm(false); setEditId(null); setAmountError('');
      setForm({ title: '', amount: '', category: 'food', date: maxDate, note: '' });
      await fetchAll();
    } catch (err) { alert(err.response?.data?.message || 'Error saving expense'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    await api.delete(`/expenses/${id}`); fetchAll();
  };

  // ── Income handlers ──
  const openAddIncome = () => {
    setEditIncomeId(null); setIncAmountError('');
    setIncomeForm({ title: '', amount: '', source: 'salary', date: maxDate, note: '' });
    setShowIncomeForm(true);
  };

  const handleEditIncome = (inc) => {
    setIncAmountError('');
    setIncomeForm({ title: inc.title, amount: String(inc.amount), source: inc.source || 'salary', date: inc.date?.slice(0, 10) || maxDate, note: inc.note || '' });
    setEditIncomeId(inc._id); setShowIncomeForm(true);
  };

  const handleIncomeSubmit = async () => {
    setIncAmountError('');
    if (!incomeForm.title.trim()) { alert('Please enter a title.'); return; }
    const amt = Number(incomeForm.amount);
    if (!incomeForm.amount || amt < 1) { setIncAmountError('⚠️ Amount must be at least ₹1'); return; }
    if (incomeForm.date < minDate || incomeForm.date > maxDate) { alert('Date must be within the last 5 days.'); return; }
    try {
      if (editIncomeId) await api.put(`/income/${editIncomeId}`, { ...incomeForm, amount: amt });
      else              await api.post('/income', { ...incomeForm, amount: amt });
      setShowIncomeForm(false); setEditIncomeId(null); setIncAmountError('');
      setIncomeForm({ title: '', amount: '', source: 'salary', date: maxDate, note: '' });
      await fetchAll();
    } catch (err) { alert(err.response?.data?.message || 'Error saving income'); }
  };

  const handleDeleteIncome = async (id) => {
    if (!window.confirm('Delete this income entry?')) return;
    await api.delete(`/income/${id}`); fetchAll();
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
            { id: 'income',    icon: '◆', label: 'Income' },
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
            <div style={{ fontSize: 11, color: '#4ECDC4', marginBottom: 2 }}>💰 Income: {formatINR(totalIncome)}</div>
            <div style={{ fontSize: 11, color: '#FF6B6B', marginBottom: 2 }}>💸 Spent: {formatINR(totalSpent)}</div>
            <div style={{ fontSize: 14, fontFamily: "'Syne', sans-serif", fontWeight: 700, color: balance >= 0 ? '#4ECDC4' : '#FF6B6B', marginTop: 4 }}>
              {balance >= 0 ? '🟢' : '🔴'} {formatINR(Math.abs(balance))}
            </div>
            <div style={{ fontSize: 11, color: S.textMuted }}>{balance >= 0 ? 'remaining' : 'over income'}</div>
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

              {/* ── Income / Spent / Balance hero strip ── */}
              <div style={{ ...S.card, marginBottom: 24, padding: '20px 24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr 1px 1fr', gap: 0, alignItems: 'center' }}>
                  {/* Income */}
                  <div style={{ textAlign: 'center', padding: '8px 0' }}>
                    <div style={{ fontSize: 22, marginBottom: 4 }}>💰</div>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: S.textMuted, marginBottom: 6 }}>Income</div>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 20, color: '#4ECDC4' }}>{formatINR(totalIncome)}</div>
                    <div style={{ fontSize: 11, color: S.textMuted, marginTop: 2 }}>{incomes.length} {incomes.length === 1 ? 'entry' : 'entries'}</div>
                  </div>
                  <div style={{ width: 1, height: 60, background: dark ? 'rgba(255,255,255,0.08)' : '#e2e8f0', margin: '0 auto' }} />
                  {/* Spent */}
                  <div style={{ textAlign: 'center', padding: '8px 0' }}>
                    <div style={{ fontSize: 22, marginBottom: 4 }}>💸</div>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: S.textMuted, marginBottom: 6 }}>Spent</div>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 20, color: '#FF6B6B' }}>{formatINR(totalSpent)}</div>
                    <div style={{ fontSize: 11, color: S.textMuted, marginTop: 2 }}>{analytics?.count || 0} transactions</div>
                  </div>
                  <div style={{ width: 1, height: 60, background: dark ? 'rgba(255,255,255,0.08)' : '#e2e8f0', margin: '0 auto' }} />
                  {/* Balance */}
                  <div style={{ textAlign: 'center', padding: '8px 0' }}>
                    <div style={{ fontSize: 22, marginBottom: 4 }}>{balance >= 0 ? '🟢' : '🔴'}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: S.textMuted, marginBottom: 6 }}>Remaining</div>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 20, color: balance >= 0 ? '#4ECDC4' : '#FF6B6B' }}>{formatINR(Math.abs(balance))}</div>
                    <div style={{ fontSize: 11, color: balance >= 0 ? '#4ECDC4' : '#FF6B6B', marginTop: 2 }}>{balance >= 0 ? `${(100 - spentPct).toFixed(0)}% of income left` : 'over income'}</div>
                  </div>
                </div>

                {/* FIX 1: Progress bar + "Add income" button placed OUTSIDE the grid, below it */}
                {totalIncome > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ height: 6, background: dark ? 'rgba(255,255,255,0.08)' : '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${spentPct}%`, background: spentPct >= 100 ? '#FF6B6B' : spentPct > 75 ? '#FFE66D' : '#4ECDC4', borderRadius: 3, transition: 'width 0.6s ease' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: S.textMuted }}>
                      <span>{spentPct.toFixed(1)}% of income spent</span>
                      <span style={{ color: balance >= 0 ? '#4ECDC4' : '#FF6B6B' }}>{balance >= 0 ? `${formatINR(balance)} left` : `${formatINR(Math.abs(balance))} over`}</span>
                    </div>
                  </div>
                )}

                {totalIncome === 0 && (
                  <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
                    <button
                      style={{ ...S.btnGreen(), fontSize: 12, padding: '8px 20px' }}
                      onClick={() => setView('income')}
                    >
                      + Add your income to get started
                    </button>
                  </div>
                )}
              </div>

              {/* Overspent warning */}
              {totalSpent >= totalIncome && totalIncome > 0 && (
                <div style={{ marginBottom: 20, padding: '14px 18px', borderRadius: 12, background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.35)', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 22 }}>🚨</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#FF6B6B' }}>Spending Exceeds Income</div>
                    <div style={{ fontSize: 12, color: S.textMuted, marginTop: 2 }}>You are {formatINR(totalSpent - totalIncome)} over your total income this month.</div>
                  </div>
                  <button onClick={() => setView('income')} style={{ ...S.btn(true), padding: '6px 14px', fontSize: 12 }}>Review</button>
                </div>
              )}

              <div style={S.grid}>
                {[
                  { label: 'Daily Average', value: formatINR(analytics?.avgPerDay || 0), sub: 'per day this month',       color: '#FFE66D' },
                  { label: 'Top Category',  value: topCategories[0] ? `${topCategories[0].icon} ${topCategories[0].label.split(' ')[0]}` : '—', sub: topCategories[0] ? formatINR(topCategories[0].total) : '—', color: '#C3B1E1' },
                  { label: 'Budget Limit',  value: formatINR(budget), sub: `${budgetPct.toFixed(0)}% used`,              color: budgetPct >= 100 ? '#FF6B6B' : '#74B9FF' },
                  { label: 'Savings Rate',  value: totalIncome > 0 ? `${Math.max(0, 100 - spentPct).toFixed(0)}%` : '—', sub: totalIncome > 0 ? formatINR(Math.max(0, balance)) + ' saved' : 'Add income first', color: '#A8E6CF' },
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
                  <div style={S.cardLabel}>Income vs Spending</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 8 }}>
                    <div style={{ position: 'relative' }}>
                      <DonutChart dark={dark} size={100} segments={[
                        { color: spentPct >= 100 ? '#FF6B6B' : spentPct > 75 ? '#FFE66D' : '#4ECDC4', value: totalSpent },
                        { color: dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)', value: Math.max(0, totalIncome - totalSpent) },
                      ]} />
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, fontFamily: "'Syne', sans-serif", color: S.text }}>{spentPct.toFixed(0)}%</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 13, color: '#4ECDC4' }}>💰 {formatINR(totalIncome)}</div>
                      <div style={{ fontSize: 13, color: '#FF6B6B', marginTop: 4 }}>💸 {formatINR(totalSpent)}</div>
                      <div style={{ fontSize: 13, color: balance >= 0 ? '#4ECDC4' : '#FF6B6B', marginTop: 4 }}>
                        {balance >= 0 ? `🟢 ${formatINR(balance)}` : `🔴 ${formatINR(Math.abs(balance))} over`}
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
                {['date', 'amount'].map(s => (
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

          {/* ── INCOME ── */}
          {view === 'income' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <div><div style={S.pageHeader}>Income</div><div style={S.sub}>{incomes.length} {incomes.length === 1 ? 'entry' : 'entries'} this month</div></div>
                {/* FIX 2: single "+ Add Income" button stays only here in the header */}
                <button style={S.btnGreen()} onClick={openAddIncome}>+ Add Income</button>
              </div>

              {/* Income summary strip */}
              <div style={{ ...S.card, marginBottom: 20, padding: '16px 20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr 1px 1fr', alignItems: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: S.textMuted, marginBottom: 4 }}>Total Income</div>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18, color: '#4ECDC4' }}>{formatINR(totalIncome)}</div>
                  </div>
                  <div style={{ width: 1, height: 40, background: dark ? 'rgba(255,255,255,0.08)' : '#e2e8f0', margin: '0 auto' }} />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: S.textMuted, marginBottom: 4 }}>Total Spent</div>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18, color: '#FF6B6B' }}>{formatINR(totalSpent)}</div>
                  </div>
                  <div style={{ width: 1, height: 40, background: dark ? 'rgba(255,255,255,0.08)' : '#e2e8f0', margin: '0 auto' }} />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: S.textMuted, marginBottom: 4 }}>Balance</div>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18, color: balance >= 0 ? '#4ECDC4' : '#FF6B6B' }}>{balance >= 0 ? '' : '-'}{formatINR(Math.abs(balance))}</div>
                  </div>
                </div>
              </div>

              {/* FIX 2: Empty state WITHOUT the duplicate "+ Add Income" button */}
              {incomes.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: S.textMuted }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>💰</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: S.text, marginBottom: 6 }}>No income added yet</div>
                  <div style={{ fontSize: 13 }}>Add your salary, freelance earnings, or any other credits</div>
                </div>
              )}

              {incomes.map((inc) => {
                const src = getSrc(inc.source);
                return (
                  <div key={inc._id} style={S.expRow}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(78,205,196,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{src.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, fontSize: 14, color: S.text }}>{inc.title}</div>
                      <div style={{ fontSize: 11, color: S.textMuted }}>{inc.date?.slice(0, 10)}{inc.note ? ' · ' + inc.note : ''}</div>
                    </div>
                    <div style={{ background: 'rgba(78,205,196,0.15)', color: '#4ECDC4', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>{src.label}</div>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, minWidth: 80, textAlign: 'right', color: '#4ECDC4' }}>+{formatINR(inc.amount)}</div>
                    <button onClick={() => handleEditIncome(inc)} style={{ ...S.btn(false), padding: '6px 10px' }}>✏️</button>
                    <button onClick={() => handleDeleteIncome(inc._id)} style={{ ...S.btn(false), padding: '6px 10px', color: '#FF6B6B' }}>🗑</button>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── ANALYTICS ── */}
          {view === 'analytics' && analytics && (
            <div>
              <div style={S.pageHeader}>Analytics</div>
              <div style={S.sub}>Your spending patterns this month</div>

              <div style={{ ...S.card, marginBottom: 20 }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, marginBottom: 14, color: S.text }}>Monthly Overview</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { label: '💰 Income',    value: totalIncome, color: '#4ECDC4', pct: 100 },
                    { label: '💸 Spent',     value: totalSpent,  color: '#FF6B6B', pct: totalIncome > 0 ? (totalSpent / totalIncome) * 100 : 0 },
                    { label: '🟢 Remaining', value: Math.max(0, balance), color: '#A8E6CF', pct: totalIncome > 0 ? Math.max(0, (balance / totalIncome) * 100) : 0 },
                  ].map((row, i) => (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 13, color: S.text }}>{row.label}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: row.color }}>{formatINR(row.value)}</span>
                      </div>
                      <div style={{ height: 6, background: dark ? 'rgba(255,255,255,0.08)' : '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(100, row.pct)}%`, background: row.color, borderRadius: 3, transition: 'width 0.6s ease' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

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

              <div style={{ ...S.card, marginTop: 20 }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, marginBottom: 18, color: S.text }}>Spending by Category</div>
                <SpendingBarChart analytics={analytics} dark={dark} />
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
                <div style={{ fontSize: 36, fontFamily: "'Syne', sans-serif", fontWeight: 800, color: budgetPct >= 100 ? '#FF6B6B' : budgetPct > 85 ? '#FFE66D' : '#4ECDC4', marginBottom: 16 }}>{formatINR(budget)}</div>
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
                  <span>{budgetPct.toFixed(1)}% of budget used</span>
                  <span style={{ color: totalSpent >= budget ? '#FF6B6B' : S.textMuted }}>{totalSpent >= budget ? `${formatINR(totalSpent - budget)} over budget` : `${formatINR(budget - totalSpent)} remaining`}</span>
                </div>
                {totalIncome > 0 && (
                  <div style={{ marginTop: 14, padding: '12px 14px', background: dark ? 'rgba(78,205,196,0.08)' : 'rgba(78,205,196,0.06)', borderRadius: 10, border: '1px solid rgba(78,205,196,0.2)' }}>
                    <div style={{ fontSize: 12, color: S.textMuted, marginBottom: 6 }}>Income context</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: S.text }}>💰 Income: <strong style={{ color: '#4ECDC4' }}>{formatINR(totalIncome)}</strong></span>
                      <span style={{ color: S.text }}>🟢 Balance: <strong style={{ color: balance >= 0 ? '#4ECDC4' : '#FF6B6B' }}>{formatINR(Math.abs(balance))}</strong></span>
                    </div>
                  </div>
                )}
                {totalSpent >= budget && (
                  <div style={{ marginTop: 12, background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#FF6B6B' }}>
                    🚨 You have exceeded your budget by {formatINR(totalSpent - budget)}. Consider reviewing your expenses.
                  </div>
                )}
                {totalSpent < budget && budgetPct > 85 && (
                  <div style={{ marginTop: 12, background: 'rgba(255,231,109,0.1)', border: '1px solid rgba(255,231,109,0.3)', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#FFE66D' }}>
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

        {/* ── ADD / EDIT EXPENSE MODAL ── */}
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

        {/* ── ADD / EDIT INCOME MODAL ── */}
        {showIncomeForm && (
          <div style={S.formOverlay} onClick={e => { if (e.target === e.currentTarget) setShowIncomeForm(false); }}>
            <div style={S.formCard}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 20, marginBottom: 24, color: S.text }}>{editIncomeId ? 'Edit Income' : 'Add Income'}</div>
              <div style={{ marginBottom: 14 }}>
                <label style={S.label}>Title</label>
                <input style={S.input} placeholder="e.g. Monthly Salary" value={incomeForm.title} onChange={e => setIncomeForm(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                <div style={{ flex: 1 }}>
                  <label style={S.label}>Amount (₹)</label>
                  <input style={{ ...S.input, borderColor: incAmountError ? '#FF6B6B' : undefined }} type="number" placeholder="1" min="1" step="1" value={incomeForm.amount}
                    onChange={e => { setIncAmountError(''); setIncomeForm(p => ({ ...p, amount: e.target.value })); }} />
                  {incAmountError && <div style={{ fontSize: 11, color: '#FF6B6B', marginTop: 5 }}>{incAmountError}</div>}
                </div>
                <div style={{ flex: 1 }}>
                  <label style={S.label}>Date</label>
                  <input style={S.input} type="date" value={incomeForm.date} min={minDate} max={maxDate} onChange={e => setIncomeForm(p => ({ ...p, date: e.target.value }))} />
                  <div style={{ fontSize: 11, color: S.textMuted, marginTop: 5 }}>Last 5 days only · No future dates</div>
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={S.label}>Source</label>
                <select style={{ ...S.input, cursor: 'pointer' }} value={incomeForm.source} onChange={e => setIncomeForm(p => ({ ...p, source: e.target.value }))}>
                  {INCOME_SOURCES.map(s => (<option key={s.id} value={s.id} style={{ background: dark ? '#111' : '#fff', color: dark ? '#fff' : '#1a1a2e' }}>{s.icon} {s.label}</option>))}
                </select>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={S.label}>Note (optional)</label>
                <input style={S.input} placeholder="Add a note..." value={incomeForm.note} onChange={e => setIncomeForm(p => ({ ...p, note: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button style={{ ...S.btn(false), flex: 1, justifyContent: 'center' }} onClick={() => setShowIncomeForm(false)}>Cancel</button>
                <button style={{ ...S.btnGreen(), flex: 1, justifyContent: 'center' }} onClick={handleIncomeSubmit}>{editIncomeId ? 'Save Changes' : 'Add Income'}</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── INCOME EXCEEDED POPUP ── */}
      {showBudgetAlert && (
        <BudgetAlert dark={dark} totalSpent={totalSpent} totalIncome={totalIncome} onClose={() => setShowBudgetAlert(false)} />
      )}
    </>
  );
}