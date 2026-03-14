# Mycelio — Claude Code Instructions

You are working on Mycelio, a relationship intelligence platform. Use the MCP tools to interact with the database.

## Project Structure

- `packages/shared/` — shared TypeScript types
- `packages/api/` — Fastify API + Drizzle ORM + MCP server
- `packages/dashboard/` — React + Vite + Tailwind dashboard

## Key Files

- `packages/api/src/db/schema.ts` — database schema (6 tables)
- `packages/api/src/mcp/tools.ts` — MCP tool definitions
- `packages/api/src/services/` — business logic
- `packages/api/src/routes/` — HTTP route handlers

## MCP Tools Available

Use these tools to manage the relationship network:

- **log_interaction** — Log a meeting, call, email, etc. with a person. Accepts `personName` (will auto-find or create) or `personId`.
- **query_people** — Search for people by name, tier (1-5), tags, or organization.
- **get_person** — Get full details on a person including recent interaction history.
- **prep_event** — Get a preparation brief before an event: attendee details, last interactions, talking points.
- **suggest_intros** — Find introduction opportunities based on shared tags or organizations.
- **log_event** — Create an event with attendees.
- **community_health** — Check how active a community is: member count, stale members, avg tier.
- **add_org** — Add an organization to the network.
- **find_connections** — Find how two people are connected through the network.
- **follow_ups** — See who needs follow-up, sorted by urgency based on tier thresholds.

## Conventions

- All IDs are UUIDs
- Dates are ISO 8601 strings
- Tiers: 1 (Inner Circle, weekly) → 5 (Acquaintance, quarterly)
- Interaction types: meeting, email, call, social, event, intro, follow_up, other
- Connection strengths: strong, medium, weak
- Tags are freeform string arrays

## Development

```bash
npm run dev:api        # Start API on port 3001
npm run dev:dashboard  # Start dashboard on port 3000
npm run db:push        # Push schema changes to Neon
npm run mcp            # Start MCP server (stdio)
```
