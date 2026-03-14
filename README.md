# Mycelio

Relationship intelligence platform. Track people, interactions, events, communities, and connections in a network graph.

## Architecture

```
packages/
  shared/     — TypeScript types shared across packages
  api/        — Fastify REST API + MCP server (Drizzle ORM, Neon Postgres)
  dashboard/  — React + Vite + Tailwind + D3 network graph
```

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Create .env from template
cp .env.example .env
# Edit .env and set DATABASE_URL to your Neon connection string

# 3. Push schema to database
npm run db:push

# 4. Start API (port 3001)
npm run dev:api

# 5. Start dashboard (port 3000)
npm run dev:dashboard
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Neon Postgres connection string |
| `API_PORT` | No | API server port (default: 3001) |
| `API_KEY` | No | API key for authenticated requests (skip if empty) |
| `VITE_API_URL` | No | API base URL for dashboard in production |

## API Endpoints

All endpoints are prefixed with `/api`.

### People
- `GET /api/people?q=&tier=&tags=&organizationId=&limit=&offset=` — search people
- `GET /api/people/:id` — get person by ID
- `POST /api/people` — create person `{ name, email?, phone?, title?, organizationId?, tier?, tags?, notes? }`
- `PUT /api/people/:id` — update person (partial body)

### Interactions
- `GET /api/interactions?personId=&limit=` — list interactions (optionally filter by person)
- `POST /api/interactions` — log interaction `{ personId, type, summary, details?, occurredAt? }`

### Events
- `GET /api/events` — list events
- `GET /api/events/:id` — get event by ID
- `POST /api/events` — create event `{ name, date, location?, description?, attendeeIds?, tags? }`
- `PUT /api/events/:id` — update event (partial body)

### Communities
- `GET /api/communities` — list communities
- `GET /api/communities/:id` — get community by ID
- `GET /api/communities/:id/health` — get community health metrics
- `POST /api/communities` — create community `{ name, description?, memberIds?, tags? }`

### Connections
- `POST /api/connections` — create connection `{ fromPersonId, toPersonId, strength?, context? }`

### Graph
- `GET /api/graph` — get all nodes and edges for D3 visualization
- `GET /api/graph/path?from=&to=` — find connection paths between two people

### Follow-ups
- `GET /api/follow-ups` — get people who need follow-up, sorted by urgency

### Health
- `GET /api/health` — returns `{ status: "ok" }`

## Data Model

```
People ──┬── belong to ──→ Organizations
         ├── have many ──→ Interactions
         ├── attend ─────→ Events
         ├── belong to ──→ Communities
         └── linked via ─→ Connections (graph edges)
```

### Relationship Tiers
| Tier | Label | Follow-up cadence |
|------|-------|-------------------|
| 1 | Inner Circle | Weekly (7 days) |
| 2 | Key Relationships | Biweekly (14 days) |
| 3 | Active Network | Monthly (30 days) |
| 4 | Extended Network | Every 2 months (60 days) |
| 5 | Acquaintances | Quarterly (90 days) |

### Interaction Types
`meeting`, `email`, `call`, `social`, `event`, `intro`, `follow_up`, `other`

### Connection Strengths
`strong`, `medium`, `weak`

## MCP Server (Claude Code)

The MCP server runs as a stdio process for Claude Code integration.

```bash
npm run mcp
```

### Available Tools
| Tool | Description |
|---|---|
| `log_interaction` | Log an interaction with a person (auto-creates if new) |
| `query_people` | Search people by name, tier, tags, org |
| `get_person` | Get person details + recent interactions |
| `prep_event` | Get preparation brief for an event with attendee details |
| `suggest_intros` | Suggest introductions based on shared tags/orgs |
| `log_event` | Create a new event |
| `community_health` | Get health metrics for a community |
| `add_org` | Add a new organization |
| `find_connections` | Find connection paths between two people |
| `follow_ups` | Get follow-up queue sorted by urgency |

## Deployment

Deployed on Railway (API) + Railway/Vercel (Dashboard) with Neon Postgres.

```bash
# Docker (local production)
docker-compose up

# Database backup
./backup/backup.sh
```
