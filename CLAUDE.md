# Mycelio -- Agent Reference

> Relationship intelligence platform. People, interactions, events, organizations, campaigns, projects, and a network graph -- all in one system.

## Project Structure

```
mycelio/                         # npm workspaces monorepo (Node >= 20)
  package.json                   # Root workspace config, top-level scripts
  .env                           # Environment variables (DATABASE_URL, API_KEY, etc.)
  docker-compose.yml             # Local prod stack: Postgres, API, Dashboard, Caddy
  packages/
    shared/                      # @mycelio/shared -- TypeScript types and interfaces
      src/types.ts               # ALL type definitions (entities, enums, API types)
      src/index.ts               # Re-exports types.ts
    api/                         # @mycelio/api -- Fastify REST API + MCP server
      src/
        index.ts                 # Fastify app entry point, registers all route plugins
        auth.ts                  # API key auth plugin (x-api-key header, skipped if no API_KEY)
        db/
          index.ts               # Drizzle ORM + Neon serverless client (lazy singleton)
          schema.ts              # Database schema (10 tables)
        routes/                  # HTTP route handlers (Fastify plugins)
          health.ts              # GET /api/health
          people.ts              # People CRUD + milestones, talking points, sentiment, co-attendance, reciprocity, stages, availability, intelligence
          interactions.ts        # Interactions CRUD
          events.ts              # Events CRUD
          organizations.ts       # Organizations CRUD + health + members + deduplication/merge
          venues.ts              # Venues CRUD + search + event history
          graph.ts               # Graph data, ego graph, paths, influence, communities, warm paths, social context, connections CRUD
          follow-ups.ts          # Follow-up queue
          campaigns.ts           # Campaigns CRUD + members CRUD + stats
          cadence.ts             # Daily cadence report + weekly stats
          projects.ts            # Projects CRUD + Tasks CRUD + Gantt data
          docs.ts                # Self-describing API schema/docs endpoints
        services/                # Business logic (called by routes AND MCP tools)
          people.ts              # People search, CRUD, milestones, talking points
          interactions.ts        # Interaction logging, queries, sentiment trajectory
          events.ts              # Event CRUD
          organizations.ts       # Organization CRUD, health metrics, name search
          connections.ts         # Connection CRUD, graph data, ego graph, path finding
          venues.ts              # Venue CRUD, search, history
          follow-ups.ts          # Follow-up computation (tier-based cadence)
          campaigns.ts           # Campaign CRUD, member management, stats
          cadence.ts             # Daily cadence report, weekly compliance stats
          projects.ts            # Project CRUD, task CRUD, Gantt data
          co-attendance.ts       # Co-attendance computation (shared events between people)
          reciprocity.ts         # Reciprocity index (initiation balance, sentiment, energy)
          stages.ts              # Relationship pipeline stages (prospect -> inner_circle)
          deduplication.ts       # Fuzzy duplicate org detection + merge
          graph-analytics.ts     # Influence scores, micro-communities, warm paths, social context
          intelligence.ts        # Comm pattern analysis, availability detection, smart re-engagement
        mcp/
          index.ts               # MCP server entry point (stdio transport)
          server.ts              # MCP server setup (@modelcontextprotocol/sdk)
          tools.ts               # All 43 MCP tool definitions with handlers
      drizzle.config.ts          # Drizzle Kit config for schema push/generate
      Dockerfile                 # Production API container
    dashboard/                   # @mycelio/dashboard -- React SPA
      src/
        main.tsx                 # React app bootstrap (BrowserRouter)
        App.tsx                  # Route definitions (16 routes)
        api/client.ts            # API client (fetch wrapper, all endpoints)
        components/              # Shared UI components
          Layout.tsx             # Sidebar nav + main content wrapper (dark neon theme)
          GanttChart.tsx         # SVG-based Gantt chart component
          NetworkGraph.tsx       # (via graph/) Force-directed network graph
          SearchBar.tsx          # Global search
          Modal.tsx              # Modal dialog
          FormField.tsx          # Form field wrapper
          AddPersonForm.tsx      # Create person form
          AddEventForm.tsx       # Create event form
          AddInteractionForm.tsx # Log interaction form
          AddOrganizationForm.tsx # Create organization form
          AddCampaignForm.tsx    # Create campaign form
          AddMembersModal.tsx    # Add members to campaign/community
          EntityMap.tsx          # Map view component
        views/                   # Page-level components (one per route)
          Overview.tsx           # Dashboard home (stats, recent activity)
          PeopleList.tsx         # People directory with search/filter
          PersonDetail.tsx       # Person profile (interactions, milestones, connections)
          EventList.tsx          # Events list
          EventDetail.tsx        # Event detail + attendees
          OrganizationList.tsx   # Organizations list
          OrganizationDetail.tsx # Organization detail + members + health
          FollowUps.tsx          # Follow-up queue view
          PipelineView.tsx       # Relationship pipeline (Kanban-style stages)
          CampaignList.tsx       # Campaigns list
          CampaignDetail.tsx     # Campaign detail + members + stats
          ProjectList.tsx        # Projects list
          ProjectDetail.tsx      # Project detail + tasks
          GanttView.tsx          # Multi-project Gantt chart
          VenueList.tsx          # Venues list
          GraphView.tsx          # Network graph visualization (D3/force-graph)
        graph/                   # Network graph components
          NetworkGraph.tsx       # Main graph component (react-force-graph-2d, sigma, graphology)
          GraphControls.tsx      # Graph display controls
          GraphSearch.tsx        # Search within graph
          GraphSimControls.tsx   # Force simulation controls
          forceWorker.ts         # Web worker for force-directed layout (ForceAtlas2)
        hooks/                   # React Query hooks
          usePeople.ts           # People queries/mutations
          useEvents.ts           # Events queries/mutations
          useOrganizations.ts    # Organizations queries/mutations
          useCampaigns.ts        # Campaigns queries/mutations
          useProjects.ts         # Projects/tasks queries/mutations
          useGraph.ts            # Graph data queries
      Dockerfile                 # Production dashboard container (nginx)
      vite.config.ts             # Vite config
      tailwind.config.js         # Tailwind CSS config (dark neon theme)
  docs/
    CADENCE_SYSTEM.md            # Cadence system design documentation
    CONNECTION_RULES.md          # Connection scoring philosophy and rules
  backup/
    backup.sh                    # Database backup script
  caddy/
    Caddyfile                    # Caddy reverse proxy config
  scripts/
    batch-log-transcript.ts      # Batch import interactions from transcript
    import-taskwarrior.sh        # TaskWarrior import script
```

