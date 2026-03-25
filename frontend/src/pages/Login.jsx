import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// ─── State 1: Not connected ───────────────────────────────────────────────────
function ConnectView() {
  const features = [
    'Monitors all your Google reviews every 15 minutes',
    'AI generates a personalised reply for every review',
    'You approve before anything gets posted to Google',
  ];

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '52px', marginBottom: '16px' }}>⭐</div>
      <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: '0 0 8px' }}>
        Connect Google Business
      </h1>
      <p style={{ color: '#64748b', lineHeight: 1.6, marginBottom: '28px', fontSize: '14px' }}>
        Link your GMB account to start managing all your SWIRLYO reviews from one dashboard.
      </p>

      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px', textAlign: 'left' }}>
        {features.map((f, i) => (
          <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px', fontSize: '14px', color: '#334155' }}>
            <span style={{ color: '#16a34a', fontSize: '16px', marginTop: '1px', flexShrink: 0 }}>✓</span>
            {f}
          </li>
        ))}
      </ul>

      <a
        href={`${API_BASE}/api/auth/google`}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '10px',
          background: '#2563eb', color: '#fff', textDecoration: 'none',
          borderRadius: '9px', padding: '13px 28px', fontWeight: 700, fontSize: '15px',
          boxShadow: '0 2px 8px rgba(37,99,235,0.35)',
        }}
      >
        <GoogleIcon />
        Connect with Google
      </a>
    </div>
  );
}

// ─── State 2: Pick location ───────────────────────────────────────────────────
function LocationView({ tenantId, businessName, onSelected, showToast }) {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(null);
  const [error, setError]         = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await axios.get(`${API_BASE}/api/auth/locations`, {
          headers: { 'x-tenant-id': tenantId },
        });
        setLocations(res.data.locations || []);
      } catch (err) {
        const msg = err.response?.data?.error || err.message;
        setError(msg.includes('429')
          ? 'Google API quota pending approval — check back in a few hours. Your account is connected correctly.'
          : `Could not fetch locations: ${msg}`
        );
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [tenantId]);

  async function select(loc) {
    setSaving(loc.name);
    try {
      await axios.post(`${API_BASE}/api/auth/select-locations`, {
        locations: [{
          locationId: loc.name,
          accountId: loc.accountName,
          name: loc.title,
          address: loc.address
            ? [loc.address.addressLines?.[0], loc.address.locality].filter(Boolean).join(', ')
            : null,
        }],
      }, { headers: { 'x-tenant-id': tenantId } });
      showToast?.(`${loc.title} added ✓`, 'success');
      onSelected(loc.title);
    } catch (err) {
      showToast?.('Failed to save location', 'error');
      setSaving(null);
    }
  }

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '5px 12px', marginBottom: '14px' }}>
          <span style={{ color: '#16a34a', fontSize: '13px', fontWeight: 600 }}>✓ Connected as {businessName}</span>
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>
          Select your business location
        </h2>
        <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>
          Click a location to start monitoring its reviews.
        </p>
      </div>

      {loading && <div style={{ color: '#94a3b8', padding: '24px 0', textAlign: 'center', fontSize: '14px' }}>Loading locations...</div>}

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '14px 16px', color: '#991b1b', fontSize: '13px', lineHeight: 1.5 }}>
          ❌ {error}
          <br /><br />
          <a href={`${API_BASE}/api/auth/google`} style={{ color: '#2563eb', fontWeight: 600 }}>
            Try reconnecting →
          </a>
        </div>
      )}

      {!loading && !error && locations.length === 0 && (
        <div style={{ color: '#94a3b8', textAlign: 'center', padding: '24px 0', fontSize: '14px' }}>
          No locations found on this account.
        </div>
      )}

      {locations.map((loc) => {
        const addr = loc.address
          ? [loc.address.addressLines?.[0], loc.address.locality].filter(Boolean).join(', ')
          : null;
        const isSaving = saving === loc.name;

        return (
          <div
            key={loc.name}
            onClick={() => !isSaving && select(loc)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              border: `1.5px solid ${loc.alreadyAdded ? '#bbf7d0' : '#e2e8f0'}`,
              borderRadius: '10px', padding: '14px 16px', marginBottom: '10px',
              cursor: isSaving ? 'wait' : 'pointer',
              background: loc.alreadyAdded ? '#f0fdf4' : '#fff',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => { if (!loc.alreadyAdded) { e.currentTarget.style.borderColor = '#93c5fd'; e.currentTarget.style.background = '#eff6ff'; }}}
            onMouseLeave={(e) => { if (!loc.alreadyAdded) { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fff'; }}}
          >
            <div>
              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '14px' }}>{loc.title}</div>
              {addr && <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '2px' }}>{addr}</div>}
              {loc.alreadyAdded && <div style={{ color: '#16a34a', fontSize: '11px', fontWeight: 700, marginTop: '2px' }}>✓ Already monitoring</div>}
            </div>
            <span style={{ color: '#2563eb', fontSize: '18px', fontWeight: 300 }}>
              {isSaving ? '...' : '→'}
            </span>
          </div>
        );
      })}

      <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
        <a href={`${API_BASE}/api/auth/google`} style={{ color: '#2563eb', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>
          + Connect another Google account
        </a>
      </div>
    </div>
  );
}

