import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Step 1: Not connected
function ConnectStep() {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>⭐</div>
      <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1a202c', marginBottom: '8px' }}>
        Connect a Google Account
      </h2>
      <p style={{ color: '#718096', lineHeight: 1.6, marginBottom: '32px', fontSize: '14px' }}>
        Each Google account you connect can have multiple store locations. You can connect as many accounts as you need.
      </p>
      <a
        href={`${API_BASE}/api/auth/google`}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '10px',
          background: '#4285f4', color: '#fff', textDecoration: 'none',
          borderRadius: '10px', padding: '14px 28px', fontWeight: 700, fontSize: '15px',
          boxShadow: '0 2px 8px rgba(66,133,244,0.4)',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Connect with Google
      </a>
    </div>
  );
}

// Step 2: Pick locations (multi-select checkboxes)
function LocationStep({ tenantId, businessName, onDone }) {
  const [locations, setLocations] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await axios.get(`${API_BASE}/api/auth/locations`, {
          headers: { 'x-tenant-id': tenantId },
        });
        setLocations(res.data.locations || []);
        // Pre-check already-added ones
        const preSelected = new Set(
          (res.data.locations || []).filter((l) => l.alreadyAdded).map((l) => l.name)
        );
        setSelected(preSelected);
      } catch (err) {
        const msg = err.response?.data?.error || err.message;
        setError(msg.includes('429')
          ? 'Google API quota pending approval — check back in a few hours.'
          : msg
        );
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [tenantId]);

  function toggle(locName) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(locName) ? next.delete(locName) : next.add(locName);
      return next;
    });
  }

  async function handleSave() {
    if (!selected.size) return;
    setSaving(true);
    try {
      const toSave = locations
        .filter((l) => selected.has(l.name))
        .map((l) => ({
          locationId: l.name,
          accountId: l.accountName,
          name: l.title,
          address: l.address
            ? [l.address.addressLines?.[0], l.address.locality].filter(Boolean).join(', ')
            : null,
        }));

      await axios.post(`${API_BASE}/api/auth/select-locations`, { locations: toSave }, {
        headers: { 'x-tenant-id': tenantId },
      });
      onDone(toSave.length);
    } catch (err) {
      alert('Failed to save: ' + err.message);
      setSaving(false);
    }
  }

  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1a202c', margin: '0 0 4px' }}>
        Select locations to monitor
      </h2>
      <p style={{ color: '#48bb78', fontSize: '13px', fontWeight: 600, margin: '0 0 6px' }}>
        ✓ Connected as {businessName}
      </p>
      <p style={{ color: '#718096', fontSize: '13px', marginBottom: '20px' }}>
        Tick all SWIRLYO outlets you want to track. You can change this later.
      </p>

      {loading && <div style={{ textAlign: 'center', color: '#718096', padding: '24px' }}>Loading locations...</div>}

      {error && (
        <div style={{ background: '#fff5f5', border: '1px solid #fc8181', borderRadius: '8px', padding: '14px', color: '#c53030', fontSize: '13px', marginBottom: '16px' }}>
          ❌ {error}
        </div>
      )}

      {!loading && !error && locations.map((loc) => (
        <div
          key={loc.name}
          onClick={() => toggle(loc.name)}
          style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            border: `2px solid ${selected.has(loc.name) ? '#4299e1' : '#e2e8f0'}`,
            borderRadius: '10px', padding: '14px 16px', marginBottom: '10px',
            cursor: 'pointer', background: selected.has(loc.name) ? '#ebf8ff' : '#fff',
            transition: 'all 0.15s',
          }}
        >
          <div style={{
            width: '20px', height: '20px', borderRadius: '4px', flexShrink: 0,
            background: selected.has(loc.name) ? '#4299e1' : '#fff',
            border: `2px solid ${selected.has(loc.name) ? '#4299e1' : '#cbd5e0'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {selected.has(loc.name) && <span style={{ color: '#fff', fontSize: '13px', fontWeight: 700 }}>✓</span>}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: '#1a202c', fontSize: '14px' }}>{loc.title}</div>
            {loc.address && (
              <div style={{ color: '#718096', fontSize: '12px', marginTop: '2px' }}>
                {[loc.address.addressLines?.[0], loc.address.locality].filter(Boolean).join(', ')}
              </div>
            )}
            {loc.alreadyAdded && (
              <span style={{ fontSize: '11px', color: '#48bb78', fontWeight: 600 }}>Already monitoring</span>
            )}
          </div>
        </div>
      ))}

      {!loading && !error && (
        <button
          onClick={handleSave}
          disabled={saving || !selected.size}
          style={{
            marginTop: '8px', background: selected.size ? '#4299e1' : '#cbd5e0',
            color: '#fff', border: 'none', borderRadius: '8px', padding: '12px 24px',
            fontWeight: 700, cursor: selected.size ? 'pointer' : 'not-allowed', fontSize: '14px', width: '100%',
          }}
        >
          {saving ? 'Saving...' : `Monitor ${selected.size} location${selected.size !== 1 ? 's' : ''} →`}
        </button>
      )}
    </div>
  );
}

// Step 3: All done
function DoneStep({ savedCount, onGoToDashboard }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
      <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1a202c', marginBottom: '8px' }}>
        {savedCount} location{savedCount !== 1 ? 's' : ''} added!
      </h2>
      <p style={{ color: '#718096', lineHeight: 1.6, marginBottom: '28px' }}>
        Your stores are now being monitored. Click "Poll GMB Now" on the dashboard to fetch your first reviews.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
        <a href="/dashboard" style={{ display: 'inline-block', background: '#4299e1', color: '#fff', textDecoration: 'none', borderRadius: '10px', padding: '12px 28px', fontWeight: 700, fontSize: '15px' }}>
          Go to Dashboard →
        </a>
        <a href={`${API_BASE}/api/auth/google`} style={{ color: '#4299e1', fontSize: '13px', fontWeight: 600 }}>
          + Connect another Google account
        </a>
      </div>
    </div>
  );
}

function Login({ tenantId }) {
  const [step, setStep] = useState('loading');
  const [status, setStatus] = useState(null);
  const [savedCount, setSavedCount] = useState(0);

  useEffect(() => {
    async function determine() {
      if (!tenantId) { setStep('connect'); return; }
      try {
        const res = await axios.get(`${API_BASE}/api/auth/status`, {
          headers: { 'x-tenant-id': tenantId },
        });
        setStatus(res.data);
        // If there's a step=select-locations param in URL, go straight to picker
        const urlStep = new URLSearchParams(window.location.search).get('step');
        if (urlStep === 'select-locations' || !res.data.locationCount) {
          setStep('select');
        } else {
          setStep('done-existing');
        }
      } catch {
        setStep('connect');
      }
    }
    determine();
  }, [tenantId]);

  if (step === 'loading') {
    return <div style={{ textAlign: 'center', padding: '80px', color: '#718096' }}>Loading...</div>;
  }

  return (
    <div style={{ maxWidth: '540px', margin: '40px auto' }}>
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '36px 40px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>

        {step === 'connect' && <ConnectStep />}

        {step === 'select' && (
          <LocationStep
            tenantId={tenantId}
            businessName={status?.businessName || 'Your Account'}
            onDone={(count) => { setSavedCount(count); setStep('done-new'); }}
          />
        )}

        {step === 'done-new' && <DoneStep savedCount={savedCount} />}

        {step === 'done-existing' && (
          <div>
            <div style={{ background: '#f0fff4', border: '1px solid #9ae6b4', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
              <p style={{ margin: 0, color: '#276749', fontWeight: 600, fontSize: '14px' }}>
                ✓ Connected as {status?.businessName} — {status?.locationCount} location{status?.locationCount !== 1 ? 's' : ''} monitored
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button onClick={() => setStep('select')} style={{ background: '#edf2f7', color: '#2d3748', border: 'none', borderRadius: '8px', padding: '10px', fontWeight: 600, cursor: 'pointer', fontSize: '14px' }}>
                ⚙️ Edit monitored locations
              </button>
              <a href="/dashboard" style={{ display: 'block', textAlign: 'center', background: '#4299e1', color: '#fff', textDecoration: 'none', borderRadius: '8px', padding: '10px', fontWeight: 700, fontSize: '14px' }}>
                Go to Dashboard →
              </a>
              <a href={`${API_BASE}/api/auth/google`} style={{ textAlign: 'center', color: '#4299e1', fontSize: '13px', fontWeight: 600 }}>
                + Connect another Google account
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Login;
