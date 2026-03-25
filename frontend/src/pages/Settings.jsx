import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// ─── Toggle switch ─────────────────────────────────────────────────────────────
function Toggle({ on, onChange }) {
  return (
    <div
      onClick={() => onChange(!on)}
      style={{
        width: '44px', height: '24px', borderRadius: '12px', flexShrink: 0,
        background: on ? '#2563eb' : '#cbd5e0',
        position: 'relative', cursor: 'pointer',
        transition: 'background 0.2s',
      }}
    >
      <div style={{
        position: 'absolute', top: '3px',
        left: on ? '23px' : '3px',
        width: '18px', height: '18px', borderRadius: '50%',
        background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        transition: 'left 0.2s',
      }} />
      <style>{`@keyframes togOn{from{left:3px}to{left:23px}}@keyframes togOff{from{left:23px}to{left:3px}}`}</style>
    </div>
  );
}

// ─── Channel row ───────────────────────────────────────────────────────────────
function Channel({ icon, name, enabled, onToggle, value, onChange, placeholder }) {
  return (
    <div style={{ padding: '16px 0', borderBottom: '1px solid #f1f5f9' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: enabled ? '12px' : 0 }}>
        <span style={{ fontSize: '20px' }}>{icon}</span>
        <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '14px', flex: 1 }}>{name}</span>
        <Toggle on={enabled} onChange={onToggle} />
      </div>
      {enabled && (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width: '100%', border: '1.5px solid #e2e8f0', borderRadius: '8px',
            padding: '9px 12px', fontSize: '14px', color: '#0f172a',
            outline: 'none', boxSizing: 'border-box',
            transition: 'border-color 0.15s',
          }}
          onFocus={(e) => e.target.style.borderColor = '#2563eb'}
          onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
        />
      )}
    </div>
  );
}

