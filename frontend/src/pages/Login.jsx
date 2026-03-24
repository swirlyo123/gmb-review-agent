const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function Login() {
  return (
    <div style={{ maxWidth: '480px', margin: '60px auto', textAlign: 'center' }}>
      <div style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '48px 40px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⭐</div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1a202c', marginBottom: '8px' }}>
          Connect your Google Business
        </h1>
        <p style={{ color: '#718096', lineHeight: 1.6, marginBottom: '32px' }}>
          Link your Google My Business account to start monitoring and responding to reviews automatically.
        </p>

        <a
          href={`${API_BASE}/api/auth/google`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            background: '#4285f4',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: '10px',
            padding: '14px 28px',
            fontWeight: 700,
            fontSize: '15px',
            boxShadow: '0 2px 8px rgba(66,133,244,0.4)',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Connect GMB Account
        </a>

        <div style={{ marginTop: '28px', padding: '16px', background: '#fffbeb', borderRadius: '10px', border: '1px solid #fbd38d' }}>
          <p style={{ fontSize: '13px', color: '#744210', margin: 0, lineHeight: 1.6 }}>
            <strong>Phase 2 Feature:</strong> Full Google OAuth integration is coming next. Right now this connects to a placeholder endpoint. Fill in your <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> in <code>.env</code> to enable it.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