---

## Database Schema (10 Tables)

### people
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | Auto-generated |
| name | varchar(255) | Required |
| email | varchar(255) | |
| phone | varchar(50) | |
| linkedin | varchar(255) | Profile URL |
| twitter | varchar(255) | Handle or URL |
| instagram | varchar(255) | Handle or URL |
| title | varchar(255) | Job title |
| organizationId | uuid FK -> organizations | Legacy primary org |
| organizationIds | jsonb string[] | Multi-org membership |
| tier | integer | 1-5 (1=Inner Circle, 5=Acquaintance) |
| tags | jsonb string[] | Freeform, lowercase-hyphenated |
| archetypes | jsonb string[] | Personality/behavioral archetypes |
| values | jsonb string[] | Core values/interests |
| commProfile | jsonb | `{ preferredPlatform, responsePattern, communicationStyle, bestTimes, notes }` |
| milestones | jsonb array | `[{ id, type, description, date?, recurring?, createdAt }]` |
| talkingPoints | jsonb array | `[{ id, text, context?, createdAt, usedAt?, active }]` |
| notes | text | Free-text relationship notes |
| availability | jsonb | `{ status: available|busy|overwhelmed|unknown, note?, updatedAt }` |
| stage | varchar(30) | prospect, warm, active, collaborator, inner_circle |
| stageHistory | jsonb array | `[{ from, to, at, reason? }]` |
| followUpConfig | jsonb | `{ cadenceDays?, notes? }` |
| snoozedUntil | timestamptz | Suppress follow-ups until this date |
| lastContactAt | timestamptz | Auto-updated on interaction |
| nextFollowUpAt | timestamptz | Computed from tier cadence |
| createdAt | timestamptz | |
| updatedAt | timestamptz | |

### organizations
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | Auto-generated |
| name | varchar(255) | Required |
| type | varchar(50) | company, community, other (default: company) |
| domain | varchar(255) | Website URL |
| industry | varchar(255) | |
| description | text | |
| notes | text | |
| memberIds | jsonb string[] | Denormalized person UUIDs |
| tags | jsonb string[] | Use "sponsor", "host" for event-related orgs |
| createdAt | timestamptz | |
| updatedAt | timestamptz | |

