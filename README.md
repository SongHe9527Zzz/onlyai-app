# OnlyAI

**AI Character Platform** — Meet your AI companions. Subscribe. Chat. Connect.

Inspired by OnlyFans but AI-powered: creators design AI characters that produce content and interact with subscribers 24/7.

## Project Structure

```
onlyai-app/
├── frontend/              # React + Vite web app (GitHub Pages)
│   ├── src/
│   │   ├── pages/         # Feed, Explore, Profile, Chat, Auth, Subscription
│   │   ├── components/    # Reusable UI components
│   │   ├── services/      # API client + WebSocket client
│   │   ├── context/       # Auth context (login state)
│   │   └── data/          # Character definitions
│   ├── public/images/     # Character portraits
│   └── package.json
├── backend/               # Node.js + Express + Socket.IO API
│   ├── src/
│   │   ├── routes/        # Auth, Characters, Subscriptions, Messages
│   │   ├── models/        # Database layer (PostgreSQL + in-memory mock)
│   │   ├── services/      # AI service + Memory (3-layer isolation)
│   │   ├── middleware/     # JWT authentication
│   │   └── websocket/     # Real-time chat handler
│   └── package.json
└── README.md
```

## Getting Started

### Frontend (standalone with mock mode)

```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:3000
```

### Backend (for real API + WebSocket)

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your settings
npm run dev
# API at http://localhost:4000
```

## Features

### Phase 1 (Current)
- ✅ 7 AI characters with unique personalities
- ✅ Content feed with locked/preview posts
- ✅ Character profiles with bio, stats, tags
- ✅ Relationship level system
- ✅ Chat UI with WebSocket (mock + real)
- ✅ User registration/login (JWT)
- ✅ Subscription page with 3 tiers (Basic/Premium/VIP)
- ✅ In-memory mock database (no PostgreSQL required)

### Phase 2 (Coming)
- 🔲 Stripe payment integration
- 🔲 PostgreSQL database
- 🔲 Real AI API integration (DeepSeek/Qwen)
- 🔲 Three-layer memory system
- 🔲 Creator dashboard
- 🔲 Content auto-generation pipeline

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Routing | React Router v6 |
| Real-time | Socket.IO (WebSocket) |
| Backend | Node.js + Express |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| Database | PostgreSQL (via `pg`) + in-memory mock |
| AI API | OpenAI-compatible (DeepSeek/Qwen ready) |
| Payment | Stripe (integration path ready) |
| Deployment | GitHub Pages + Cloud Server |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/register | Create account |
| POST | /api/auth/login | Sign in |
| GET | /api/auth/me | Current user info |
| GET | /api/characters | List all characters |
| GET | /api/characters/:id | Character detail |
| GET | /api/subscriptions | User's subscriptions |
| POST | /api/subscriptions | Create subscription |
| DELETE | /api/subscriptions/:id | Cancel subscription |
| GET | /api/messages/:charId | Chat history |
| POST | /api/messages/:charId | Save message |

## WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| chat:join | client → server | Join character room |
| chat:message | client → server | Send chat message |
| chat:reply | server → client | AI reply |
| chat:typing | bidirectional | Typing indicator |
| chat:leave | client → server | Leave character room |

## AI Memory System

Three-layer memory isolation per (user, character) pair:

1. **Character Persona** — Fixed personality document
2. **User Profile** — Dynamic facts, preferences, relationship level
3. **Conversation History** — Recent messages (sliding window)
