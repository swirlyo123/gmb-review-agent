import { useState } from 'react';
import axios from 'axios';
import SentimentBadge from './SentimentBadge';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function StarRating({ rating }) {
  return (
    <span style={{ fontSize: '16px', letterSpacing: '2px' }}>
      {'⭐'.repeat(rating)}
      {'☆'.repeat(5 - rating)}
    </span>
  );
}

function ReviewCard({ review, onReplied }) {
  const [replyText, setReplyText] = useState(review.autoReply || '');
  const [editing, setEditing] = useState(false);
  const [posting, setPosting] = useState(false);
  const [posted, setPosted] = useState(review.replyPosted);

  async function handlePostReply() {
    if (!replyText.trim()) return;
    setPosting(true);
    try {
      await axios.post(`${API_BASE}/api/reviews/reply`, {
        reviewId: review.id,
        replyText,
      });
      setPosted(true);
      setEditing(false);
      if (onReplied) onReplied(review.id);
      console.log(`✅ Reply posted for review ${review.id}`);
    } catch (err) {
      console.error('Failed to post reply:', err.message);
      alert('Failed to post reply. Check console for details.');
    } finally {
      setPosting(false);
    }
  }

  const cardStyle = {
    background: '#fff',
    border: `1px solid ${posted ? '#c6f6d5' : '#e2e8f0'}`,
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '16px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  };

  return (
    <div style={cardStyle}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '4px' }}>{review.authorName}</div>
          <StarRating rating={review.starRating} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
          <SentimentBadge sentiment={review.sentiment} />
          {posted && (
            <span style={{ fontSize: '11px', color: '#48bb78', fontWeight: 600 }}>✓ Replied</span>
          )}
        </div>
      </div>

      {/* Review text */}
      <p style={{ color: '#4a5568', lineHeight: 1.6, margin: '12px 0', fontSize: '14px' }}>
        "{review.comment}"
      </p>

      {/* Suggested reply */}
      {review.autoReply && (
        <div style={{ background: '#f7fafc', borderRadius: '8px', padding: '12px', marginTop: '12px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#718096', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            AI Suggested Reply
          </div>
          {editing ? (
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={4}
              style={{
                width: '100%',
                border: '1px solid #cbd5e0',
                borderRadius: '6px',
                padding: '8px',
                fontSize: '14px',
                lineHeight: 1.5,
                resize: 'vertical',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          ) : (
            <p style={{ color: '#2d3748', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
              {replyText}
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      {!posted && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
          <button
            onClick={handlePostReply}
            disabled={posting}
            style={{
              background: '#4299e1',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontWeight: 600,
              cursor: posting ? 'not-allowed' : 'pointer',
              opacity: posting ? 0.7 : 1,
              fontSize: '13px',
            }}
          >
            {posting ? 'Posting...' : '📤 Post Reply'}
          </button>
          <button
            onClick={() => setEditing(!editing)}
            style={{
              background: '#edf2f7',
              color: '#4a5568',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            {editing ? '✕ Cancel Edit' : '✏️ Edit Reply'}
          </button>
        </div>
      )}

      {/* Timestamp */}
      <div style={{ fontSize: '11px', color: '#a0aec0', marginTop: '10px' }}>
        {new Date(review.createdAt).toLocaleString()}
      </div>
    </div>
  );
}

export default ReviewCard;
