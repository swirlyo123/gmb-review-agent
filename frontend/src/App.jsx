import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Login from './pages/Login';

function NavBar() {
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
      </span>
      <Link to="/" style={linkStyle('/')}>Dashboard</Link>
      <Link to="/settings" style={linkStyle('/settings')}>Settings</Link>
      <Link to="/login" style={linkStyle('/login')}>Connect GMB</Link>
    </nav>
  );
}

function App() {
  return (
    <BrowserRouter>
      <NavBar />
      <main style={{ padding: '24px', maxWidth: '960px', margin: '0 auto' }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;
