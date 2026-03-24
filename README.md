# GMB Review Agent

An AI-powered Google My Business review management SaaS. Automatically monitors new reviews, analyzes sentiment, generates smart replies using Claude AI, and delivers alerts via WhatsApp, Telegram, and Email.

---

## What This Does

- **Monitors** your Google Business reviews every 15 minutes
- **Analyzes** sentiment (positive/negative/neutral) and urgency using Claude AI
- **Generates** warm, human-sounding reply suggestions automatically
- **Delivers** instant alerts via WhatsApp (AiSensy), Telegram, and Email
- **Dashboard** to view all reviews, filter by sentiment, and post replies
- **Daily digest** summarizing all reviews at a configurable time

---

## Tech Stack

- **Backend:** Node.js + Express, SQLite via Prisma, node-cron
- **Frontend:** React (Vite), react-router-dom, axios
- **AI:** Anthropic Claude API (claude-sonnet-4-20250514)
- **Deploy:** Railway

---

## Setup

### 1. Copy and fill in your environment variables

```bash
cp .env.example backend/.env
```

Then open `backend/.env` and fill in your keys:

| Variable | Where to get it |
|---|---|
| `ANTHROPIC_API_KEY` | https://console.anthropic.com |
| `GOOGLE_CLIENT_ID` | Google Cloud Console → OAuth 2.0 |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console → OAuth 2.0 |
| `AISENSY_API_KEY` | AiSensy dashboard |
| `WHATSAPP_NUMBER` | Your WhatsApp number with country code |
| `TELEGRAM_BOT_TOKEN` | @BotFather on Telegram |
| `TELEGRAM_CHAT_ID` | @userinfobot on Telegram |
| `EMAIL_USER` | Your Gmail address |
| `EMAIL_PASS` | Gmail App Password (not your main password) |
| `EMAIL_TO` | Where digest emails should go |
| `BUSINESS_NAME` | Your business name (for reply tone) |

### 2. Set up the database

```bash
cd backend
npx prisma db push --schema=src/db/schema.prisma
```

---

## Running Locally

### Start the backend

```bash
cd backend
node src/index.js
```

Backend runs on http://localhost:3001
Health check: http://localhost:3001/health

### Start the frontend

```bash
cd frontend
npm run dev
```

Frontend runs on http://localhost:5173

---

## Deploy to Railway

1. Push this repo to GitHub
2. Go to https://railway.app → New Project → Deploy from GitHub
3. Select your repo
4. Add all environment variables from `.env.example` in Railway's Variables tab
5. Railway will auto-detect `railway.toml` and deploy

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/api/reviews` | Get all reviews with sentiment counts |
| POST | `/api/reviews/reply` | Mark a review as replied |
| POST | `/api/reviews/analyze` | Analyze a review with Claude AI |
| GET | `/api/auth/google` | Google OAuth (Phase 2) |

---

## Phase 2 Roadmap

- [ ] Full Google OAuth + GMB API integration
- [ ] Auto-post replies to GMB from the dashboard
- [ ] Multi-tenant support with separate configs per business
- [ ] Stripe billing for SaaS subscriptions
- [ ] Reply approval workflow before posting