### interactions
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | Auto-generated |
| personId | uuid FK -> people | Required, cascades on delete |
| personIds | jsonb string[] | All participants (for group interactions) |
| eventId | uuid FK -> events | Links interaction to an event |
| type | varchar(50) | meeting, email, call, social, event, intro, follow_up, other |
| sentiment | varchar(20) | positive, neutral, negative |
| energy | integer | 1-5 (1=draining, 5=energizing) |
| initiatedBy | uuid FK -> people | Who initiated (for reciprocity) |
| summary | text | Required |
| details | text | |
| occurredAt | timestamptz | Defaults to now |
| createdAt | timestamptz | |

### venues
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | Auto-generated |
| name | varchar(255) | Required |
| address | text | Physical address |
| capacity | integer | Max capacity |
| vibe | jsonb string[] | Descriptors: casual, professional, intimate, etc. |
| contactPersonId | uuid FK -> people | Venue contact person |
| organizationId | uuid FK -> organizations | Owning org |
| notes | text | |
| tags | jsonb string[] | |
| availability | jsonb | `{ days?, hours?, bookingNotes? }` |
| createdAt | timestamptz | |
| updatedAt | timestamptz | |

### events
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | Auto-generated |
| name | varchar(255) | Required |
| date | timestamptz | Required |
| venueId | uuid FK -> venues | |
| location | varchar(255) | Freeform location string |
| description | text | |
| url | varchar(500) | External event URL |
| attendeeIds | jsonb string[] | Simple attendee list |
| attendees | jsonb array | `[{ personId, role }]` -- structured with roles |
| tags | jsonb string[] | |
| createdAt | timestamptz | |
| updatedAt | timestamptz | |

### campaigns
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | Auto-generated |
| name | varchar(255) | Required |
| description | text | |
| goal | text | Success criteria |
| status | varchar(30) | draft, active, paused, completed, archived (default: draft) |
| type | varchar(50) | outreach, nurture, event, recruitment, other (default: outreach) |
| tags | jsonb string[] | |
| organizationIds | jsonb string[] | Linked orgs |
| eventIds | jsonb string[] | Linked events |
| startDate | timestamptz | |
| endDate | timestamptz | |
| createdAt | timestamptz | |
| updatedAt | timestamptz | |

### campaign_members (junction)
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | Auto-generated |
| campaignId | uuid FK -> campaigns | Cascades on delete |
| personId | uuid FK -> people | Cascades on delete |
| status | varchar(30) | not_started, contacted, interested, not_interested, converted, deferred |
| priority | integer | Higher = more important (default: 0) |
| warmth | integer | 1-5 interest/warmth score |
| notes | text | |
| lastOutreachAt | timestamptz | |
| nextActionAt | timestamptz | |
| nextAction | text | |
| addedAt | timestamptz | |
| updatedAt | timestamptz | |

