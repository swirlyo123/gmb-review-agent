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
**One line:** An AI agent that monitors your Google Business reviews, generates replies
automatically, and lets you approve or post them — all from your phone via Telegram.

**The problem it solves:**
Most small business owners get Google reviews daily but never respond. They don't have
time. A bad review sits unanswered for weeks and kills their rating. A good review gets
no acknowledgement. They're losing customers and don't even know it.

**What our product does:**
1. Connects to their Google My Business account via OAuth
2. Monitors reviews every 15 minutes automatically
3. For every new review — runs AI sentiment analysis (positive/negative/neutral + urgency)
4. Generates a warm, human-sounding personalised reply using Claude API
5. Sends instant Telegram alert with the review + suggested reply
6. Owner can reply APPROVE / REJECT / SHORTEN / IMPROVE directly in Telegram
7. Auto-posts to Google based on replyMode setting (auto_positive / auto_all / hold_all)
8. Sends a daily digest summary at the owner's configured time
9. Web dashboard to view all reviews, approve pending replies, configure settings

**Who pays for this:**
- Restaurant owners, café chains, salon operators, clinics, hotels
- Any local business that depends on Google reviews for customers
- Marketing agencies managing reputation for multiple clients

---

## CURRENT STATUS

**POC running on SWIRLYO's own GMB account. Waiting for Google API quota approval.**

| Phase | Status | Summary |
|---|---|---|
| 0 | ✅ Done | VS Code, Claude Code, Node.js, project folder, git init |
| 1 | ✅ Done | Full scaffold: Express backend, React frontend, Prisma SQLite DB |
| 2 | ✅ Done | Google OAuth 2.0, GMB API (getLocations/getReviews/postReply), token refresh |
| 3 | ✅ Done | Claude AI pipeline: analyzeSentiment() + generateReply() working |
| 4 | ✅ Done | Dashboard, Login (3-state), Settings, trigger-poll, toast system, UI polish |
| 4b | ✅ Done | Prisma singleton, notifications wired, daily digest, demo approval fix |
| 4c | ✅ Done | Auto-test on boot, Telegram bot (APPROVE/REJECT/SHORTEN/IMPROVE), long-polling |
| 4d | ✅ Done | replyMode logic works, digestTime per-tenant, gitignore clean |
| 5 | ⏳ Waiting | GMB API quota approval from Google (submitted — ETA 1–5 business days) |
| 6 | 🔜 | Polling live end-to-end with real SWIRLYO reviews |
| 7 | 🔜 | Multi-tenant auth (Clerk) |
| 8 | 🔜 | Stripe billing |
| 9 | 🔜 | Landing page + public launch |

---

## WHAT IS WORKING RIGHT NOW

- Backend: localhost:3001
- Frontend: localhost:5173
- Google OAuth → connects GMB → stores tenantId in localStorage
- Claude AI: analyzeSentiment() + generateReply() — proven with real text
- Dashboard: stats cards, filter pills, skeleton loading, location filter, toast system
- Dashboard: demo banner when on mock data, "Poll GMB Now" button
- Login: 3-state — ConnectView / LocationView / ConnectedView
- Settings: toggle switches, WhatsApp/Telegram/Email channels, reply mode cards, digest time
- ReviewCard: sentiment coloring, urgency flag, edit reply, regenerate, approve & post
- Trigger poll: runs mock reviews through Claude AI, saves to DB, shows on dashboard
- Notifications: fires on new reviews via Telegram (WhatsApp/Email config ready)
- Telegram bot: APPROVE / REJECT / SHORTEN / IMPROVE commands work from chat
- Daily digest: sends at per-tenant configured time via all enabled channels
- Auto-test: runs on server boot, sends Telegram message to confirm pipeline works
- replyMode: auto_positive / auto_all / hold_all — actually applied during poll
- Prisma singleton: one DB connection shared across all routes

## WHAT IS NOT WORKING YET (blocked on Google)

- Real GMB reviews not loading — quota still 0 (request submitted to Google)
- Location picker in /login can't load real locations — same quota issue
- postReply to real GMB locations — works in code, blocked by quota

