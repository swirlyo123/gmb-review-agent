import { useState, useEffect } from 'react';
import axios from 'axios';
import ReviewCard from '../components/ReviewCard';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function StatCard({ label, value, color }) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: '10px',
      padding: '16px 20px',
      minWidth: '120px',
      textAlign: 'center',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    }}>
      <div style={{ fontSize: '28px', fontWeight: 700, color: color || '#2d3748' }}>{value}</div>
      <div style={{ fontSize: '13px', color: '#718096', marginTop: '4px' }}>{label}</div>
    </div>
  );
}

function Dashboard() {
  const [reviews, setReviews] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  async function fetchReviews() {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/api/reviews`);
      setReviews(res.data.reviews);
      setCounts(res.data.counts);
      setError(null);
    } catch (err) {
      setError('Could not connect to backend. Make sure it is running on port 3001.');
      console.error('Dashboard fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReviews();
  }, []);

  function handleReplied(reviewId) {
    setReviews((prev) =>
      prev.map((r) => (r.id === reviewId ? { ...r, replyPosted: true } : r))
    );
    setCounts((prev) => ({ ...prev, unreplied: Math.max(0, (prev.unreplied || 1) - 1) }));
  }

  const filtered = filter === 'all'
    ? reviews
    : filter === 'unreplied'
    ? reviews.filter((r) => !r.replyPosted)
    : reviews.filter((r) => r.sentiment === filter);

  const filterBtnStyle = (val) => ({
    background: filter === val ? '#4299e1' : '#edf2f7',
    color: filter === val ? '#fff' : '#4a5568',
    border: 'none',
    borderRadius: '8px',
    padding: '6px 14px',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: '13px',
  });

  return (
    <div>
      <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#1a202c', marginBottom: '4px' }}>
        GMB Review Agent
      </h1>
      <p style={{ color: '#718096', marginBottom: '24px' }}>
        Monitor, analyze, and respond to your Google Business reviews.
      </p>

      {/* Stats */}
      {!loading && !error && (
        <div style={{ display: 'flex', gap: '12px', marginBottom: '28px', flexWrap: 'wrap' }}>
          <StatCard label="Total Reviews" value={counts.total || 0} color="#2d3748" />
          <StatCard label="Positive" value={counts.positive || 0} color="#38a169" />
          <StatCard label="Negative" value={counts.negative || 0} color="#e53e3e" />
          <StatCard label="Neutral" value={counts.neutral || 0} color="#718096" />
          <StatCard label="Need Reply" value={counts.unreplied || 0} color="#d97706" />
        </div>
      )}

      {/* Filters */}
      {!loading && !error && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <button style={filterBtnStyle('all')} onClick={() => setFilter('all')}>All</button>
          <button style={filterBtnStyle('positive')} onClick={() => setFilter('positive')}>✅ Positive</button>
          <button style={filterBtnStyle('negative')} onClick={() => setFilter('negative')}>❌ Negative</button>
          <button style={filterBtnStyle('neutral')} onClick={() => setFilter('neutral')}>➖ Neutral</button>
          <button style={filterBtnStyle('unreplied')} onClick={() => setFilter('unreplied')}>⚠️ Unreplied</button>
          <button
            onClick={fetchReviews}
            style={{ ...filterBtnStyle(''), marginLeft: 'auto', background: '#edf2f7' }}
          >
            🔄 Refresh
          </button>
        </div>
      )}

      {/* States */}
      {loading && (
        <div style={{ textAlign: 'center', color: '#718096', padding: '60px 0' }}>
          Loading reviews...
        </div>
      )}

      {error && (
        <div style={{
          background: '#fff5f5',
          border: '1px solid #fc8181',
          borderRadius: '10px',
          padding: '16px 20px',
          color: '#c53030',
        }}>
          ❌ {error}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div style={{ textAlign: 'center', color: '#718096', padding: '60px 0' }}>
          No reviews match this filter.
        </div>
      )}

      {/* Review list */}
      {filtered.map((review) => (
        <ReviewCard key={review.id} review={review} onReplied={handleReplied} />
      ))}
    </div>
  );
}

export default Dashboard;
