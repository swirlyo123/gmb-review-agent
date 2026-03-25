Replace the entire contents of CLAUDE.md with the following. 
Do not summarise or shorten anything — write it exactly as given:

---

# CLAUDE.md — GMB Review Agent
> Read this file at the start of EVERY session. This is your full context.

---

## WHO IS BUILDING THIS

**Prajwal** — entrepreneur, non-technical founder. Runs SWIRLYO (frozen yogurt brand, 
multiple locations) and Unfold Creative Studio (consultancy). 

**How to work with Prajwal:**
- He is not a coder. Never explain syntax. Explain what things DO and why.
- Make all technical decisions yourself. Don't ask "should I use X or Y?" — pick the 
  best option and tell him what you chose and why in one sentence.
- After EVERY task: (1) what was built, (2) exactly how to test it right now, 
  (3) what the next step is. Always in that order.
- When something breaks: diagnose it, fix it, tell him what it was. Don't ask him to 
  manually edit files unless there is absolutely no other way.
- Use console.log with emoji at every major step so he can follow the terminal.
- Windows machine. Bash shell. Always use `//F` not `/F` for taskkill.
- Kill stale servers before starting new ones: `taskkill //F //IM node.exe`
- Be decisive and fast. He is building a real product, not learning to code.

---

## WHAT WE ARE BUILDING

**Product name:** GMB Review Agent  
**One line:** An AI agent that monitors your Google Business reviews, replies 
automatically, and keeps you informed — on autopilot.

**The problem it solves:**
Most small business owners (restaurants, salons, clinics, retail) get Google reviews 
daily but never respond. They don't have time. A bad review sits unanswered for weeks 
and kills their rating. A good review gets no acknowledgement. They're losing customers 
and don't even know it.

**What our product does:**
1. Connects to their Google My Business account via OAuth
2. Monitors reviews every 15 minutes automatically
3. For every new review — runs AI sentiment analysis (positive/negative/neutral + urgency)
4. Generates a warm, human-sounding personalised reply using Claude API
5. For 4-5 star reviews: auto-posts the reply to Google immediately
6. For 1-3 star reviews: sends the reply to the owner for approval first
7. Delivers instant alerts via WhatsApp, Telegram, or Email with the review + suggested reply
8. Sends a daily digest summary every evening with stats and highlights
9. Web dashboard to view all reviews, approve pending replies, configure settings

**Who pays for this:**
- Restaurant owners, café chains, salon operators, clinics, hotels
- Any local business that depends on Google reviews for customers
- Marketing agencies managing reputation for multiple clients

**Why this wins:**
- Fully automated — set it and forget it
- Replies in minutes, not days
- Sounds human — not like a bot wrote it
- Works on WhatsApp which every Indian business owner already uses
- Affordable subscription — costs less than one lost customer per month

---

## CURRENT STATUS

**POC phase — building on SWIRLYO's own GMB account as the test case**

| Phase | Status | Summary |
|---|---|---|
| 0 | ✅ Done | VS Code, Claude Code, Node.js, project folder, git init |
| 1 | ✅ Done | Full scaffold: Express backend, React frontend, Prisma SQLite DB, all service files created, mock reviews on dashboard |
| 2 | ✅ Done | Google OAuth 2.0 working, GMB API connected, getLocations + getReviews + postReply built, token refresh logic, tenantId flow |
| 3 | ✅ Done | Claude AI pipeline working — analyzeSentiment() + generateReply() tested and verified with real review text |
| 4 | 🔄 In progress | Location selection UI, frontend UI overhaul, trigger-poll endpoint, real reviews loading |
| 5 | 🔜 Next | Polling engine live end-to-end: real review → WhatsApp alert within 15 min |
| 6 | 🔜 | Daily digest, delivery channels all tested |
| 7 | 🔜 | Multi-tenant auth (Clerk) — multiple customers can use it |
| 8 | 🔜 | Stripe billing — customers pay before using |
| 9 | 🔜 | Landing page + public launch |

**What is working RIGHT NOW:**
- Backend running at localhost:3001
- Frontend running at localhost:5173
- Google OAuth flow → connects GMB account → stores tenantId in localStorage
- GET /api/auth/locations → returns real GMB locations
- analyzeSentiment() → returns sentiment + urgency + summary from Claude API
- generateReply() → returns human-sounding reply from Claude API
- Dashboard showing mock reviews (real reviews need location selected + trigger-poll)

