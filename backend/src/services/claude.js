const axios = require('axios');

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

async function analyzeSentiment(reviewText, starRating) {
  console.log(`🔍 Analyzing sentiment for ${starRating}-star review...`);

  const response = await axios.post(
    ANTHROPIC_API_URL,
    {
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      system: 'You are a review analysis assistant. Always reply in JSON only. No markdown.',
      messages: [
        {
          role: 'user',
          content: `Analyze this Google Business review and return a JSON object with exactly these fields:
- sentiment: one of "positive", "negative", or "neutral"
- summary: one sentence summarizing the review
- urgency: one of "high", "medium", or "low" (high = very negative or urgent complaint)

Star rating: ${starRating}/5
Review text: "${reviewText}"

Return only valid JSON, no other text.`,
        },
      ],
    },
    {
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
    }
  );

  const raw = response.data.content[0].text.trim();
  console.log(`✅ Sentiment analysis complete: ${raw}`);
  return JSON.parse(raw);
}

async function generateReply(reviewText, starRating, businessName) {
  console.log(`✍️  Generating reply for ${starRating}-star review at "${businessName}"...`);

  const tone =
    starRating >= 4
      ? 'warm, grateful, and enthusiastic'
      : 'empathetic, apologetic, and solution-focused';

  const response = await axios.post(
    ANTHROPIC_API_URL,
    {
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      system:
        'You are a professional business owner writing replies to Google reviews. Write in first person, sound human and genuine. Keep replies under 150 words.',
      messages: [
        {
          role: 'user',
          content: `Write a ${tone} reply to this ${starRating}-star Google review for "${businessName}".

Review: "${reviewText}"

Rules:
- Under 150 words
- Sound like a real human business owner, not a bot
- ${starRating >= 4 ? 'Thank them sincerely and highlight something specific they mentioned' : 'Acknowledge their concern, apologize sincerely, and offer a concrete next step (e.g. contact us directly)'}
- Do not use generic phrases like "We value your feedback"
- Return only the reply text, no quotes or extra formatting`,
        },
      ],
    },
    {
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
    }
  );

  const reply = response.data.content[0].text.trim();
  console.log(`✅ Reply generated (${reply.length} chars)`);
  return reply;
}

module.exports = { analyzeSentiment, generateReply };
