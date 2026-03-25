function SentimentBadge({ sentiment }) {
  const config = {
    positive: { bg: '#c6f6d5', color: '#276749', dot: '#38a169', label: 'Positive' },
    negative: { bg: '#fed7d7', color: '#9b2335', dot: '#e53e3e', label: 'Negative' },
    neutral:  { bg: '#e2e8f0', color: '#4a5568', dot: '#a0aec0', label: 'Neutral' },
  };

  const { bg, color, dot, label } = config[sentiment] || config.neutral;

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '5px',
      background: bg,
      color,
      padding: '3px 10px',
      borderRadius: '20px',
      fontSize: '11px',
      fontWeight: 700,
      letterSpacing: '0.3px',
    }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: dot, display: 'inline-block', flexShrink: 0 }} />
      {label}
    </span>
  );
}

export default SentimentBadge;
