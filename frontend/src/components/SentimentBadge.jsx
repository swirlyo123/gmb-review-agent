function SentimentBadge({ sentiment }) {
  const config = {
    positive: { bg: '#c6f6d5', color: '#276749', label: '✅ Positive' },
    negative: { bg: '#fed7d7', color: '#9b2335', label: '❌ Negative' },
    neutral:  { bg: '#e2e8f0', color: '#4a5568', label: '➖ Neutral' },
  };

  const { bg, color, label } = config[sentiment] || config.neutral;

  return (
    <span style={{
      background: bg,
      color,
      padding: '2px 10px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: 600,
      letterSpacing: '0.3px',
    }}>
      {label}
    </span>
  );
}

export default SentimentBadge;
