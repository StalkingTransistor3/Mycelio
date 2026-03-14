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

## Data Quality Standards

When adding or updating data, always follow these standards:

- **Events** MUST have: `url` (link to event page, Meetup, Eventbrite, Luma, conference site), `description`, `location`, `date`, and `tags`
- **Organizations** MUST have: `domain` (website URL)
- **People** SHOULD have: `notes` with context about the relationship
- **Tags**: lowercase, hyphenated, consistent with existing tags in the system
- **Organizations with special roles**: Tag with `sponsor` (evidence of sponsoring past events) or `host` (evidence of contributing venue to past events) where applicable
- When adding new data, always research and verify before inserting — search the web for official URLs, correct dates, and accurate descriptions
- Prefer official/primary sources for URLs (e.g., the event's own website over a third-party listing)

## Development

```bash
npm run dev:api        # Start API on port 3001
npm run dev:dashboard  # Start dashboard on port 3000
npm run db:push        # Push schema changes to Neon
npm run mcp            # Start MCP server (stdio)
```
