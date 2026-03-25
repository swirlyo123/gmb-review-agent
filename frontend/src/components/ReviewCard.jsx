import { useState } from 'react';
import axios from 'axios';
import SentimentBadge from './SentimentBadge';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function Stars({ rating }) {
  return (
    <span style={{ fontSize: '15px', letterSpacing: '1px' }}>
      {'⭐'.repeat(rating)}{'☆'.repeat(5 - rating)}
    </span>
  );
}

function ReviewCard({ review, tenantId, onApproved }) {
  const [replyText, setReplyText] = useState(review.autoReply || '');
  const [editing, setEditing] = useState(false);
  const [approving, setApproving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [approved, setApproved] = useState(review.replyPosted);
  const [currentReply, setCurrentReply] = useState(review.autoReply || '');

  const headers = tenantId ? { 'x-tenant-id': tenantId } : {};
  const isNegative = review.sentiment === 'negative';
  const isHighUrgency = review.urgency === 'high';

  async function handleApprove() {
    if (!replyText.trim()) return;
    setApproving(true);
    try {
      await axios.post(`${API_BASE}/api/reviews/${review.id}/approve`,
        { replyText },
        { headers }
      );
      setApproved(true);
      setEditing(false);
      if (onApproved) onApproved(review.id);
    } catch (err) {
      alert('Failed to post reply: ' + (err.response?.data?.error || err.message));
    } finally {
      setApproving(false);
    }
  }

  async function handleRegenerate() {
    setRegenerating(true);
    try {
      const res = await axios.post(`${API_BASE}/api/reviews/${review.id}/regenerate`, {}, { headers });
      const newReply = res.data.reply;
      setCurrentReply(newReply);
      setReplyText(newReply);
    } catch (err) {
      alert('Regeneration failed: ' + err.message);
    } finally {
      setRegenerating(false);
    }
  }

  const borderColor = approved ? '#c6f6d5' : isHighUrgency ? '#fed7d7' : isNegative ? '#feebc8' : '#e2e8f0';
  const leftBorder = isHighUrgency && !approved ? '4px solid #e53e3e' : approved ? '4px solid #48bb78' : '4px solid transparent';

  return (
    <div style={{
      background: '#fff',
      border: `1px solid ${borderColor}`,
      borderLeft: leftBorder,
      borderRadius: '10px',
      padding: '18px 20px',
      marginBottom: '14px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
            <span style={{ fontWeight: 700, fontSize: '15px', color: '#1a202c' }}>{review.authorName}</span>
            {isHighUrgency && !approved && (
              <span style={{ background: '#fed7d7', color: '#c53030', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px' }}>
                🚨 HIGH URGENCY
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Stars rating={review.starRating} />
            {review.locationName && (
              <span style={{ fontSize: '11px', color: '#718096', background: '#edf2f7', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
                📍 {review.locationName}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
          <SentimentBadge sentiment={review.sentiment} />
          {approved && (
            <span style={{ fontSize: '11px', color: '#48bb78', fontWeight: 700 }}>✓ Replied</span>
          )}
        </div>
      </div>

      {/* Review text */}
      <p style={{ color: '#4a5568', lineHeight: 1.6, margin: '10px 0', fontSize: '14px', fontStyle: 'italic' }}>
        "{review.comment}"
      </p>

      {/* Negative review alert */}
      {isNegative && !approved && (
        <div style={{ background: '#fff5f5', border: '1px solid #fed7d7', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px' }}>
          <p style={{ margin: 0, color: '#c53030', fontSize: '13px', fontWeight: 500 }}>
            ⚠️ Negative review — review the suggested reply carefully before posting. Consider reaching out to the customer directly.
          </p>
        </div>
      )}

      {/* AI suggested reply */}
      <div style={{ background: '#f7fafc', borderRadius: '8px', padding: '12px 14px', marginTop: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            AI Suggested Reply
          </span>
          {!approved && (
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              style={{ background: 'none', border: 'none', color: '#4299e1', fontSize: '12px', fontWeight: 600, cursor: 'pointer', padding: '2px 6px' }}
            >
              {regenerating ? '...' : '↻ Regenerate'}
            </button>
          )}
        </div>

        {editing && !approved ? (
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={4}
            style={{ width: '100%', border: '1px solid #cbd5e0', borderRadius: '6px', padding: '8px', fontSize: '14px', lineHeight: 1.5, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
          />
        ) : (
          <p style={{ color: '#2d3748', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
            {currentReply || <span style={{ color: '#a0aec0', fontStyle: 'italic' }}>No reply generated yet</span>}
          </p>
        )}
      </div>

      {/* Action buttons */}
      {!approved && currentReply && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={handleApprove}
            disabled={approving}
            style={{
              background: approving ? '#9ae6b4' : isNegative ? '#e53e3e' : '#48bb78',
              color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 18px',
              fontWeight: 700, cursor: approving ? 'not-allowed' : 'pointer', fontSize: '13px',
            }}
          >
            {approving ? 'Posting...' : '✅ Approve & Post to Google'}
          </button>
          <button
            onClick={() => { setEditing(!editing); if (!editing) setReplyText(currentReply); }}
            style={{ background: '#edf2f7', color: '#4a5568', border: 'none', borderRadius: '8px', padding: '8px 14px', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}
          >
            {editing ? '✕ Cancel' : '✏️ Edit Reply'}
          </button>
        </div>
      )}

      {/* Timestamp */}
      <div style={{ fontSize: '11px', color: '#a0aec0', marginTop: '10px' }}>
        {new Date(review.createdAt).toLocaleString()}
        {review.approvedAt && (
          <span style={{ marginLeft: '12px', color: '#68d391' }}>
            · Replied {new Date(review.approvedAt).toLocaleString()}
          </span>
        )}
      </div>
    </div>
  );
}

export default ReviewCard;
