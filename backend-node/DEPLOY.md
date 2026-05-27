# Omip AaaS — Deployment Guide

## Prerequisites

- PostgreSQL 15+
- Redis 7+
- Node.js 20+ (for self-hosted) **or** Docker

---

## Option A — Docker Compose (self-hosted / local production)

```bash
# 1. Copy and fill in secrets
cp .env.example .env
# Edit .env: set JWT_SECRET, OPENAI_API_KEY / ANTHROPIC_API_KEY, ALLOWED_ORIGINS

# 2. Build and start all services (postgres + redis + migrate + api + worker)
docker compose up --build -d

# 3. Verify
curl http://localhost:4000/health
# → { "status": "ok", "database": { "ok": true }, "redis": { "ok": true }, ... }
```

Services exposed:
| Service  | Port  |
|----------|-------|
| API      | 4000  |
| Postgres | 5432  |
| Redis    | 6379  |

To run migrations only (e.g. after a schema change):
```bash
docker compose run --rm migrate
```

---

## Option B — Railway

Railway auto-detects the Dockerfile. Deploy two services from the same repo:

### 1. Provision infrastructure
- Add a **PostgreSQL** plugin → copy `DATABASE_URL`
- Add a **Redis** plugin → copy `REDIS_URL`

### 2. Deploy the API service
- Source: this repo, root directory: `omip/backend-node`
- Start command: `node dist/server.js`
- Set environment variables (from `.env.example`)
- Add `TRUST_PROXY=1` (Railway sits behind a proxy)
- Add `ALLOWED_ORIGINS=https://your-frontend.railway.app`

### 3. Deploy the Worker service (same repo, second Railway service)
- Start command: `node dist/workers/index.js`
- Same env vars as API (no `PORT` needed)

### 4. Run migrations on first deploy
Add a deploy command or one-shot service:
```
npx prisma migrate deploy
```

---

## Option C — Render / Fly.io

Same pattern as Railway:
- Build command: `npm ci && npx prisma generate && npm run build`
- API start: `npx prisma migrate deploy && node dist/server.js`
- Worker start: `node dist/workers/index.js`
- Set `TRUST_PROXY=1`

---

## Environment Variables Reference

See `.env.example` for the full list with descriptions.

**Required:**
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | ≥32 char random string (`openssl rand -hex 32`) |
| `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` | At least one LLM key |
| `ALLOWED_ORIGINS` | Comma-separated frontend origins |

**Production defaults to set explicitly:**
```
NODE_ENV=production
LOG_LEVEL=info
TRUST_PROXY=1
RATE_LIMIT_MAX=100
WORKER_CONCURRENCY=5
```

---

## Migrations

```bash
# Development (creates migration files)
npm run db:migrate

# Production (applies existing migrations — safe to run on startup)
npm run db:migrate:prod

# Seed development data
npm run db:seed
```

---

## Health Check

`GET /health` returns:
```json
{
  "status": "ok",
  "database": { "ok": true, "latencyMs": 3 },
  "redis":    { "ok": true, "latencyMs": 1 },
  "queues":   { "agentRuns": { "active": 0, "waiting": 0 }, "workflowRuns": { "active": 0 } },
  "activeCrons": 1,
  "uptime": 3600
}
```
Returns HTTP `503` with `"status": "degraded"` if DB or Redis is unreachable.

---

## Scaling

- **API**: stateless — scale horizontally freely
- **Worker**: scale by adding more instances; BullMQ coordinates via Redis
- **Scheduler (crons)**: runs inside the worker process — run exactly **one** worker instance with crons enabled, or use a dedicated cron service