### projects
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | Auto-generated |
| name | varchar(255) | Required |
| description | text | |
| status | varchar(30) | active, completed, on_hold, archived (default: active) |
| startDate | timestamptz | |
| endDate | timestamptz | |
| tags | jsonb string[] | |
| color | varchar(30) | Hex color for Gantt display (default: #00f0ff) |
| createdAt | timestamptz | |
| updatedAt | timestamptz | |

### tasks
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | Auto-generated |
| projectId | uuid FK -> projects | Required, cascades on delete |
| title | varchar(255) | Required |
| description | text | |
| status | varchar(30) | todo, in_progress, done, blocked (default: todo) |
| priority | integer | Lower = higher priority (default: 0) |
| assignee | varchar(255) | Person name (freeform string, not FK) |
| startDate | timestamptz | |
| dueDate | timestamptz | |
| dependencies | jsonb string[] | Task UUIDs that must complete first |
| tags | jsonb string[] | |
| createdAt | timestamptz | |
| updatedAt | timestamptz | |

### connections (relationship graph edges)
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | Auto-generated |
| fromPersonId | uuid FK -> people | Cascades on delete |
| toPersonId | uuid FK -> people | Cascades on delete |
| strength | varchar(20) | strong, medium, weak (default: medium) |
| type | varchar(50) | colleague, mentor, mentee, co-founder, friend, investor, client, collaborator, community, other |
| source | varchar(30) | manual, event_copresence, introduction, inferred (default: manual) |
| context | text | Context about the connection |
| howMet | text | How they met |
| connectedAt | timestamptz | When they connected |
| createdAt | timestamptz | |

---

## Relationship Model

### Tier System (Follow-up Cadence)
| Tier | Label | Cadence |
|------|-------|---------|
| 1 | Inner Circle | Weekly (7 days) |
| 2 | Key Relationships | Biweekly (14 days) |
| 3 | Active Network | Monthly (30 days) |
| 4 | Extended Network | Every 2 months (60 days) |
| 5 | Acquaintances | Quarterly (90 days) |

### Relationship Pipeline Stages
`prospect` -> `warm` -> `active` -> `collaborator` -> `inner_circle`

### Interaction Types
`meeting`, `email`, `call`, `social`, `event`, `intro`, `follow_up`, `other`

### Connection Strengths
`strong`, `medium`, `weak`

### Connection Types
`colleague`, `mentor`, `mentee`, `co-founder`, `friend`, `investor`, `client`, `collaborator`, `community`, `other`

### Connection Sources
`manual`, `event_copresence`, `introduction`, `inferred`

### Event Attendee Roles
`attendee`, `speaker`, `organizer`, `sponsor`, `volunteer`, `host`

### Organization Types
`company`, `community`, `other`

### Milestone Types
`birthday`, `funding_round`, `job_change`, `wedding`, `child`, `launch`, `award`, `move`, `other`

### Campaign Statuses
`draft`, `active`, `paused`, `completed`, `archived`

### Campaign Types
`outreach`, `nurture`, `event`, `recruitment`, `other`

### Campaign Member Statuses
`not_started`, `contacted`, `interested`, `not_interested`, `converted`, `deferred`

### Project Statuses
`active`, `completed`, `on_hold`, `archived`

### Task Statuses
`todo`, `in_progress`, `done`, `blocked`

### Sentiment Values
`positive`, `neutral`, `negative`

### Availability Statuses
`available`, `busy`, `overwhelmed`, `unknown`

---

## API Routes

All routes are prefixed with `/api` except health. Auth via `x-api-key` header (skipped if `API_KEY` env var is unset). All responses use `{ data: ... }` wrapper.

### Health
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Returns `{ status: "ok", timestamp }` |

### People
| Method | Path | Params/Body | Description |
|--------|------|-------------|-------------|
| GET | `/api/people` | `?q=&tier=&tags=&organizationId=&limit=&offset=` | Search people |
| GET | `/api/people/:id` | | Get person by ID (includes `_meta`) |
| POST | `/api/people` | `{ name, email?, phone?, linkedin?, twitter?, instagram?, title?, organizationId?, tier?, tags?, notes? }` | Create person |
| PUT | `/api/people/:id` | Partial body | Update person |
| POST | `/api/people/:id/milestones` | `{ type, description, date?, recurring? }` | Add milestone |
| POST | `/api/people/:id/talking-points` | `{ text, context? }` | Add talking point |
| GET | `/api/people/:id/sentiment` | `?limit=` | Sentiment trajectory |
| GET | `/api/people/:id/co-attendance` | | Co-attendance analysis |
| GET | `/api/people/:id/reciprocity` | | Reciprocity index |
| PUT | `/api/people/:id/snooze` | `{ until }` | Snooze follow-ups |
| PUT | `/api/people/:id/stage` | `{ stage, reason? }` | Transition pipeline stage |
| GET | `/api/people/:id/stage-suggestion` | | Get suggested stage |
| PUT | `/api/people/:id/availability` | `{ status, note? }` | Set availability |
| GET | `/api/people/:id/comm-patterns` | | Communication pattern analysis |
| GET | `/api/people/:id/detect-availability` | | Auto-detect availability from patterns |
| GET | `/api/people/:id/smart-reengagement` | | Smart re-engagement advice |
| GET | `/api/milestones/upcoming` | `?days=` | Upcoming milestones (default 30 days) |
| GET | `/api/pipeline` | | Full pipeline by stage |

### Interactions
| Method | Path | Params/Body | Description |
|--------|------|-------------|-------------|
| GET | `/api/interactions` | `?personId=&eventId=&limit=` | List interactions |
| POST | `/api/interactions` | `{ personId, personIds?, eventId?, type, sentiment?, energy?, initiatedBy?, summary, details?, occurredAt? }` | Log interaction |

### Events
| Method | Path | Params/Body | Description |
|--------|------|-------------|-------------|
| GET | `/api/events` | `?limit=` | List events |
| GET | `/api/events/:id` | | Get event by ID |
| POST | `/api/events` | `{ name, date, location?, description?, url?, attendeeIds?, attendees?, tags? }` | Create event |
| PUT | `/api/events/:id` | Partial body | Update event |

### Organizations
| Method | Path | Params/Body | Description |
|--------|------|-------------|-------------|
| GET | `/api/organizations` | `?type=` | List organizations |
| GET | `/api/organizations/:id` | | Get org by ID |
| GET | `/api/organizations/:id/health` | | Health metrics (member count, avg tier, recent interactions, stale members) |
| GET | `/api/organizations/:id/members` | | List org members |
| POST | `/api/organizations` | `{ name, type?, domain?, industry?, description?, notes?, memberIds?, tags? }` | Create org |
| PUT | `/api/organizations/:id` | Partial body | Update org |
| GET | `/api/organizations/duplicates` | | Find duplicate orgs (fuzzy match) |
| POST | `/api/organizations/merge` | `{ keepId, removeId }` | Merge two orgs |

### Venues
| Method | Path | Params/Body | Description |
|--------|------|-------------|-------------|
| GET | `/api/venues` | `?name=&minCapacity=&vibe=&tags=` | List/search venues |
| GET | `/api/venues/:id` | | Get venue by ID |
| POST | `/api/venues` | `{ name, address?, capacity?, vibe?, contactPersonId?, organizationId?, notes?, tags?, availability? }` | Create venue |
| PUT | `/api/venues/:id` | Partial body | Update venue |
| GET | `/api/venues/:id/events` | | Event history at venue |

### Graph & Connections
| Method | Path | Params/Body | Description |
|--------|------|-------------|-------------|
| GET | `/api/graph` | `?tier=&limit=` | Full graph (nodes + edges + groups) |
| GET | `/api/graph/ego/:personId` | `?depth=` | Ego-centric subgraph |
| GET | `/api/graph/path` | `?from=&to=` | Find connection paths |
| GET | `/api/graph/influence` | | Influence scores for all people |
| GET | `/api/graph/communities` | | Detect micro-communities |
| GET | `/api/graph/warm-path` | `?from=&to=` | Find warmest intro path |
| GET | `/api/graph/social-context/:id` | | Social context for a person |
| POST | `/api/connections` | `{ fromPersonId, toPersonId, strength?, type?, source?, context?, howMet?, connectedAt? }` | Create connection |

### Follow-ups
| Method | Path | Params/Body | Description |
|--------|------|-------------|-------------|
| GET | `/api/follow-ups` | `?includeSnoozed=&limit=` | Follow-up queue sorted by urgency |

### Cadence
| Method | Path | Params/Body | Description |
|--------|------|-------------|-------------|
| GET | `/api/cadence/daily` | `?budgetMinutes=&maxEntries=&tierFilter=&includeFresh=&format=text|json` | Daily cadence report |
| GET | `/api/cadence/stats` | `?format=text|json` | Weekly cadence compliance stats |

### Campaigns
| Method | Path | Params/Body | Description |
|--------|------|-------------|-------------|
| GET | `/api/campaigns` | `?q=&status=&type=&tags=&limit=&offset=` | Search campaigns |
| GET | `/api/campaigns/:id` | | Get campaign with stats |
| POST | `/api/campaigns` | `{ name, description?, goal?, status?, type?, tags?, organizationIds?, eventIds?, startDate?, endDate? }` | Create campaign |
| PUT | `/api/campaigns/:id` | Partial body | Update campaign |
| DELETE | `/api/campaigns/:id` | | Delete campaign |
| GET | `/api/campaigns/:id/members` | `?q=&status=&tier=&stage=&tags=&organizationId=&minWarmth=&maxWarmth=&sortBy=&sortOrder=&limit=&offset=` | List campaign members |
| POST | `/api/campaigns/:id/members` | `{ personId, priority?, warmth?, notes?, nextAction?, nextActionAt? }` | Add member |
| POST | `/api/campaigns/:id/members/bulk` | `{ personIds }` | Bulk add members |
| PUT | `/api/campaigns/:id/members/:memberId` | Partial body | Update member |
| DELETE | `/api/campaigns/:id/members/:memberId` | | Remove member |
| GET | `/api/campaigns/:id/stats` | | Campaign stats |

### Projects & Tasks
| Method | Path | Params/Body | Description |
|--------|------|-------------|-------------|
| GET | `/api/projects` | `?q=&status=&tags=&limit=&offset=` | List projects |
| GET | `/api/projects/gantt` | | All projects with tasks (for Gantt chart) |
| GET | `/api/projects/:id` | | Get project with tasks |
| POST | `/api/projects` | `{ name, description?, status?, startDate?, endDate?, tags?, color? }` | Create project |
| PUT | `/api/projects/:id` | Partial body | Update project |
| DELETE | `/api/projects/:id` | | Delete project |
| GET | `/api/projects/:id/tasks` | `?status=&assignee=&tags=&limit=&offset=` | List project tasks |
| GET | `/api/tasks` | `?projectId=&status=&assignee=&tags=&limit=&offset=` | List all tasks |
| GET | `/api/tasks/:taskId` | | Get task by ID |
| POST | `/api/projects/:id/tasks` | `{ title, description?, status?, priority?, assignee?, startDate?, dueDate?, dependencies?, tags? }` | Create task |
| PUT | `/api/tasks/:taskId` | Partial body | Update task |
| DELETE | `/api/tasks/:taskId` | | Delete task |

### API Docs (Self-Describing)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/schema` | Full schema with field descriptions, enums, and metadata |
| GET | `/api/docs/guide` | Usage guide and workflows |
| GET | `/api/docs/connection-rules` | Connection scoring philosophy |

---

## MCP Tools (43 total)

The MCP server runs as a stdio process via `npm run mcp`. It uses `@modelcontextprotocol/sdk`. All tools share the same service layer as the REST API.

Most tools accept both `personId` (UUID) and `personName` (fuzzy match) for convenience. Names are resolved via search; people are auto-created if not found (for write operations).

| # | Tool | Key Params | Description |
|---|------|-----------|-------------|
| 1 | `log_interaction` | personName/personId, type, summary, sentiment?, energy?, eventName?, personNames? | Log an interaction. Auto-creates person if needed. Supports multi-person and event linking. |
| 2 | `query_people` | query?, tier?, tags?, organizationId?, limit? | Search people by name, tier, tags, or org. |
| 3 | `get_person` | personName/personId | Full person details + recent interactions + sentiment trajectory + milestones + talking points. |
| 4 | `prep_event` | eventId | Event prep brief: all attendees with details, last interactions, talking points, upcoming milestones. |
| 5 | `suggest_intros` | personId | Intro suggestions based on shared tags/orgs, excluding existing connections. |
| 6 | `log_event` | name, date, location?, description?, url?, attendees? | Create event. Attendees support name resolution and role assignment. |
| 7 | `community_health` | communityId/communityName | Organization health metrics: member count, avg tier, recent interactions, stale members. |
| 8 | `add_org` | name, type?, domain?, industry?, description?, tags? | Create an organization. |
| 9 | `find_connections` | fromPersonId, toPersonId, maxDepth? | Find connection paths between two people. Returns enriched paths with names. |
| 9b | `add_connection` | fromPersonName/Id, toPersonName/Id, strength?, type?, source?, context?, howMet? | Create a connection between two people. |
| 10 | `follow_ups` | limit?, includeSnoozed? | Follow-up queue sorted by urgency. |
| 11 | `bulk_log_event_meetings` | eventName/Id, peopleNames/Ids, summary | Log that you met multiple people at an event. One interaction per person. |
| 12 | `update_person_profile` | personName/Id, archetypes?, values?, commProfile? | Update archetypes, values, communication preferences. |
| 13 | `log_milestone` | personName/Id, type, description, date?, recurring? | Record a personal milestone (birthday, job change, etc.). |
| 14 | `save_talking_point` | personName/Id, text, context? | Save a talking point for future conversations. |
| 15 | `add_venue` | name, address?, capacity?, vibe?, contactPersonName?, organizationName?, availability? | Create a venue with details. |
| 16 | `find_venue` | name?, minCapacity?, vibe?, tags? | Search venues. |
| 17 | `co_attendance` | personName/Id | Find who attends the same events. Shows shared event count. |
| 18 | `snooze_follow_up` | personName/Id, until | Snooze follow-up reminders until a date. |
| 19 | `set_availability` | personName/Id, status, note? | Set availability status (available, busy, overwhelmed, unknown). |
| 20 | `find_duplicate_orgs` | (none) | Surface potential duplicate organizations. |
| 21 | `merge_orgs` | keepId, removeId | Merge two orgs (moves all data, deletes duplicate). |
| 22 | `reciprocity_index` | personName/Id | Reciprocity score (0-100, 50=balanced). Initiation balance, sentiment, energy. |
| 23 | `update_stage` | personName/Id, stage, reason? | Move person through pipeline (prospect -> inner_circle). |
| 24 | `get_pipeline` | (none) | Full pipeline view: people organized by stage with counts. |
| 25 | `influence_scores` | limit? | Network influence metrics: degree/betweenness centrality, cluster coefficient, composite score. |
| 26 | `detect_communities` | (none) | Detect micro-communities from connection patterns. |
| 27 | `warm_intro_path` | fromPersonName/Id, toPersonName/Id | Find warmest introduction path. Factors in connection strength and tier. |
| 28 | `social_context` | personName/Id | Social context: direct connections, mutual friends, overlapping circles, shared interests. |
| 29 | `comm_patterns` | personName/Id | Communication pattern analysis: best channels, timing, sentiment trajectory, approach. |
| 30 | `detect_stress` | personName/Id | Auto-detect availability/stress from interaction patterns (sentiment, energy, response gaps). |
| 31 | `smart_reengagement` | personName/Id | Smart re-engagement advice factoring time, tier, milestones, comms, trajectory. |
| 32 | `create_campaign` | name, description?, goal?, type?, tags?, startDate?, endDate? | Create a campaign for targeted outreach. |
| 33 | `query_campaigns` | query?, status?, type?, tags?, limit? | Search campaigns (returns with stats). |
| 34 | `add_campaign_members` | campaignName/Id, personNames?, personIds? | Add people to a campaign (bulk). |
| 35 | `update_campaign_member` | campaignName/Id, personName/Id, status?, warmth?, priority?, notes?, nextAction? | Update campaign member tracking. |
| 36 | `campaign_report` | campaignName/Id | Full campaign report: stats, overdue, not started, high-warmth unconverted. |
| 37 | `cadence_report` | budgetMinutes?, maxEntries?, tierFilter?, includeFresh?, format? | Daily prioritized relationship maintenance report. |
| 38 | `cadence_stats` | format? | Weekly cadence compliance statistics. |
| 39 | `create_project` | name, description?, status?, startDate?, endDate?, tags?, color? | Create a project. |
| 40 | `list_projects` | query?, status?, tags?, includeTasks?, limit? | List projects (optionally with tasks). |
| 41 | `create_task` | projectName/Id, title, description?, status?, priority?, assignee?, startDate?, dueDate?, dependencies?, tags? | Create a task in a project. |
| 42 | `update_task` | taskId, title?, status?, priority?, assignee?, startDate?, dueDate?, dependencies?, tags? | Update a task. |
| 43 | `list_tasks` | projectName/Id?, status?, assignee?, tags?, limit? | List tasks across projects. |

---

## Dashboard Routes

| Path | View Component | Description |
|------|---------------|-------------|
| `/` | Overview | Dashboard home -- stats cards, recent activity |
| `/people` | PeopleList | People directory with search, tier filter, tag filter |
| `/people/:id` | PersonDetail | Person profile: info, interactions, milestones, talking points, connections, sentiment |
| `/events` | EventList | Events list |
| `/events/:id` | EventDetail | Event detail with attendees |
| `/organisations` | OrganizationList | Organizations list (note: URL uses British spelling) |
| `/organisations/:id` | OrganizationDetail | Organization detail with members and health metrics |
| `/follow-ups` | FollowUps | Follow-up queue sorted by urgency |
| `/pipeline` | PipelineView | Kanban-style pipeline (prospect -> inner_circle) |
| `/campaigns` | CampaignList | Campaigns list |
| `/campaigns/:id` | CampaignDetail | Campaign detail with members, stats, tracking |
| `/projects` | ProjectList | Projects list |
| `/projects/:id` | ProjectDetail | Project detail with task list |
| `/gantt` | GanttView | Multi-project Gantt chart (SVG-based, all projects with tasks) |
| `/venues` | VenueList | Venues list |
| `/graph` | GraphView | Interactive network graph (force-directed, D3/sigma/graphology) |

---

## Development Commands

```bash
# Install dependencies
npm install

# Start API server (port 3001, tsx watch mode)
npm run dev:api

# Start dashboard (port 3000, Vite HMR)
npm run dev:dashboard

# Push schema changes to database
npm run db:push

# Generate Drizzle migrations
npm run db:generate

# Build all packages (shared -> api -> dashboard)
npm run build

# Start MCP server (stdio transport)
npm run mcp

# Docker (local production)
docker-compose up
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon Postgres connection string (`postgresql://...?sslmode=require`) |
| `API_KEY` | No | API key for `x-api-key` auth (auth skipped if unset) |
| `JWT_SECRET` | No | JWT secret (for future use) |
| `API_PORT` | No | API server port (default: 3001) |
| `DASHBOARD_PORT` | No | Dashboard port (default: 3000) |
| `VITE_API_URL` | No | API base URL for dashboard in production |

---

## Key Architecture Decisions

1. **Monorepo with npm workspaces.** Three packages: shared types, API, dashboard. Shared types ensure consistency across API and dashboard.
2. **Drizzle ORM with Neon serverless.** Schema-as-code in `schema.ts`. Uses `neon` HTTP driver (not WebSocket). Push-based schema management (no migrations directory).
3. **Services layer shared between REST and MCP.** Both `routes/` and `mcp/tools.ts` call the same `services/` functions. Business logic lives in services, never in routes or tool handlers.
4. **MCP tools support name resolution.** Most tools accept both UUID and name. Names are fuzzy-matched via search. For write operations, people are auto-created if no match is found.
5. **Denormalized JSONB for flexible data.** Tags, milestones, talking points, attendees, organization memberships -- all stored as JSONB arrays/objects for flexibility.
6. **Two attendee models on events.** `attendeeIds` (simple string array) and `attendees` (structured `[{ personId, role }]` array). Both are populated.
7. **Connection scoring is agent-owned.** Mycelio stores connection strength as a simple enum. See `docs/CONNECTION_RULES.md` for the scoring philosophy.
8. **Follow-ups driven by tier cadence.** Each tier has a cadence in days. `lastContactAt` is auto-updated on interaction logging. `nextFollowUpAt` is computed. Can be snoozed.
9. **Dashboard uses dark neon theme.** Tailwind CSS with custom colors (`neon-cyan`, `neon-magenta`). Glassmorphism effects. All components in the same visual language.
10. **Project management is self-contained.** Projects and tasks are an independent system within Mycelio. Not synced with external task managers. Gantt chart renders all projects with tasks using SVG.

---

## Common Tasks

### Add a new API route
1. Create service functions in `packages/api/src/services/newservice.ts`.
2. Create route handler in `packages/api/src/routes/newroute.ts` as a Fastify plugin.
3. Register in `packages/api/src/index.ts`: `await app.register(newRoutes, { prefix: '/api' })`.
4. Add types to `packages/shared/src/types.ts` if needed.

### Add a new MCP tool
1. Implement business logic in the appropriate `services/` file.
2. Add a tool definition object to the `tools` array in `packages/api/src/mcp/tools.ts`.
3. Each tool needs: `name`, `description`, `inputSchema` (JSON Schema), and `handler` (async function).
4. Use `resolvePersonId()` / `resolveEventId()` / `resolveCampaignId()` helpers for name-to-ID resolution.

### Add a new dashboard view
1. Create the view component in `packages/dashboard/src/views/NewView.tsx`.
2. Add a route in `packages/dashboard/src/App.tsx`.
3. Add nav item to `navItems` array in `packages/dashboard/src/components/Layout.tsx`.
4. Create a React Query hook in `packages/dashboard/src/hooks/useNewData.ts`.
5. Add API client methods to `packages/dashboard/src/api/client.ts`.

### Add a new database table
1. Define the table in `packages/api/src/db/schema.ts` using Drizzle's `pgTable()`.
2. Run `npm run db:push` to push schema to Neon.
3. Add TypeScript interfaces to `packages/shared/src/types.ts`.
4. Create service functions, routes, and MCP tools as needed.

### Add a table column
1. Add the column in `packages/api/src/db/schema.ts`.
2. Run `npm run db:push` to apply.
3. Update the TypeScript interface in `packages/shared/src/types.ts`.
4. Update service functions, routes, docs route descriptions, and MCP tool schemas as needed.

---

## Data Quality Standards

When adding or updating data via MCP or API:

- **Events** MUST have: `url`, `description`, `location`, `date`, and `tags`
- **Organizations** MUST have: `domain` (website URL)
- **People** SHOULD have: `notes` with context about the relationship
- **Tags**: lowercase, hyphenated, consistent with existing tags
- **Organizations with special roles**: Tag with `sponsor` or `host` where applicable
- Always research and verify data before inserting
- Prefer official/primary sources for URLs
