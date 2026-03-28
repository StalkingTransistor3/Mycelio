# Mycelio

Relationship intelligence platform. Track people, interactions, events, organizations, campaigns, projects, and connection networks in a unified system with a D3 network graph, Gantt chart, and pipeline views.

## Features

- **People Management** -- Contact profiles with tiers (1-5), tags, milestones, talking points, communication preferences, and relationship stages
- **Interaction Logging** -- Track meetings, calls, emails, events, and intros with sentiment and energy scoring
- **Events & Venues** -- Event management with structured attendees (roles: speaker, organizer, sponsor, etc.) and venue tracking with capacity/vibe
- **Organizations** -- Companies and communities with health metrics, member tracking, and deduplication/merge
- **Network Graph** -- Interactive force-directed graph visualization (D3/sigma/graphology) with ego graphs, connection paths, influence scores, and micro-community detection
- **Follow-up Engine** -- Tier-based cadence system that surfaces who needs follow-up, with snooze, smart re-engagement, and daily cadence reports
- **Relationship Pipeline** -- Kanban-style stages (prospect -> warm -> active -> collaborator -> inner_circle) with transition history
- **Campaigns** -- Targeted outreach campaigns with member tracking, warmth scoring, and progress reporting
- **Projects & Gantt** -- Project management with tasks, priorities, dependencies, assignees, and an SVG-based multi-project Gantt chart
- **Intelligence Layer** -- Communication pattern analysis, reciprocity indexing, co-attendance tracking, availability/stress detection, and warm intro path finding
- **MCP Integration** -- 43 tools for Claude Code / AI agent access via stdio transport

## Architecture

```
packages/
  shared/     -- TypeScript types shared across packages (@mycelio/shared)
  api/        -- Fastify REST API + MCP server, Drizzle ORM, Neon Postgres (@mycelio/api)
  dashboard/  -- React + Vite + Tailwind + D3 network graph (@mycelio/dashboard)
```

**Tech stack:** TypeScript, Fastify, Drizzle ORM, Neon Postgres, React 19, Vite, Tailwind CSS, D3, sigma.js, graphology, react-force-graph-2d, TanStack React Query, MCP SDK

## Setup

```bash
# 1. Install dependencies (requires Node >= 20)
npm install

# 2. Create .env from template
cp .env.example .env
# Set DATABASE_URL to your Neon Postgres connection string

# 3. Push schema to database
npm run db:push

# 4. Start API server (port 3001)
npm run dev:api

# 5. Start dashboard (port 3000)
npm run dev:dashboard
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon Postgres connection string |
| `API_KEY` | No | API key for authenticated requests (auth skipped if unset) |
| `API_PORT` | No | API server port (default: 3001) |
| `VITE_API_URL` | No | API base URL for dashboard in production |

## API

All endpoints prefixed with `/api`. Full reference in [CLAUDE.md](./CLAUDE.md).

### Core Resources
- **People** -- CRUD + milestones, talking points, sentiment, co-attendance, reciprocity, pipeline stages, availability, intelligence endpoints
- **Interactions** -- Log and query interactions (with sentiment, energy, and event linking)
- **Events** -- CRUD with structured attendees and roles
- **Organizations** -- CRUD + health metrics, members, deduplication, merge
- **Venues** -- CRUD + search by capacity/vibe + event history
- **Connections** -- Create connections, query graph data, find paths
- **Follow-ups** -- Tier-based follow-up queue sorted by urgency
- **Campaigns** -- CRUD + member management + stats + reporting
- **Projects** -- CRUD + tasks + Gantt chart data
- **Graph** -- Full graph, ego graphs, influence scores, micro-communities, warm paths, social context
- **Cadence** -- Daily cadence reports and weekly compliance stats

## MCP Server

43 tools for AI agent integration via stdio transport.

```bash
npm run mcp
```

Tools cover all platform capabilities: logging interactions, querying people, event prep, intro suggestions, follow-ups, campaigns, projects, tasks, graph analytics, cadence reports, and more. Most tools accept both UUID and name parameters for convenience.

## Dashboard Views

| View | Description |
|------|-------------|
| Overview | Dashboard home with stats and recent activity |
| People | Searchable directory with tier/tag filtering |
| Person Detail | Full profile with interactions, milestones, connections |
| Events | Event list and detail with attendees |
| Organisations | Organization list with health metrics |
| Follow-ups | Prioritized follow-up queue |
| Pipeline | Kanban-style relationship stages |
| Campaigns | Campaign management with member tracking |
| Projects | Project list and task management |
| Gantt | Multi-project Gantt chart (SVG) |
| Venues | Venue directory with capacity/vibe search |
| Network | Interactive force-directed graph visualization |

## Data Model

```
People ----+---- belong to ----> Organizations
           |---- have many ----> Interactions
           |---- attend -------> Events (with roles)
           |---- linked via ---> Connections (graph edges)
           |---- tracked in ---> Campaign Members

Events ---- held at -----------> Venues

Projects -- contain -----------> Tasks (with dependencies)

Campaigns - contain -----------> Campaign Members
```

## Deployment

```bash
# Docker (local production)
docker-compose up

# Includes: Postgres (pgvector/pg16), API, Dashboard, Caddy reverse proxy

# Database backup
./backup/backup.sh
```

## Documentation

- [CLAUDE.md](./CLAUDE.md) -- Complete agent reference (schema, API routes, MCP tools, architecture)
- [docs/CADENCE_SYSTEM.md](./docs/CADENCE_SYSTEM.md) -- Cadence system design
- [docs/CONNECTION_RULES.md](./docs/CONNECTION_RULES.md) -- Connection scoring philosophy

## License

See [LICENSE](./LICENSE).