---

## PROJECT STRUCTURE

```
gmb-agent/
├── backend/                         # Node.js + Express (port 3001)
│   ├── src/
│   │   ├── index.js                 # Server entry, CORS, routes, Telegram poller
│   │   ├── lib/
│   │   │   └── prisma.js            # Singleton PrismaClient (import from here)
│   │   ├── routes/
│   │   │   ├── auth.js              # OAuth, /locations, /select-locations, /status
│   │   │   ├── reviews.js           # GET reviews, approve, regenerate, trigger-poll
│   │   │   ├── settings.js          # GET/POST DeliveryConfig
│   │   │   └── telegram.js          # Webhook endpoint + handleCommand()
│   │   ├── services/
│   │   │   ├── claude.js            # analyzeSentiment() + generateReply()
│   │   │   ├── gmb.js               # getLocations, getReviews, postReply, token refresh
│   │   │   ├── delivery.js          # sendWhatsApp/Telegram/Email, notifyAll()
│   │   │   ├── digest.js            # sendDailyDigest()
│   │   │   └── telegramPoller.js    # getUpdates long-polling for local dev
│   │   ├── jobs/
│   │   │   └── pollReviews.js       # 15-min cron + triggerPoll() + replyMode logic
│   │   ├── scripts/
│   │   │   ├── testFlow.js          # Auto-test on boot (once/day guard)
│   │   │   ├── diagnoseTelegram.js  # Run to debug Telegram issues
│   │   │   └── setWebhook.js        # Run once after deploy to register webhook
│   │   └── db/
│   │       └── schema.prisma        # Tenant, Location, Review, DeliveryConfig
│   └── .env                         # Secrets — never commit
├── frontend/                        # React + Vite (port 5173)
│   └── src/
│       ├── App.jsx                  # Router, ToastContext, NavBar, TenantBootstrap
│       ├── pages/
│       │   ├── Dashboard.jsx        # Stats, filters, skeleton, poll button, demo banner
│       │   ├── Settings.jsx         # Channels, reply mode cards, digest time
│       │   └── Login.jsx            # 3-state: connect / location picker / connected
│       └── components/
│           ├── ReviewCard.jsx       # Full card: approve, edit, regenerate
│           └── SentimentBadge.jsx
├── CLAUDE.md                        # This file — read every session
├── .env.example                     # Template
├── railway.toml                     # Railway deploy config
└── .gitignore
```

---

## KEY TECHNICAL DECISIONS

- **Prisma singleton**: always import `{ prisma }` from `'../lib/prisma'` — never `new PrismaClient()`
- **tenantId**: read from `req.headers['x-tenant-id']` on backend, `localStorage.getItem('tenantId')` on frontend
- **Demo location**: `gmbLocationId === 'demo-mock-location'` — excluded from real GMB poll, handled specially in approve
- **Telegram**: long-polling (`telegramPoller.js`) in local dev; set `TELEGRAM_WEBHOOK_URL` in production to switch to webhook mode
- **replyMode**: `auto_all` posts everything, `auto_positive` posts 4-5⭐ only, `hold_all` holds all (default)
- **digestTime**: per-tenant HH:MM stored in DeliveryConfig — checked every minute by cron

---

## ALL API ENDPOINTS

### Auth
| Method | Endpoint | What it does |
|---|---|---|
| GET | /api/auth/google | Redirects to Google OAuth |
| GET | /api/auth/google/callback | Exchanges code, upserts Tenant, redirects to /login?tenantId=xxx |
| GET | /api/auth/status | Returns { connected, businessName, locations[], locationCount } |
| GET | /api/auth/locations | Lists all GMB locations from Google API |
| POST | /api/auth/select-locations | Saves selected Location records to DB |
| DELETE | /api/auth/locations/:id | Deactivates a location |

### Reviews
| Method | Endpoint | What it does |
|---|---|---|
| GET | /api/reviews | All reviews for tenant (filters: locationId, status, sentiment) |
| POST | /api/reviews/trigger-poll | Runs one poll cycle now — demo pipeline if no real locations |
| POST | /api/reviews/:id/approve | Posts reply to GMB, marks replyPosted=true |
| POST | /api/reviews/:id/regenerate | Re-runs Claude on this review |
| POST | /api/reviews/analyze | One-off test: analyze text + generate reply |