// ─── State 3: Fully connected ─────────────────────────────────────────────────
function ConnectedView({ businessName, locations, onChangeLocation }) {
  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{ width: '56px', height: '56px', background: '#f0fdf4', border: '2px solid #bbf7d0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', margin: '0 auto 14px' }}>✓</div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>Connected</h2>
        <p style={{ color: '#16a34a', fontSize: '14px', fontWeight: 600, margin: 0 }}>✓ Monitoring active</p>
      </div>

      <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
        <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>Account</div>
        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '15px', marginBottom: '12px' }}>{businessName}</div>
        {locations.map((l, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#475569', marginBottom: '4px' }}>
            <span style={{ color: '#16a34a' }}>●</span> {l.name}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <a href="/dashboard" style={{ display: 'block', textAlign: 'center', background: '#2563eb', color: '#fff', textDecoration: 'none', borderRadius: '8px', padding: '11px', fontWeight: 700, fontSize: '14px' }}>
          Go to Dashboard →
        </a>
        <button onClick={onChangeLocation} style={{ background: '#f1f5f9', color: '#334155', border: 'none', borderRadius: '8px', padding: '10px', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>
          ⚙️ Add or change locations
        </button>
        <a href={`${API_BASE}/api/auth/google`} style={{ textAlign: 'center', color: '#2563eb', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>
          + Connect another Google account
        </a>
      </div>
    </div>
  );
}

// ─── Main Login page ──────────────────────────────────────────────────────────
export default function Login({ tenantId, setTenantId, showToast }) {
  const [view, setView]     = useState('loading');
  const [status, setStatus] = useState(null);

  const tid = tenantId || localStorage.getItem('tenantId');

  useEffect(() => {
    const urlStep = new URLSearchParams(window.location.search).get('step');

    if (!tid) { setView('connect'); return; }

    axios.get(`${API_BASE}/api/auth/status`, { headers: { 'x-tenant-id': tid } })
      .then((res) => {
        setStatus(res.data);
        if (!res.data.connected) { setView('connect'); return; }
        if (urlStep === 'select-locations' || res.data.locationCount === 0) {
          setView('locations');
        } else {
          setView('connected');
        }
      })
      .catch(() => setView('connect'));
  }, [tid]);

  return (
    <div style={{ maxWidth: '520px', margin: '40px auto' }}>
      <div style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '40px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      }}>
        {view === 'loading' && <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0' }}>Loading...</div>}
        {view === 'connect'   && <ConnectView />}
        {view === 'locations' && (
          <LocationView
            tenantId={tid}
            businessName={status?.businessName || 'Your account'}
            onSelected={() => {
              axios.get(`${API_BASE}/api/auth/status`, { headers: { 'x-tenant-id': tid } })
                .then((res) => { setStatus(res.data); setView('connected'); })
                .catch(() => setView('connected'));
            }}
            showToast={showToast}
          />
        )}
        {view === 'connected' && (
          <ConnectedView
            businessName={status?.businessName}
            locations={status?.locations || []}
            onChangeLocation={() => setView('locations')}
          />
        )}
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}