**What is NOT working yet:**
- Location selection UI (user connected GMB but can't pick which outlet)
- Real reviews not loading on dashboard (tenantId not being passed correctly in some flows)
- Polling engine not tested end-to-end with real GMB data
- WhatsApp/Telegram/Email not tested with real credentials
- No Stripe billing yet
- No multi-tenant isolation yet

---

## PROJECT STRUCTURE
gmb-agent/
├── backend/                     # Node.js + Express (port 3001)
│   ├── src/
│   │   ├── index.js             # Server entry, CORS, routes, starts polling
│   │   ├── routes/
│   │   │   ├── auth.js          # OAuth flow, location select, status
│   │   │   └── reviews.js       # Get reviews, analyze, post reply, trigger poll
│   │   ├── services/
│   │   │   ├── claude.js        # AI: analyzeSentiment() + generateReply()
│   │   │   ├── gmb.js           # GMB API: locations, reviews, postReply, token refresh
│   │   │   ├── delivery.js      # WhatsApp, Telegram, Email, notifyAll()
│   │   │   └── digest.js        # Daily summary builder
│   │   ├── jobs/
│   │   │   └── pollReviews.js   # Cron every 15 min + startPolling() + triggerPoll()
│   │   └── db/
│   │       └── schema.prisma    # Tenant, Review, DeliveryConfig models
│   └── .env                     # Secrets — never commit
├── frontend/                    # React + Vite (port 5173)
│   └── src/
│       ├── App.jsx              # Router, TenantBootstrap, NavBar, Toast system
│       ├── pages/
│       │   ├── Dashboard.jsx    # Stats, filter bar, review cards, trigger poll
│       │   ├── Settings.jsx     # Delivery config, reply mode, digest time
│       │   └── Login.jsx        # GMB connect, location picker (3 states)
│       └── components/
│           ├── ReviewCard.jsx   # Full review card with editable AI reply
│           └── SentimentBadge.jsx
├── CLAUDE.md                    # This file — read every session
├── .env.example                 # Template for .env
├── railway.toml                 # Railway deployment config
└── .gitignore
---

## ALL API ENDPOINTS

### Auth
| Method | Endpoint | What it does |
|---|---|---|
| GET | /api/auth/google | Redirects to Google OAuth consent screen |
| GET | /api/auth/google/callback | Exchanges code for tokens, creates/updates Tenant in DB, redirects to frontend |
| GET | /api/auth/status | Returns { connected, businessName, locationName, locationId, lastPolled } |
| GET | /api/auth/locations | Lists all GMB locations for this tenant |
| POST | /api/auth/select-location | Saves chosen locationId + locationName to Tenant |

### Reviews
| Method | Endpoint | What it does |
|---|---|---|
| GET | /api/reviews | Returns all reviews (real from DB, or mock fallback) |
| POST | /api/reviews/analyze | Analyze text + generate reply via Claude (one-off test) |
| POST | /api/reviews/:id/approve | Post the saved autoReply to GMB, mark replyPosted=true |
| POST | /api/reviews/trigger-poll | Manually runs the poll job once immediately |

### Settings
| Method | Endpoint | What it does |
|---|---|---|
| GET | /api/settings | Returns DeliveryConfig for tenant |
| POST | /api/settings | Saves DeliveryConfig for tenant |

### System
| Method | Endpoint | What it does |
|---|---|---|
| GET | /health | Returns { status: "ok" } |

**All authenticated endpoints require header: `x-tenant-id: <tenantId>`**  
Frontend reads tenantId from localStorage and sends it with every request.

---

## SERVICE FUNCTIONS REFERENCE

### claude.js
- `analyzeSentiment(reviewText, starRating)` 
  → `{ sentiment: "positive|negative|neutral", urgency: "high|medium|low", summary: "one line" }`
- `generateReply(reviewText, starRating, businessName)` 
  → plain string, under 150 words, human tone

### gmb.js
- `getLocations(accessToken)` → array of locations
- `getReviews(accessToken, locationId)` → array of reviews
- `postReply(accessToken, locationId, reviewId, replyText)` → posts to Google
- `getValidAccessToken(tenant)` → auto-refreshes if near expiry, returns valid token

### delivery.js
- `sendWhatsApp(message, phoneNumber)` → AiSensy API
- `sendTelegram(message, chatId)` → Telegram Bot API  
- `sendEmail(subject, body, toEmail)` → Gmail SMTP via Nodemailer
- `notifyAll(reviewData, sentiment, reply)` → calls all three via Promise.allSettled

### pollReviews.js
- `startPolling()` → registers cron job, runs once on startup
- `triggerPoll()` → runs one poll cycle immediately, returns stats

---

## THE FULL PIPELINE (end to end)

This is what a fully working system does:
GMB Review Posted by Customer
↓
pollReviews.js (every 15 min)
↓
getValidAccessToken(tenant) → refresh if needed
↓
getReviews(accessToken, locationId) → fetch from GMB API
↓
Filter: only reviews not already in DB (by gmbReviewId)
↓
For each new review:
analyzeSentiment(text, stars) → Claude API → sentiment + urgency + summary
generateReply(text, stars, businessName) → Claude API → reply draft
↓
If 4-5 stars: save with replyPosted=false, flag for auto-post
If 1-3 stars: save with replyPosted=false, flag for approval
↓
notifyAll() → WhatsApp + Telegram + Email
(message: stars, author, review snippet, sentiment, suggested reply)
↓
Update tenant.lastPolled
↓
Owner receives WhatsApp message within 15 minutes of review being posted
Owner clicks approve (1-3 star) OR reply auto-posts (4-5 star)
↓
postReply(accessToken, locationId, reviewId, replyText) → back to GMB API
Review shows as "Replied" on Google

---

## ENVIRONMENT VARIABLES
```env
# Core
PORT=3001
DATABASE_URL=file:./dev.db

# AI (required)
ANTHROPIC_API_KEY=

# Google OAuth (required for GMB)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/google/callback

# Delivery channels (all optional, system works without them)
AISENSY_API_KEY=
WHATSAPP_NUMBER=            # +91xxxxxxxxxx format
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
EMAIL_USER=                 # Gmail address
EMAIL_PASS=                 # Gmail App Password (not login password)
EMAIL_TO=

# App
BUSINESS_NAME=SWIRLYO
FRONTEND_URL=http://localhost:5173
```

---

## HOW TO RUN
```bash
# Kill any stale node processes first (Windows)
taskkill //F //IM node.exe

# Backend
cd gmb-agent/backend
node src/index.js

# Frontend (new terminal)
cd gmb-agent/frontend
npm run dev

# Prisma commands (always from backend/ directory)
npx prisma studio --schema=src/db/schema.prisma
npx prisma db push --schema=src/db/schema.prisma
npx prisma generate --schema=src/db/schema.prisma
```

---

## CODING RULES — NON-NEGOTIABLE

1. `async/await` everywhere — never `.then()` chains
2. All secrets from `process.env` — zero hardcoded keys ever
3. `console.log('🔍 description')` at every major step
4. Graceful errors — if WhatsApp fails, still send Telegram and Email
5. Always use `Promise.allSettled` in notifyAll() not `Promise.all`
6. Always pass `--schema=src/db/schema.prisma` to all Prisma CLI commands
7. Windows bash: use `//F` not `/F` for taskkill
8. Register all new routes in `backend/src/index.js`
9. All DB queries must include tenantId filter — data isolation matters
10. After every session: git commit with a clear message

---

## WHAT NOT TO DO

- Never commit `backend/.env` or `dev.db`
- Never hardcode API keys or tokens anywhere
- Never call GMB API without going through `getValidAccessToken()` first
- Never use `.then()` chains
- Never run Prisma without `--schema=src/db/schema.prisma`
- Never add a feature without testing it first
- Never leave a TODO comment — either build it or don't include it
- Never ask Prajwal to manually edit code — fix it yourself

---

## IMMEDIATE NEXT TASKS (do these in order)

1. Fix location selection UI in Login.jsx — user must be able to pick 
   their SWIRLYO outlet after OAuth connects
2. Fix dashboard to pass tenantId header and load real reviews
3. Wire trigger-poll endpoint fully — runs pipeline, returns stats
4. Test full pipeline: trigger-poll → real reviews appear on dashboard
5. Test WhatsApp delivery with real AISENSY_API_KEY
6. Confirm auto-reply posts back to GMB for a 5-star review

After all 6 are done → POC is proven → move to SaaS features.