### Settings
| Method | Endpoint | What it does |
|---|---|---|
| GET | /api/settings | Returns DeliveryConfig for tenant |
| POST | /api/settings | Upserts DeliveryConfig |

### Telegram
| Method | Endpoint | What it does |
|---|---|---|
| POST | /api/telegram/webhook | Receives Telegram messages (production webhook mode) |

### System
| Method | Endpoint | What it does |
|---|---|---|
| GET | /health | Returns { status: "ok" } |

**All authenticated endpoints require: `x-tenant-id: <tenantId>` header**

---

## ENVIRONMENT VARIABLES

```env
PORT=3001
DATABASE_URL=file:./dev.db
ANTHROPIC_API_KEY=                    # Claude AI — required
GOOGLE_CLIENT_ID=                     # OAuth — required
GOOGLE_CLIENT_SECRET=                 # OAuth — required
GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/google/callback
AISENSY_API_KEY=                      # WhatsApp — optional
WHATSAPP_NUMBER=                      # +91xxxxxxxxxx
TELEGRAM_BOT_TOKEN=                   # required for Telegram
TELEGRAM_CHAT_ID=                     # your personal chat ID
TEST_TELEGRAM_CHAT_ID=                # same as above usually
TELEGRAM_WEBHOOK_URL=                 # set in production to enable webhook mode
EMAIL_USER=                           # Gmail address
EMAIL_PASS=                           # Gmail App Password
EMAIL_TO=                             # recipient
BUSINESS_NAME=SWIRLYO
FRONTEND_URL=http://localhost:5173
```

---

## HOW TO RUN

```bash
# Kill stale processes (Windows bash)
taskkill //F //IM node.exe

# Backend (port 3001)
cd gmb-agent/backend
node src/index.js

# Frontend (port 5173)
cd gmb-agent/frontend
npm run dev

# Prisma (always from backend/ with --schema flag)
npx prisma studio --schema=src/db/schema.prisma
npx prisma db push --schema=src/db/schema.prisma
npx prisma generate --schema=src/db/schema.prisma

# Diagnostic scripts
node src/scripts/diagnoseTelegram.js
node src/scripts/testFlow.js
```

---

## CODING RULES — NON-NEGOTIABLE

1. `async/await` everywhere — never `.then()` chains
2. All secrets from `process.env` — zero hardcoded keys ever
3. `console.log('🔍 description')` at every major step
4. Graceful errors — if WhatsApp fails, still send Telegram and Email
5. Always use `Promise.allSettled` in notifyAll() not `Promise.all`
6. Always pass `--schema=src/db/schema.prisma` to Prisma CLI commands
7. Windows bash: use `//F` not `/F` for taskkill
8. Register all new routes in `backend/src/index.js`
9. All DB queries must include tenantId filter — data isolation matters
10. Import prisma from `'../lib/prisma'` — never `new PrismaClient()`
11. After every session: git commit with a clear message

---

## WHAT NOT TO DO

- Never commit `backend/.env` or `dev.db`
- Never hardcode API keys or tokens anywhere
- Never call GMB API without going through `getValidAccessToken()` first
- Never use `.then()` chains
- Never run Prisma without `--schema=src/db/schema.prisma`
- Never `new PrismaClient()` in any file — use the singleton
- Never ask Prajwal to manually edit code — fix it yourself

---

## NEXT STEPS (in order)

1. **Wait for Google GMB quota approval** — email submitted, ETA 1–5 business days
2. **Once approved**: re-run OAuth as `hello@swirlyo.in`, select all 8 SWIRLYO locations, trigger poll → real reviews appear
3. **Phase 6**: verify full live pipeline — real review → Telegram alert → APPROVE command → reply posted to Google
4. **Phase 7**: Clerk multi-tenant auth — so other businesses can sign up
5. **Phase 8**: Stripe billing — subscription gating
6. **Phase 9**: Landing page + public launch