// ─── Reply mode radio card ─────────────────────────────────────────────────────
function ModeCard({ value, current, onSelect, title, desc, recommended }) {
  const active = current === value;
  return (
    <div
      onClick={() => onSelect(value)}
      style={{
        border: `2px solid ${active ? '#2563eb' : '#e2e8f0'}`,
        borderRadius: '10px', padding: '14px 16px', marginBottom: '10px',
        cursor: 'pointer', background: active ? '#eff6ff' : '#fff',
        transition: 'all 0.15s', position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0,
          border: `2px solid ${active ? '#2563eb' : '#cbd5e0'}`,
          background: active ? '#2563eb' : '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {active && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fff' }} />}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {title}
            {recommended && (
              <span style={{ background: '#2563eb', color: '#fff', fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '10px', letterSpacing: '0.3px' }}>
                RECOMMENDED
              </span>
            )}
          </div>
          <div style={{ color: '#64748b', fontSize: '12px', marginTop: '2px' }}>{desc}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Card wrapper ──────────────────────────────────────────────────────────────
function Card({ title, children }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <h2 style={{ margin: '0 0 18px', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>{title}</h2>
      {children}
    </div>
  );
}

// ─── Settings page ─────────────────────────────────────────────────────────────
export default function Settings({ tenantId, showToast }) {
  const tid = tenantId || localStorage.getItem('tenantId');
  const headers = tid ? { 'x-tenant-id': tid } : {};

  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [whatsapp, setWhatsapp]               = useState('');
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [telegram, setTelegram]               = useState('');
  const [emailEnabled, setEmailEnabled]       = useState(false);
  const [email, setEmail]                     = useState('');
  const [digestTime, setDigestTime]           = useState('20:00');
  const [replyMode, setReplyMode]             = useState('hold_all');
  const [businessName, setBusinessName]       = useState('');
  const [saving, setSaving]                   = useState(false);

  useEffect(() => {
    if (!tid) return;
    axios.get(`${API_BASE}/api/settings`, { headers })
      .then((res) => {
        const c = res.data.config;
        if (!c) return;
        setWhatsappEnabled(!!c.whatsappEnabled);
        setWhatsapp(c.whatsappNumber || '');
        setTelegramEnabled(!!c.telegramEnabled);
        setTelegram(c.telegramChatId || '');
        setEmailEnabled(!!c.emailEnabled);
        setEmail(c.email || '');
        setDigestTime(c.digestTime || '20:00');
        setReplyMode(c.replyMode || 'hold_all');
        setBusinessName(c.businessName || '');
      })
      .catch(() => {});
  }, [tid]);

  async function save() {
    if (!tid) { showToast?.('Connect your GMB account first', 'error'); return; }
    setSaving(true);
    try {
      await axios.post(`${API_BASE}/api/settings`, {
        whatsappEnabled, whatsappNumber: whatsapp,
        telegramEnabled, telegramChatId: telegram,
        emailEnabled, email,
        digestTime, replyMode, businessName,
      }, { headers });
      showToast?.('Settings saved ✓', 'success');
    } catch {
      showToast?.('Save failed', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: '580px' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>Settings</h1>
      <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 24px' }}>
        Configure how you receive alerts and how replies are handled.
      </p>

      {!tid && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '14px 16px', color: '#991b1b', marginBottom: '20px', fontSize: '13px' }}>
          ⚠️ <a href="/login" style={{ color: '#2563eb', fontWeight: 700 }}>Connect your GMB account first</a> to save settings.
        </div>
      )}

      <Card title="📣 Delivery Channels">
        <Channel
          icon="📱" name="WhatsApp" enabled={whatsappEnabled}
          onToggle={setWhatsappEnabled} value={whatsapp} onChange={setWhatsapp}
          placeholder="+91xxxxxxxxxx (include country code)"
        />
        <Channel
          icon="✈️" name="Telegram" enabled={telegramEnabled}
          onToggle={setTelegramEnabled} value={telegram} onChange={setTelegram}
          placeholder="-100xxxxxxxxxx (get from @userinfobot)"
        />
        <Channel
          icon="📧" name="Email" enabled={emailEnabled}
          onToggle={setEmailEnabled} value={email} onChange={setEmail}
          placeholder="you@example.com"
        />
        {!whatsappEnabled && !telegramEnabled && !emailEnabled && (
          <p style={{ margin: '12px 0 0', fontSize: '12px', color: '#94a3b8' }}>
            Toggle at least one channel to receive review alerts.
          </p>
        )}
      </Card>

      <Card title="🤖 Reply Preferences">
        <ModeCard
          value="auto_all"
          current={replyMode}
          onSelect={setReplyMode}
          title="Auto-post everything"
          desc="AI replies to all reviews immediately — no approval needed"
        />
        <ModeCard
          value="auto_positive"
          current={replyMode}
          onSelect={setReplyMode}
          title="Auto-post 4–5 ⭐ only, hold 1–3 ⭐ for approval"
          desc="Good reviews go out instantly. Negative ones wait for your sign-off"
          recommended
        />
        <ModeCard
          value="hold_all"
          current={replyMode}
          onSelect={setReplyMode}
          title="Hold all for my approval"
          desc="Every reply sits in the dashboard until you approve it"
        />

        <div style={{ marginTop: '20px' }}>
          <label style={{ display: 'block', fontWeight: 600, color: '#334155', fontSize: '13px', marginBottom: '6px' }}>
            Daily Digest Time
          </label>
          <input
            type="time"
            value={digestTime}
            onChange={(e) => setDigestTime(e.target.value)}
            style={{ border: '1.5px solid #e2e8f0', borderRadius: '8px', padding: '9px 12px', fontSize: '14px', color: '#0f172a', outline: 'none' }}
          />
          <p style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0 0' }}>
            Daily review summary will be sent at this time.
          </p>
        </div>

        <div style={{ marginTop: '20px' }}>
          <label style={{ display: 'block', fontWeight: 600, color: '#334155', fontSize: '13px', marginBottom: '6px' }}>
            Business Name (used in AI replies)
          </label>
          <input
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="e.g. SWIRLYO Indiranagar"
            style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: '8px', padding: '9px 12px', fontSize: '14px', color: '#0f172a', outline: 'none', boxSizing: 'border-box' }}
            onFocus={(e) => e.target.style.borderColor = '#2563eb'}
            onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
          />
        </div>
      </Card>

      <button
        onClick={save}
        disabled={saving}
        style={{
          background: saving ? '#93c5fd' : '#2563eb',
          color: '#fff', border: 'none', borderRadius: '9px',
          padding: '11px 28px', fontWeight: 700, fontSize: '14px',
          cursor: saving ? 'not-allowed' : 'pointer',
        }}
      >
        {saving ? 'Saving...' : '💾 Save Settings'}
      </button>
    </div>
  );
}
