import { useState, useEffect } from 'react';
import axios from 'axios';
import ReviewCard from '../components/ReviewCard';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// ─── Skeleton loader ──────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', marginBottom: '14px' }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .sk { background:#e2e8f0; border-radius:6px; animation:pulse 1.5s ease-in-out infinite; }
      `}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div>
          <div className="sk" style={{ height: '14px', width: '120px', marginBottom: '8px' }} />
          <div className="sk" style={{ height: '12px', width: '80px' }} />
        </div>
        <div className="sk" style={{ height: '22px', width: '70px', borderRadius: '12px' }} />
      </div>
      <div className="sk" style={{ height: '12px', width: '100%', marginBottom: '6px' }} />
      <div className="sk" style={{ height: '12px', width: '80%' }} />
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, color, active, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: active ? color + '12' : '#fff',
      border: `1.5px solid ${active ? color : '#e2e8f0'}`,
      borderRadius: '10px',
      padding: '14px 16px',
      minWidth: '100px',
      textAlign: 'center',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'all 0.15s',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}>
      <div style={{ fontSize: '24px', fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</div>
    </div>
  );
}

// ─── Filter pill ──────────────────────────────────────────────────────────────
function Pill({ label, active, color = '#2563eb', onClick }) {
  return (
    <button onClick={onClick} style={{
      background: active ? color : '#f1f5f9',
      color: active ? '#fff' : '#475569',
      border: 'none',
      borderRadius: '20px',
      padding: '6px 14px',
      fontWeight: 600,
      cursor: 'pointer',
      fontSize: '13px',
      transition: 'all 0.15s',
      whiteSpace: 'nowrap',
    }}>{label}</button>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard({ tenantId, showToast, setIsLive }) {
  const [reviews, setReviews]         = useState([]);
  const [counts, setCounts]           = useState({});
  const [locations, setLocations]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [polling, setPolling]         = useState(false);
  const [source, setSource]           = useState('mock');
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeLocation, setActiveLocation] = useState('all');

  const tid = tenantId || localStorage.getItem('tenantId');
  const headers = tid ? { 'x-tenant-id': tid } : {};

  async function fetchReviews(locId = activeLocation, filter = activeFilter) {
    try {
      setLoading(true);
      const params = {};
      if (locId && locId !== 'all') params.locationId = locId;
      if (filter && filter !== 'all') params.status = filter;

      const res = await axios.get(`${API_BASE}/api/reviews`, { headers, params });
      setReviews(res.data.reviews || []);
      setCounts(res.data.counts || {});
      setLocations(res.data.locations || []);
      const src = res.data.source || 'mock';
      setSource(src);
      if (setIsLive) setIsLive(src === 'db');
    } catch {
      showToast?.('Could not load reviews', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchReviews(); }, [tid]);

  async function handlePoll() {
    setPolling(true);
    showToast?.('Polling for new reviews…', 'info');
    try {
      const res = await axios.post(`${API_BASE}/api/reviews/trigger-poll`, {}, { headers });
      const stats = res.data.stats || {};
      const { newReviews, demo } = stats;
      if (demo && newReviews > 0) {
        showToast?.(`Demo pipeline: ${newReviews} review(s) analysed by Claude AI ✓`, 'success');
      } else if (demo) {
        showToast?.('Demo reviews already in DB — all caught up!', 'info');
      } else {
        showToast?.(
          newReviews > 0 ? `${newReviews} new review(s) found and analysed!` : 'All caught up — no new reviews.',
          newReviews > 0 ? 'success' : 'info'
        );
      }
      setTimeout(() => fetchReviews(), 1200);
    } catch (err) {
      showToast?.(err.response?.data?.error || 'Poll failed', 'error');
    } finally {
      setPolling(false);
    }
  }

  function changeFilter(f) {
    setActiveFilter(f);
    fetchReviews(activeLocation, f);
  }

  function changeLocation(l) {
    setActiveLocation(l);
    fetchReviews(l, activeFilter);
  }

  function handleApproved(id) {
    setReviews((p) => p.map((r) => r.id === id ? { ...r, replyPosted: true, approvedAt: new Date().toISOString() } : r));
    setCounts((p) => ({ ...p, replied: (p.replied || 0) + 1, pendingApproval: Math.max(0, (p.pendingApproval || 1) - 1) }));
    showToast?.('Reply posted to Google ✓', 'success');
  }

  const isMock = source === 'mock';

  return (
    <div>
      {/* Demo banner */}
      {isMock && (
        <div style={{ background: '#fefce8', border: '1px solid #fde047', borderRadius: '10px', padding: '12px 18px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '14px', color: '#854d0e', fontWeight: 500 }}>
            ⚠️ Demo mode — showing sample data. Connect your GMB account to see real reviews.
          </span>
          <a href="/login" style={{ background: '#2563eb', color: '#fff', textDecoration: 'none', borderRadius: '7px', padding: '7px 16px', fontWeight: 700, fontSize: '13px', whiteSpace: 'nowrap' }}>
            Connect Now →
          </a>
        </div>
      )}

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#0f172a' }}>Review Dashboard</h1>
          <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#64748b' }}>
            {!isMock ? `${locations.length} store(s) monitored · All reviews require your approval before posting` : 'Sample reviews — connect GMB to see yours'}
          </p>
        </div>
        <button
          onClick={handlePoll}
          disabled={polling}
          style={{ background: polling ? '#93c5fd' : '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', padding: '9px 18px', fontWeight: 700, cursor: polling ? 'not-allowed' : 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          {polling ? '⏳ Polling...' : '🔄 Poll GMB Now'}
        </button>
      </div>

      {/* Stat cards */}
      {!loading && (
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <StatCard label="Total" value={counts.total || 0} color="#475569" />
          <StatCard label="Pending" value={counts.pendingApproval || 0} color="#d97706" active={activeFilter === 'pending'} onClick={() => changeFilter('pending')} />
          <StatCard label="Attention" value={counts.needsAttention || 0} color="#dc2626" active={activeFilter === 'needs_attention'} onClick={() => changeFilter('needs_attention')} />
          <StatCard label="Replied" value={counts.replied || 0} color="#16a34a" active={activeFilter === 'replied'} onClick={() => changeFilter('replied')} />
          <StatCard label="Positive" value={counts.positive || 0} color="#16a34a" />
          <StatCard label="Negative" value={counts.negative || 0} color="#dc2626" />
        </div>
      )}

      {/* Store filter */}
      {locations.length > 1 && (
        <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
          <Pill label="All Stores" active={activeLocation === 'all'} color="#0f172a" onClick={() => changeLocation('all')} />
          {locations.map((l) => (
            <Pill key={l.id} label={`📍 ${l.name}`} active={activeLocation === l.id} color="#0f172a" onClick={() => changeLocation(l.id)} />
          ))}
        </div>
      )}

      {/* Status filter */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '22px', flexWrap: 'wrap' }}>
        <Pill label="All Reviews" active={activeFilter === 'all'} onClick={() => changeFilter('all')} />
        <Pill label="⏳ Pending Approval" active={activeFilter === 'pending'} color="#d97706" onClick={() => changeFilter('pending')} />
        <Pill label="🚨 Needs Attention" active={activeFilter === 'needs_attention'} color="#dc2626" onClick={() => changeFilter('needs_attention')} />
        <Pill label="✅ Replied" active={activeFilter === 'replied'} color="#16a34a" onClick={() => changeFilter('replied')} />
      </div>

      {/* Loading skeletons */}
      {loading && [1,2,3].map((n) => <SkeletonCard key={n} />)}

      {/* Empty state */}
      {!loading && reviews.length === 0 && (
        <div style={{ textAlign: 'center', padding: '64px 24px', color: '#94a3b8' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>
            {activeFilter === 'pending' ? '🎉' : activeFilter === 'needs_attention' ? '✅' : '📭'}
          </div>
          <p style={{ fontWeight: 600, fontSize: '16px', color: '#475569', margin: '0 0 8px' }}>
            {activeFilter === 'pending' ? 'All caught up!' : activeFilter === 'needs_attention' ? 'No urgent reviews' : 'No reviews yet'}
          </p>
          <p style={{ fontSize: '13px', margin: 0 }}>
            {activeFilter === 'all' && !isMock ? 'Click "Poll GMB Now" to fetch your latest reviews.' : ''}
            {activeFilter === 'all' && isMock ? 'Connect your GMB account to see real reviews.' : ''}
          </p>
          {activeFilter === 'all' && isMock && (
            <a href="/login" style={{ display: 'inline-block', marginTop: '16px', background: '#2563eb', color: '#fff', textDecoration: 'none', borderRadius: '8px', padding: '9px 20px', fontWeight: 700, fontSize: '13px' }}>
              Connect GMB →
            </a>
          )}
        </div>
      )}

      {/* Review list */}
      {!loading && reviews.map((r) => (
        <ReviewCard key={r.id} review={r} tenantId={tid} onApproved={handleApproved} showToast={showToast} />
      ))}
    </div>
  );
}
