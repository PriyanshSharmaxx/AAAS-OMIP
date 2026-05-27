# Omip - Agent as a Service Platform

Run AI Agents in 2 clicks. A full-stack platform for discovering, running, and managing AI agents and orchestrating multi-agent automations.

## Architecture

```
omip/
├── frontend/        → Next.js 15 (App Router, TypeScript, Tailwind, shadcn/ui)
├── backend-node/    → Node.js (Express, Prisma, PostgreSQL, Redis)
├── project-mapping.md
└── README.md
```

## Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 16+
- Redis 7+

### Option 1: Docker (Recommended)

```bash
docker-compose up -d
```

Then start the frontend:
```bash
cd frontend
npm install
npm run dev
```

### Option 2: Local Development

**Backend:**
```bash
cd backend-node
npm install
npx prisma generate
npx prisma db push
npm run dev
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## Access Points

| Service    | URL                          |
|------------|------------------------------|
| Frontend   | http://localhost:3000         |
| Backend    | http://localhost:8000         |

## Core Features

- **Marketplace**: Discover and browse AI agents by category.
- **Advanced Agent Runner**: Multi-step execution wizard including permissions check, user experience selection (Technical/Non-Technical), API configuration, real-time validation, and streaming logs.
- **Leaderboards**: Comprehensive real-time rankings for Top Creators, Trending Agents, and Top API Providers (uptime, latency, usage).
- **Team Workspaces**: Collaborate with your team with Role-Based Access Control (RBAC), shared agents, and granular settings like ownership transfer and 2FA enforcement.
- **Automations**: Orchestrate complex multi-agent workflows and automations.
- **Creator Dashboard**: Build, publish, and track agent performance and revenue.
- **User Dashboard**: Monitor runs, manage API keys, and view history.
- **Async Processing**: Redis-backed queues for robust background agent execution.

## Tech Stack

### Frontend
- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS + shadcn/ui
- TanStack React Query
- Zustand (State Management)
- Framer Motion (Animations)
- Lucide React (Icons)

### Backend
- Node.js & Express
- Prisma ORM
- PostgreSQL
- Redis (BullMQ / Bull for queues)
- JWT Authentication

## API Endpoints (Core)

| Method | Endpoint              | Description               |
|--------|-----------------------|---------------------------|
| POST   | /api/v1/auth/signup   | Register new user         |
| POST   | /api/v1/auth/login    | Authenticate user         |
| GET    | /api/v1/agents        | List marketplace agents   |
| GET    | /api/v1/agents/{id}   | Get agent details         |
| POST   | /api/v1/runs          | Create an agent run       |
| GET    | /api/v1/teams         | Manage team workspaces    |
| GET    | /api/v1/leaderboard   | Fetch ranking statistics  |

## License

MIT
