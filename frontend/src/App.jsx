import { BrowserRouter, Routes, Route, Link, useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import { useEffect, useState, useCallback, createContext, useContext } from 'react';
import axios from 'axios';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Login from './pages/Login';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

// ─── Toast System ───────────────────────────────────────────────────────────
const ToastContext = createContext(null);

export function useToast() {
  return useContext(ToastContext);
}

function ToastContainer({ toasts, dismiss }) {
  if (!toasts.length) return null;
  return (
    <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => dismiss(t.id)}
          style={{
            background: t.type === 'success' ? '#16a34a' : t.type === 'error' ? '#dc2626' : '#2563eb',
            color: '#fff',
            padding: '12px 18px',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: 600,
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            cursor: 'pointer',
            maxWidth: '320px',
            animation: 'slideIn 0.2s ease-out',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>{t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}</span>
          {t.message}
        </div>
      ))}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ─── Tenant Bootstrap ────────────────────────────────────────────────────────
function TenantBootstrap({ setTenantId, setBusinessName, setIsLive }) {
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const urlTenantId = searchParams.get('tenantId');
    if (urlTenantId) {
      localStorage.setItem('tenantId', urlTenantId);
      setTenantId(urlTenantId);
      setSearchParams({}, { replace: true });
    } else {
      const stored = localStorage.getItem('tenantId');
      if (stored) setTenantId(stored);
    }

    const id = urlTenantId || localStorage.getItem('tenantId');
    if (id) {
      axios.get(`${API_BASE}/api/auth/status`, { headers: { 'x-tenant-id': id } })
        .then((res) => {
          if (res.data.businessName) setBusinessName(res.data.businessName);
          if (res.data.locationCount > 0) setIsLive(true);
        })
        .catch(() => {});
    }
  }, []);

  return null;
}

// ─── NavBar ──────────────────────────────────────────────────────────────────
function NavBar({ tenantId, businessName, isLive }) {
  const location = useLocation();

  const link = (path, label) => (
    <Link to={path} style={{
      color: location.pathname === path ? '#fff' : '#94a3b8',
      textDecoration: 'none',
      fontWeight: 600,
      fontSize: '14px',
      padding: '6px 12px',
      borderRadius: '6px',
      background: location.pathname === path ? 'rgba(255,255,255,0.12)' : 'transparent',
      transition: 'all 0.15s',
    }}>{label}</Link>
  );

  return (
    <nav style={{
      background: '#0f172a',
      padding: '0 28px',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      height: '58px',
      boxShadow: '0 1px 0 rgba(255,255,255,0.06)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <Link to="/dashboard" style={{ textDecoration: 'none', marginRight: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '20px' }}>⭐</span>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: '16px' }}>GMB Review Agent</span>
        {businessName && (
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 400, marginLeft: '4px' }}>
            · {businessName}
          </span>
        )}
      </Link>

      {isLive && (
        <span style={{ fontSize: '11px', color: '#4ade80', fontWeight: 700, marginRight: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '6px', height: '6px', background: '#4ade80', borderRadius: '50%', display: 'inline-block' }} />
          Live
        </span>
      )}

      {link('/dashboard', 'Dashboard')}
      {link('/settings', 'Settings')}
      {link('/login', tenantId ? 'Manage GMB' : 'Connect GMB')}
    </nav>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────────
function App() {
  const [tenantId, setTenantId] = useState(localStorage.getItem('tenantId') || null);
  const [businessName, setBusinessName] = useState('');
  const [isLive, setIsLive] = useState(false);
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Expose globally for convenience
  useEffect(() => {
    window.showToast = showToast;
  }, [showToast]);

  return (
    <ToastContext.Provider value={showToast}>
      <BrowserRouter>
        <TenantBootstrap
          setTenantId={setTenantId}
          setBusinessName={setBusinessName}
          setIsLive={setIsLive}
        />
        <NavBar tenantId={tenantId} businessName={businessName} isLive={isLive} />
        <main style={{ padding: '28px 24px', maxWidth: '980px', margin: '0 auto' }}>
          <Routes>
            <Route path="/" element={<Dashboard tenantId={tenantId} showToast={showToast} setIsLive={setIsLive} />} />
            <Route path="/dashboard" element={<Dashboard tenantId={tenantId} showToast={showToast} setIsLive={setIsLive} />} />
            <Route path="/settings" element={<Settings tenantId={tenantId} showToast={showToast} />} />
            <Route path="/login" element={<Login tenantId={tenantId} setTenantId={setTenantId} showToast={showToast} />} />
          </Routes>
        </main>
        <ToastContainer toasts={toasts} dismiss={dismiss} />
      </BrowserRouter>
    </ToastContext.Provider>
  );
}

export default App;
