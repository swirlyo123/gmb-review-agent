import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function FormField({ label, type = 'text', value, onChange, placeholder, hint }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <label style={{ display: 'block', fontWeight: 600, color: '#2d3748', marginBottom: '6px', fontSize: '14px' }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          border: '1px solid #cbd5e0',
          borderRadius: '8px',
          padding: '10px 12px',
          fontSize: '14px',
          color: '#2d3748',
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
      {hint && <p style={{ fontSize: '12px', color: '#718096', marginTop: '4px' }}>{hint}</p>}
    </div>
  );
}

function Settings({ tenantId }) {
  const [whatsapp, setWhatsapp] = useState('');
  const [telegram, setTelegram] = useState('');
  const [email, setEmail] = useState('');
  const [digestTime, setDigestTime] = useState('20:00');
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // 'success' | 'error' | null
  const [loadError, setLoadError] = useState(null);

  // Load existing config on mount
  useEffect(() => {
    if (!tenantId) return;
    async function loadConfig() {
      try {
        const res = await axios.get(`${API_BASE}/api/settings`, {
          headers: { 'x-tenant-id': tenantId },
        });
        const c = res.data.config;
        if (c.whatsappNumber) setWhatsapp(c.whatsappNumber);
        if (c.telegramChatId) setTelegram(c.telegramChatId);
        if (c.email) setEmail(c.email);
        if (c.digestTime) setDigestTime(c.digestTime);
      } catch (err) {
        setLoadError('Could not load settings.');
      }
    }
    loadConfig();
  }, [tenantId]);

  async function handleSave() {
    if (!tenantId) {
      setSaveStatus('error');
      return;
    }
    setSaving(true);
    setSaveStatus(null);
    try {
      await axios.post(`${API_BASE}/api/settings`, {
        whatsappNumber: whatsapp,
        telegramChatId: telegram,
        email,
        digestTime,
      }, { headers: { 'x-tenant-id': tenantId } });
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      console.error('Save failed:', err.message);
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#1a202c', marginBottom: '4px' }}>
        Notification Settings
      </h1>
      <p style={{ color: '#718096', marginBottom: '28px' }}>
        Configure where you receive review alerts and your daily digest.
      </p>

      {!tenantId && (
        <div style={{ background: '#fff5f5', border: '1px solid #fc8181', borderRadius: '10px', padding: '14px 18px', color: '#c53030', marginBottom: '20px', fontSize: '14px' }}>
          ⚠️ Not connected to GMB. <a href="/login" style={{ color: '#4285f4', fontWeight: 600 }}>Connect your account first →</a>
        </div>
      )}

      {loadError && (
        <div style={{ background: '#fffbeb', border: '1px solid #fbd38d', borderRadius: '10px', padding: '12px 16px', color: '#744210', marginBottom: '20px', fontSize: '13px' }}>
          {loadError}
        </div>
      )}

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '28px', maxWidth: '520px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#2d3748', marginBottom: '20px', marginTop: 0 }}>
          📣 Delivery Channels
        </h2>

        <FormField
          label="WhatsApp Number"
          value={whatsapp}
          onChange={setWhatsapp}
          placeholder="+91xxxxxxxxxx"
          hint="Include country code (+91 for India). Requires AiSensy API key in backend .env."
        />

        <FormField
          label="Telegram Chat ID"
          value={telegram}
          onChange={setTelegram}
          placeholder="-100123456789"
          hint="Get your chat ID by messaging @userinfobot on Telegram."
        />

        <FormField
          label="Alert Email Address"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="you@example.com"
          hint="New review alerts and daily digests will be sent here."
        />

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontWeight: 600, color: '#2d3748', marginBottom: '6px', fontSize: '14px' }}>
            Daily Digest Time
          </label>
          <input
            type="time"
            value={digestTime}
            onChange={(e) => setDigestTime(e.target.value)}
            style={{
              border: '1px solid #cbd5e0',
              borderRadius: '8px',
              padding: '10px 12px',
              fontSize: '14px',
              color: '#2d3748',
              outline: 'none',
            }}
          />
          <p style={{ fontSize: '12px', color: '#718096', marginTop: '4px' }}>
            You'll receive a daily review summary at this time.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={handleSave}
            disabled={saving || !tenantId}
            style={{
              background: saving ? '#90cdf4' : '#4299e1',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 24px',
              fontWeight: 700,
              cursor: saving || !tenantId ? 'not-allowed' : 'pointer',
              fontSize: '14px',
            }}
          >
            {saving ? 'Saving...' : '💾 Save Settings'}
          </button>

          {saveStatus === 'success' && (
            <span style={{ color: '#48bb78', fontWeight: 600, fontSize: '14px' }}>✅ Saved!</span>
          )}
          {saveStatus === 'error' && (
            <span style={{ color: '#e53e3e', fontWeight: 600, fontSize: '14px' }}>❌ Save failed</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default Settings;
