import { useState, useEffect } from 'react';
import axios from 'axios';
import ReviewCard from '../components/ReviewCard';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function StatCard({ label, value, color, onClick, active }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: active ? color + '15' : '#fff',
        border: `2px solid ${active ? color : '#e2e8f0'}`,
        borderRadius: '10px',
        padding: '14px 18px',
        minWidth: '110px',
        textAlign: 'center',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.15s',
      }}
    >
      <div style={{ fontSize: '26px', fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: '12px', color: '#718096', marginTop: '3px', fontWeight: 500 }}>{label}</div>
    </div>
  );
}

function Dashboard({ tenantId }) {
  const [reviews, setReviews] = useState([]);
  const [counts, setCounts] = useState({});
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeLocation, setActiveLocation] = useState('all');
  const [polling, setPolling] = useState(false);
  const [pollResult, setPollResult] = useState(null);
  const [source, setSource] = useState('mock');

  const headers = tenantId ? { 'x-tenant-id': tenantId } : {};

  async function fetchReviews(locationId, status) {
    try {
      setLoading(true);
      const params = {};
      if (locationId && locationId !== 'all') params.locationId = locationId;
      if (status && status !== 'all') params.status = status;

      const res = await axios.get(`${API_BASE}/api/reviews`, { headers, params });
      setReviews(res.data.reviews || []);
      setCounts(res.data.counts || {});
      setLocations(res.data.locations || []);
      setSource(res.data.source || 'mock');
      setError(null);
    } catch (err) {
      setError('Could not connect to backend.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReviews();
  }, [tenantId]);

  async function handleTriggerPoll() {
    setPolling(true);
    setPollResult(null);
    try {
      const res = await axios.post(`${API_BASE}/api/reviews/trigger-poll`, {}, { headers });
      const stats = res.data.stats;
      setPollResult(stats.newReviews === 0
        ? 'No new reviews found.'
        : `${stats.newReviews} new review(s) fetched and analysed!`
      );
      await fetchReviews(activeLocation, activeFilter === 'all' ? null : activeFilter);
    } catch (err) {
      setPollResult('Poll failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setPolling(false);
      setTimeout(() => setPollResult(null), 6000);
    }
  }

  function handleFilterChange(filter) {
    setActiveFilter(filter);
    const status = filter === 'all' ? null : filter;
    fetchReviews(activeLocation === 'all' ? null : activeLocation, status);
  }

  function handleLocationChange(locId) {
    setActiveLocation(locId);
    const status = activeFilter === 'all' ? null : activeFilter;
    fetchReviews(locId === 'all' ? null : locId, status);
  }

  function handleApproved(reviewId) {
    setReviews((prev) => prev.map((r) =>
      r.id === reviewId ? { ...r, replyPosted: true, approvedAt: new Date().toISOString() } : r
    ));
    setCounts((prev) => ({
      ...prev,
      replied: (prev.replied || 0) + 1,
      pendingApproval: Math.max(0, (prev.pendingApproval || 1) - 1),
      needsAttention: reviews.find((r) => r.id === reviewId)?.sentiment === 'negative'
        ? Math.max(0, (prev.needsAttention || 1) - 1)
        : prev.needsAttention,
    }));
  }

  const filterButtons = [
    { key: 'all', label: 'All Reviews', color: '#4a5568' },
    { key: 'pending', label: '⏳ Pending Approval', color: '#d97706' },
    { key: 'needs_attention', label: '🚨 Needs Attention', color: '#e53e3e' },
    { key: 'replied', label: '✅ Replied', color: '#38a169' },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1a202c', margin: 0 }}>
            Review Dashboard
          </h1>
          <p style={{ color: '#718096', margin: '4px 0 0', fontSize: '14px' }}>
            {source === 'db' ? `${locations.length} location(s) monitored` : 'Demo data — connect GMB to see real reviews'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {source === 'db' && (
            <span style={{ background: '#c6f6d5', color: '#276749', fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '20px' }}>
              ● Live GMB
            </span>
          )}
          <button
            onClick={handleTriggerPoll}
            disabled={polling || !tenantId}
            style={{
              background: polling ? '#bee3f8' : '#4299e1',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontWeight: 700,
              cursor: polling || !tenantId ? 'not-allowed' : 'pointer',
              fontSize: '13px',
            }}
          >
            {polling ? '⏳ Polling...' : '🔄 Poll GMB Now'}
          </button>
        </div>
      </div>

      {/* Poll result toast */}
      {pollResult && (
        <div style={{
          background: pollResult.includes('failed') ? '#fff5f5' : '#f0fff4',
          border: `1px solid ${pollResult.includes('failed') ? '#fc8181' : '#9ae6b4'}`,
          borderRadius: '8px',
          padding: '10px 16px',
          marginBottom: '16px',
          fontSize: '14px',
          color: pollResult.includes('failed') ? '#c53030' : '#276749',
          fontWeight: 500,
        }}>
          {pollResult}
        </div>
      )}

      {/* Stat cards */}
      {!loading && !error && (
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <StatCard label="Total" value={counts.total || 0} color="#4a5568" />
          <StatCard label="Pending" value={counts.pendingApproval || 0} color="#d97706"
            onClick={() => handleFilterChange('pending')} active={activeFilter === 'pending'} />
          <StatCard label="🚨 Attention" value={counts.needsAttention || 0} color="#e53e3e"
            onClick={() => handleFilterChange('needs_attention')} active={activeFilter === 'needs_attention'} />
          <StatCard label="✅ Replied" value={counts.replied || 0} color="#38a169"
            onClick={() => handleFilterChange('replied')} active={activeFilter === 'replied'} />
          <StatCard label="Positive" value={counts.positive || 0} color="#38a169" />
          <StatCard label="Negative" value={counts.negative || 0} color="#e53e3e" />
        </div>
      )}

      {/* Location filter */}
      {locations.length > 1 && (
        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={() => handleLocationChange('all')}
            style={locBtnStyle(activeLocation === 'all')}
          >
            All Stores
          </button>
          {locations.map((loc) => (
            <button
              key={loc.id}
              onClick={() => handleLocationChange(loc.id)}
              style={locBtnStyle(activeLocation === loc.id)}
            >
              📍 {loc.name}
            </button>
          ))}
        </div>
      )}

      {/* Status filters */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {filterButtons.map((f) => (
          <button
            key={f.key}
            onClick={() => handleFilterChange(f.key)}
            style={{
              background: activeFilter === f.key ? f.color : '#edf2f7',
              color: activeFilter === f.key ? '#fff' : '#4a5568',
              border: 'none',
              borderRadius: '8px',
              padding: '6px 14px',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* States */}
      {loading && <div style={{ textAlign: 'center', color: '#718096', padding: '60px 0' }}>Loading reviews...</div>}

      {error && (
        <div style={{ background: '#fff5f5', border: '1px solid #fc8181', borderRadius: '10px', padding: '16px', color: '#c53030' }}>
          ❌ {error}
        </div>
      )}

      {!loading && !error && reviews.length === 0 && (
        <div style={{ textAlign: 'center', color: '#718096', padding: '60px 0' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>
            {activeFilter === 'pending' ? '🎉' : activeFilter === 'needs_attention' ? '✅' : '📭'}
          </div>
          {activeFilter === 'pending' ? 'All caught up — no replies pending!' :
           activeFilter === 'needs_attention' ? 'No negative reviews need attention.' :
           'No reviews yet. Click "Poll GMB Now" to fetch them.'}
        </div>
      )}

      {/* Review list */}
      {!loading && !error && reviews.map((review) => (
        <ReviewCard
          key={review.id}
          review={review}
          tenantId={tenantId}
          onApproved={handleApproved}
        />
      ))}
    </div>
  );
}

function locBtnStyle(active) {
  return {
    background: active ? '#2d3748' : '#edf2f7',
    color: active ? '#fff' : '#4a5568',
    border: 'none',
    borderRadius: '8px',
    padding: '5px 12px',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: '12px',
  };
}

export default Dashboard;
