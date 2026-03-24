import { useState } from 'react';

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

function Settings() {
  const [whatsapp, setWhatsapp] = useState('');
  const [telegram, setTelegram] = useState('');
  const [email, setEmail] = useState('');
  const [digestTime, setDigestTime] = useState('20:00');
  const [saved, setSaved] = useState(false);

  function handleSave() {
    const config = { whatsapp, telegram, email, digestTime };
    console.log('💾 Saving delivery config:', config);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    // Phase 2: POST to /api/settings with config
  }

  return (
    <div>
      <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#1a202c', marginBottom: '4px' }}>
        Notification Settings
      </h1>
      <p style={{ color: '#718096', marginBottom: '28px' }}>
        Configure where you receive review alerts and your daily digest.
      </p>

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '28px', maxWidth: '520px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#2d3748', marginBottom: '20px', marginTop: 0 }}>
          📣 Delivery Channels
        </h2>

        <FormField
          label="WhatsApp Number"
          value={whatsapp}
          onChange={setWhatsapp}
          placeholder="+1234567890"
          hint="Include country code. Used with AiSensy API."
        />

        <FormField
          label="Telegram Chat ID"
          value={telegram}
          onChange={setTelegram}
          placeholder="-100123456789"
          hint="Get your chat ID by messaging @userinfobot on Telegram."
        />

        <FormField
          label="Email Address"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="you@example.com"
          hint="Alerts and daily digests will be sent here."
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

        <button
          onClick={handleSave}
          style={{
            background: '#4299e1',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 24px',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          {saved ? '✅ Saved!' : '💾 Save Settings'}
        </button>
      </div>
    </div>
  );
}

export default Settings;
