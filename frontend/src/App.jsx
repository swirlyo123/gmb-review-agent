import { BrowserRouter, Routes, Route, Link, useLocation, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import axios from 'axios';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Login from './pages/Login';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Reads tenantId from URL on first load and saves to localStorage
function TenantBootstrap({ setTenantId, setBusinessName }) {
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const urlTenantId = searchParams.get('tenantId');
    const connected = searchParams.get('connected');

    if (urlTenantId) {
      localStorage.setItem('tenantId', urlTenantId);
      setTenantId(urlTenantId);
      // Clean URL params after saving
      setSearchParams({}, { replace: true });
    } else {
      const stored = localStorage.getItem('tenantId');
      if (stored) setTenantId(stored);
    }

    // Fetch business name from auth/status
    const id = urlTenantId || localStorage.getItem('tenantId');
    if (id) {
      axios.get(`${API_BASE}/api/auth/status`, {
        headers: { 'x-tenant-id': id },
      }).then((res) => {
        if (res.data.businessName) setBusinessName(res.data.businessName);
      }).catch(() => {});
    }
  }, []);

  return null;
}

function NavBar({ tenantId, businessName }) {
  const location = useLocation();

  const linkStyle = (path) => ({
    color: location.pathname === path ? '#fff' : '#a0aec0',
    textDecoration: 'none',
    fontWeight: 500,
    padding: '4px 8px',
    borderRadius: '6px',
    background: location.pathname === path ? 'rgba(255,255,255,0.1)' : 'transparent',
  });

  return (
    <nav style={{
      background: '#1a1a2e',
      padding: '0 24px',
      display: 'flex',
      alignItems: 'center',
      gap: '24px',
      height: '56px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <span style={{ color: '#fff', fontWeight: 700, fontSize: '18px', marginRight: 'auto' }}>
        ⭐ GMB Review Agent
        {businessName && (
          <span style={{ fontSize: '13px', color: '#a0aec0', fontWeight: 400, marginLeft: '10px' }}>
            — {businessName}
          </span>
        )}
      </span>
      {tenantId && (
        <span style={{ fontSize: '11px', color: '#48bb78', fontWeight: 600 }}>● Connected</span>
      )}
      <Link to="/dashboard" style={linkStyle('/dashboard')}>Dashboard</Link>
      <Link to="/settings" style={linkStyle('/settings')}>Settings</Link>
      <Link to="/login" style={linkStyle('/login')}>Connect GMB</Link>
    </nav>
  );
}

function App() {
  const [tenantId, setTenantId] = useState(localStorage.getItem('tenantId') || null);
  const [businessName, setBusinessName] = useState('');

  return (
    <BrowserRouter>
      <TenantBootstrap setTenantId={setTenantId} setBusinessName={setBusinessName} />
      <NavBar tenantId={tenantId} businessName={businessName} />
      <main style={{ padding: '24px', maxWidth: '960px', margin: '0 auto' }}>
        <Routes>
          <Route path="/" element={<Dashboard tenantId={tenantId} />} />
          <Route path="/dashboard" element={<Dashboard tenantId={tenantId} />} />
          <Route path="/settings" element={<Settings tenantId={tenantId} />} />
          <Route path="/login" element={<Login tenantId={tenantId} />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;
