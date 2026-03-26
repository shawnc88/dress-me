# Dress Me

Fashion-centric live-streaming platform with tiered subscriptions, interactive commerce, and AI personalization.

## Quick Start

```bash
# Install dependencies
npm install
cd server && npm install
cd ../client && npm install

# Start database (requires Docker)
docker-compose up -d

# Run database migrations
npm run db:migrate

# Start development servers
npm run dev
```

- **Client**: http://localhost:3000
- **API**: http://localhost:3001
- **Health check**: http://localhost:3001/health

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js, React, TailwindCSS, HLS.js |
| Backend | Express, TypeScript, Prisma, Socket.IO |
| Database | PostgreSQL, Redis |
| Payments | Stripe |
| Streaming | HLS/DASH (adaptive bitrate), WebRTC (private calls) |
| AI | Claude API / OpenAI (recommendations, moderation) |

## Project Structure

```
dress-me/
├── client/          # Next.js frontend
│   └── src/
│       ├── components/   # React components
│       ├── pages/        # Next.js pages
│       ├── hooks/        # Custom React hooks
│       └── styles/       # Global styles
├── server/          # Express backend
│   ├── prisma/      # Database schema & migrations
│   └── src/
│       ├── routes/       # API endpoints
│       ├── middleware/    # Auth, error handling
│       ├── services/     # Business logic (AI, streaming, payments)
│       └── config/       # Environment config
├── shared/          # Shared TypeScript types
├── tests/           # Test suites
└── docs/            # Documentation
```
