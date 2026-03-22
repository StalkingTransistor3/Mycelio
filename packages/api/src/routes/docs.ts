import { FastifyInstance } from 'fastify';
import { getTableColumns, getTableName } from 'drizzle-orm';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as schema from '../db/schema.js';

// ── Human-readable descriptions for every table and field ──

const TABLE_DESCRIPTIONS: Record<string, string> = {
  people: 'People in the relationship network. Each person has a tier (1-5), tags, communication profile, milestones, and talking points. Tier 1 = Inner Circle (weekly contact), Tier 5 = Acquaintance (quarterly).',
  organizations: 'Organizations (companies, communities, or other groups). People can belong to multiple organizations via organizationIds.',
  interactions: 'Logged interactions with people — meetings, calls, emails, events, etc. Each interaction has a type, sentiment, and energy level. Interactions drive follow-up cadence and tier maintenance.',
  venues: 'Physical or virtual venues where events are held. Can be linked to an organization and a contact person.',
  events: 'Events (meetups, conferences, dinners, etc.) with attendees, venue, and metadata. Events can be linked to interactions.',
  campaigns: 'Targeted outreach campaigns. Each campaign has members (people) with individual status tracking, warmth scores, and next actions.',
  campaign_members: 'Junction table linking people to campaigns. Tracks outreach status, warmth, priority, and next actions per member.',
  projects: 'Projects for organizing work. Each project has tasks, status, dates, and tags.',
  tasks: 'Tasks within projects. Each task has a status, priority, assignee, dates, and dependencies on other tasks.',
  connections: 'Relationship graph edges between two people. Connections have strength, type, source, and context. Agents score connections (0-100) — Mycelio stores, never computes. See GET /api/docs/connection-rules for scoring philosophy.',
};

const FIELD_DESCRIPTIONS: Record<string, Record<string, string>> = {
  people: {
    id: 'UUID primary key, auto-generated',
    name: 'Full name of the person',
    email: 'Email address',
    phone: 'Phone number',
    linkedin: 'LinkedIn profile URL',
    twitter: 'Twitter/X handle or URL',
    instagram: 'Instagram handle or URL',
    title: 'Job title or role',
    organizationId: 'Primary organization UUID (legacy — prefer organizationIds)',
    organizationIds: 'Array of organization UUIDs this person belongs to',
    tier: 'Relationship tier 1-5. 1=Inner Circle (weekly), 2=Close (biweekly), 3=Active (monthly), 4=Peripheral (quarterly), 5=Acquaintance (yearly). Lower = closer.',
    tags: 'Freeform string array for categorization. Lowercase, hyphenated (e.g. "ai-founder", "build-club").',
    archetypes: 'Personality/behavioral archetypes (e.g. "connector", "builder", "mentor")',
    values: 'Core values or interests (e.g. "open-source", "community-building")',
    commProfile: 'Communication preferences: preferredPlatform, responsePattern, communicationStyle, bestTimes, notes',
    milestones: 'Array of milestones: { id, type, description, date?, recurring?, createdAt }. Types: birthday, funding_round, job_change, wedding, child, launch, award, move, other.',
    talkingPoints: 'Array of talking points: { id, text, context?, createdAt, usedAt?, active }. Things to bring up next time you talk.',
    notes: 'Free-text notes about the person and the relationship',
    availability: 'Current availability: { status: available|busy|overwhelmed|unknown, note?, updatedAt }',
    stage: 'Relationship stage: prospect → warm → active → collaborator → inner_circle',
    stageHistory: 'Array of stage transitions: { from, to, at, reason? }',
    followUpConfig: 'Custom follow-up settings: { cadenceDays?, notes? }',
    snoozedUntil: 'If set, follow-up reminders are suppressed until this date',
    lastContactAt: 'Timestamp of the most recent interaction (auto-updated)',
    nextFollowUpAt: 'When the next follow-up is due (computed from tier cadence or custom config)',
    createdAt: 'Record creation timestamp',
    updatedAt: 'Record last-update timestamp',
  },
  organizations: {
    id: 'UUID primary key, auto-generated',
    name: 'Organization name',
    type: 'Type: company, community, or other',
    domain: 'Website URL / domain',
    industry: 'Industry or sector',
    description: 'Description of the organization',
    notes: 'Free-text notes',
    memberIds: 'Array of person UUIDs who belong to this org (denormalized)',
    tags: 'Freeform tags. Use "sponsor" or "host" for event-related orgs.',
    createdAt: 'Record creation timestamp',
    updatedAt: 'Record last-update timestamp',
  },
  interactions: {
    id: 'UUID primary key, auto-generated',
    personId: 'Primary person UUID (required)',
    personIds: 'Array of all person UUIDs involved (for group interactions)',
    eventId: 'Event UUID if this interaction happened at an event',
    type: 'Interaction type: meeting, email, call, social, event, intro, follow_up, other',
    sentiment: 'Sentiment: positive, neutral, negative',
    energy: 'Energy level 1-5 (1=draining, 5=energizing)',
    initiatedBy: 'Person UUID of who initiated (for reciprocity tracking)',
    summary: 'Brief summary of the interaction (required)',
    details: 'Detailed notes',
    occurredAt: 'When the interaction happened (defaults to now)',
    createdAt: 'Record creation timestamp',
  },
  venues: {
    id: 'UUID primary key, auto-generated',
    name: 'Venue name',
    address: 'Physical address',
    capacity: 'Maximum capacity',
    vibe: 'Array of vibe descriptors (e.g. "casual", "professional", "intimate")',
    contactPersonId: 'Person UUID of the venue contact',
    organizationId: 'Organization UUID that owns/operates the venue',
    notes: 'Free-text notes',
    tags: 'Freeform tags',
    availability: 'Venue availability: { days?, hours?, bookingNotes? }',
    createdAt: 'Record creation timestamp',
    updatedAt: 'Record last-update timestamp',
  },
  events: {
    id: 'UUID primary key, auto-generated',
    name: 'Event name',
    date: 'Event date/time (ISO 8601)',
    venueId: 'Venue UUID',
    location: 'Location string (if no venue record)',
    description: 'Event description',
    url: 'URL to event page (Meetup, Eventbrite, Luma, etc.)',
    attendeeIds: 'Array of person UUIDs who attended (legacy — prefer attendees)',
    attendees: 'Array of { personId, role } where role is: attendee, speaker, organizer, sponsor, volunteer, host',
    tags: 'Freeform tags',
    createdAt: 'Record creation timestamp',
    updatedAt: 'Record last-update timestamp',
  },
  campaigns: {
    id: 'UUID primary key, auto-generated',
    name: 'Campaign name',
    description: 'Campaign description',
    goal: 'Campaign goal/objective',
    status: 'Campaign status: draft, active, paused, completed, archived',
    type: 'Campaign type: outreach, nurture, event, recruitment, other',
    tags: 'Freeform tags',
    organizationIds: 'Related organization UUIDs',
    eventIds: 'Related event UUIDs',
    startDate: 'Campaign start date',
    endDate: 'Campaign end date',
    createdAt: 'Record creation timestamp',
    updatedAt: 'Record last-update timestamp',
  },
  campaign_members: {
    id: 'UUID primary key, auto-generated',
    campaignId: 'Campaign UUID',
    personId: 'Person UUID',
    status: 'Member status: not_started, contacted, interested, not_interested, converted, deferred',
    priority: 'Priority level (higher = more important)',
    warmth: 'Warmth score (agent-assigned)',
    notes: 'Notes about this member in this campaign',
    lastOutreachAt: 'When last contacted for this campaign',
    nextActionAt: 'When the next action is due',
    nextAction: 'Description of the next action to take',
    addedAt: 'When added to the campaign',
    updatedAt: 'Record last-update timestamp',
  },
  projects: {
    id: 'UUID primary key, auto-generated',
    name: 'Project name',
    description: 'Project description',
    status: 'Project status: active, completed, on_hold, archived',
    startDate: 'Project start date',
    endDate: 'Project end date',
    tags: 'Freeform tags',
    color: 'Display color (hex, default #00f0ff)',
    createdAt: 'Record creation timestamp',
    updatedAt: 'Record last-update timestamp',
  },
  tasks: {
    id: 'UUID primary key, auto-generated',
    projectId: 'Parent project UUID',
    title: 'Task title',
    description: 'Task description',
    status: 'Task status: todo, in_progress, done, blocked',
    priority: 'Priority level (higher = more important)',
    assignee: 'Assignee name or identifier',
    startDate: 'Task start date',
    dueDate: 'Task due date',
    dependencies: 'Array of task UUIDs this task depends on',
    tags: 'Freeform tags',
    createdAt: 'Record creation timestamp',
    updatedAt: 'Record last-update timestamp',
  },
  connections: {
    id: 'UUID primary key, auto-generated',
    fromPersonId: 'Person UUID — one end of the connection',
    toPersonId: 'Person UUID — other end of the connection',
    strength: 'Legacy strength label: strong, medium, weak. Prefer score (0-100) for new connections.',
    type: 'Relationship type: professional, personal, family, community, mentorship (from CONNECTION_RULES.md). Legacy values: colleague, mentor, mentee, co-founder, friend, investor, client, collaborator, community, other.',
    source: 'How the connection was created: manual, event_copresence, introduction, inferred. See /api/docs/connection-rules for creation rules.',
    context: 'Free text — how/why they know each other',
    howMet: 'Free text — the origin story of this connection',
    connectedAt: 'When the connection was first established',
    createdAt: 'Record creation timestamp',
  },
};

// ── Enum value definitions ──

const ENUM_VALUES: Record<string, { values: string[]; description: string }> = {
  RelationshipTier: {
    values: ['1', '2', '3', '4', '5'],
    description: '1=Inner Circle (weekly contact), 2=Close (biweekly), 3=Active (monthly), 4=Peripheral (quarterly), 5=Acquaintance (yearly). Lower number = closer relationship.',
  },
  InteractionType: {
    values: ['meeting', 'email', 'call', 'social', 'event', 'intro', 'follow_up', 'other'],
    description: 'The type of interaction logged between people.',
  },
  ConnectionStrength: {
    values: ['strong', 'medium', 'weak'],
    description: 'Legacy strength label. Prefer numeric score (0-100) with CONNECTION_RULES.md tiers for new connections.',
  },
  ConnectionType: {
    values: ['colleague', 'mentor', 'mentee', 'co-founder', 'friend', 'investor', 'client', 'collaborator', 'community', 'other'],
    description: 'The nature of the relationship between two people.',
  },
  ConnectionSource: {
    values: ['manual', 'event_copresence', 'introduction', 'inferred'],
    description: 'How the connection was created. See /api/docs/connection-rules for what creates a connection.',
  },
  Sentiment: {
    values: ['positive', 'neutral', 'negative'],
    description: 'Sentiment of an interaction.',
  },
  OrganizationType: {
    values: ['company', 'community', 'other'],
    description: 'Type of organization.',
  },
  AttendeeRole: {
    values: ['attendee', 'speaker', 'organizer', 'sponsor', 'volunteer', 'host'],
    description: 'Role of a person at an event.',
  },
  RelationshipStage: {
    values: ['prospect', 'warm', 'active', 'collaborator', 'inner_circle'],
    description: 'Pipeline stage for relationship development. Prospect → Warm → Active → Collaborator → Inner Circle.',
  },
  CampaignStatus: {
    values: ['draft', 'active', 'paused', 'completed', 'archived'],
    description: 'Lifecycle status of a campaign.',
  },
  CampaignType: {
    values: ['outreach', 'nurture', 'event', 'recruitment', 'other'],
    description: 'The purpose/type of a campaign.',
  },
  CampaignMemberStatus: {
    values: ['not_started', 'contacted', 'interested', 'not_interested', 'converted', 'deferred'],
    description: 'Outreach status for a person within a campaign.',
  },
  ProjectStatus: {
    values: ['active', 'completed', 'on_hold', 'archived'],
    description: 'Lifecycle status of a project.',
  },
  TaskStatus: {
    values: ['todo', 'in_progress', 'done', 'blocked'],
    description: 'Status of a task within a project.',
  },
  MilestoneType: {
    values: ['birthday', 'funding_round', 'job_change', 'wedding', 'child', 'launch', 'award', 'move', 'other'],
    description: 'Type of personal milestone to track and remember.',
  },
  AvailabilityStatus: {
    values: ['available', 'busy', 'overwhelmed', 'unknown'],
    description: 'Current availability status of a person.',
  },
  MultiplexityContext: {
    values: ['professional', 'social', 'event', 'community', 'personal', 'digital'],
    description: 'Context categories for connection multiplexity scoring. More contexts = stronger connection signal. See /api/docs/connection-rules.',
  },
  ConnectionTier: {
    values: ['1 (Ambient, 1-14)', '2 (Familiar, 15-39)', '3 (Established, 40-69)', '4 (Close, 70-89)', '5 (Bonded, 90-100)'],
    description: 'Connection score tiers from CONNECTION_RULES.md. Agents assign scores; tiers are derived from score ranges.',
  },
};

// ── Relationship definitions ──

const RELATIONSHIPS = [
  { from: 'people', to: 'organizations', field: 'organizationId', type: 'many-to-one', description: 'Primary organization (legacy)' },
  { from: 'people', to: 'organizations', field: 'organizationIds', type: 'many-to-many', description: 'All organizations this person belongs to' },
  { from: 'interactions', to: 'people', field: 'personId', type: 'many-to-one', description: 'Primary person this interaction is with' },
  { from: 'interactions', to: 'people', field: 'personIds', type: 'many-to-many', description: 'All people involved in this interaction' },
  { from: 'interactions', to: 'events', field: 'eventId', type: 'many-to-one', description: 'Event this interaction happened at' },
  { from: 'interactions', to: 'people', field: 'initiatedBy', type: 'many-to-one', description: 'Person who initiated this interaction' },
  { from: 'venues', to: 'people', field: 'contactPersonId', type: 'many-to-one', description: 'Contact person for this venue' },
  { from: 'venues', to: 'organizations', field: 'organizationId', type: 'many-to-one', description: 'Organization that owns/operates this venue' },
  { from: 'events', to: 'venues', field: 'venueId', type: 'many-to-one', description: 'Venue where this event is held' },
  { from: 'events', to: 'people', field: 'attendeeIds', type: 'many-to-many', description: 'People who attended this event' },
  { from: 'campaign_members', to: 'campaigns', field: 'campaignId', type: 'many-to-one', description: 'Campaign this membership belongs to' },
  { from: 'campaign_members', to: 'people', field: 'personId', type: 'many-to-one', description: 'Person in this campaign' },
  { from: 'tasks', to: 'projects', field: 'projectId', type: 'many-to-one', description: 'Project this task belongs to' },
  { from: 'connections', to: 'people', field: 'fromPersonId', type: 'many-to-one', description: 'One end of the connection' },
  { from: 'connections', to: 'people', field: 'toPersonId', type: 'many-to-one', description: 'Other end of the connection' },
];

// ── Schema introspection from Drizzle ──

function getColumnType(column: any): string {
  // Try to get useful type info from drizzle column metadata
  if (column.columnType === 'PgUUID') return 'uuid';
  if (column.columnType === 'PgVarchar') return 'varchar';
  if (column.columnType === 'PgText') return 'text';
  if (column.columnType === 'PgInteger') return 'integer';
  if (column.columnType === 'PgTimestamp') return 'timestamp';
  if (column.columnType === 'PgJsonb') return 'jsonb';
  if (column.dataType === 'string') return 'string';
  if (column.dataType === 'number') return 'number';
  if (column.dataType === 'json') return 'jsonb';
  if (column.dataType === 'date') return 'timestamp';
  return column.dataType || 'unknown';
}

function introspectTable(table: any, tableName: string) {
  const columns = getTableColumns(table);
  const fields: Record<string, any> = {};

  for (const [key, col] of Object.entries(columns)) {
    fields[key] = {
      column_name: (col as any).name,
      type: getColumnType(col),
      nullable: !(col as any).notNull,
      has_default: (col as any).hasDefault,
      primary_key: (col as any).primaryKey || false,
      description: FIELD_DESCRIPTIONS[tableName]?.[key] || null,
    };
  }

  return fields;
}

function buildSchemaResponse() {
  const tables: Record<string, any> = {};

  const schemaEntries: [string, any][] = [
    ['people', schema.people],
    ['organizations', schema.organizations],
    ['interactions', schema.interactions],
    ['venues', schema.venues],
    ['events', schema.events],
    ['campaigns', schema.campaigns],
    ['campaign_members', schema.campaignMembers],
    ['projects', schema.projects],
    ['tasks', schema.tasks],
    ['connections', schema.connections],
  ];

  for (const [name, table] of schemaEntries) {
    tables[name] = {
      description: TABLE_DESCRIPTIONS[name] || null,
      fields: introspectTable(table, name),
    };
  }

  return {
    version: '1.0.0',
    generated_at: new Date().toISOString(),
    description: 'Mycelio relationship intelligence platform — complete data model. All IDs are UUIDs. All dates are ISO 8601. Tags are freeform string arrays (lowercase, hyphenated).',
    tables,
    enums: ENUM_VALUES,
    relationships: RELATIONSHIPS,
    conventions: {
      ids: 'All IDs are UUIDs, auto-generated on create.',
      dates: 'All timestamps are ISO 8601 with timezone.',
      tags: 'Freeform string arrays. Use lowercase, hyphenated format (e.g. "ai-founder").',
      tiers: 'Person tiers: 1 (Inner Circle, weekly) → 5 (Acquaintance, quarterly). Lower = closer.',
      connections: 'Agents score connections (0-100). Mycelio stores, never computes. See GET /api/docs/connection-rules.',
      responses: 'All responses use { data: T } envelope. Errors use { error, message, statusCode }.',
    },
    self_doc_endpoints: {
      schema: 'GET /api/schema — this endpoint (full data model)',
      connection_rules: 'GET /api/docs/connection-rules — scoring philosophy, tiers, decay rules',
      guide: 'GET /api/docs/guide — agent onboarding, workflows, examples',
      changelog: 'GET /api/docs/changelog — recent schema changes',
    },
  };
}

// ── Connection rules parser ──

function parseConnectionRules(): Record<string, any> {
  const __filename_local = fileURLToPath(import.meta.url);
  const __dirname_local = dirname(__filename_local);
  const mdPath = resolve(__dirname_local, '../../../../docs/CONNECTION_RULES.md');

  let raw: string;
  try {
    raw = readFileSync(mdPath, 'utf-8');
  } catch {
    return { error: 'CONNECTION_RULES.md not found', path: mdPath };
  }

  return {
    version: '1.0.0',
    source: 'CONNECTION_RULES.md',
    generated_at: new Date().toISOString(),
    summary: 'Connections are relationships between two people. Every connection must be created through explicit, evidenced action. Agents score connections — Mycelio stores them.',
    architecture: {
      principle: 'Mycelio is the data store, not the brain. Agents judge connection strength. The decay script applies mechanical time-based decay.',
      responsibilities: {
        mycelio_api: 'Store connections, scores, evidence. CRUD endpoints, schema enforcement.',
        agents: 'Judge connection strength, assign scores (0-100), provide reasoning. Read this doc + context, then write score + reasoning.',
        decay_script: 'Mechanical math — half-life calculations on lastEvidenceAt. No judgment.',
      },
    },
    tiers: [
      { tier: 5, label: 'Bonded', score_range: '90-100', description: 'Life-level ties. Unbreakable unless catastrophic.', examples: 'Family, partners, co-founders, best friends, mentors with deep history', dunbar_layer: 'Support clique (~5)', contact_cadence: 'Multiple/week', criterion: 'Would drop everything in a crisis' },
      { tier: 4, label: 'Close', score_range: '70-89', description: 'Regular, meaningful contact. Would go out of their way for each other.', examples: 'Close work collaborators, good friends, trusted advisors', dunbar_layer: 'Sympathy group (~15)', contact_cadence: 'Weekly', criterion: 'Their loss would be devastating' },
      { tier: 3, label: 'Established', score_range: '40-69', description: 'Have a real relationship. Can call on each other.', examples: 'Colleagues who work together, recurring event contacts with 1:1 history', dunbar_layer: 'Close group (~50)', contact_cadence: 'Monthly', criterion: 'Would invite to dinner unprompted' },
      { tier: 2, label: 'Familiar', score_range: '15-39', description: 'Have met. Can place each other. Not a cold outreach.', examples: 'Met at an event, introduced by mutual contact', dunbar_layer: 'Active network (~150)', contact_cadence: 'Quarterly', criterion: 'Could join for a drink uninvited' },
      { tier: 1, label: 'Ambient', score_range: '1-14', description: 'Aware of each other. No direct meaningful interaction yet.', examples: 'Mentioned at event, follow on socials, attended same event but didn\'t talk', dunbar_layer: 'Acquaintances (~500)', contact_cadence: 'Annually', criterion: 'Name to face, know something about them' },
    ],
    scoring_dimensions: [
      { rank: 1, name: 'Multiplexity', description: 'How many distinct social contexts the pair shares. Single best behavioral predictor of tie strength.', contexts: ['professional', 'social', 'event', 'community', 'personal', 'digital'], heuristic: '1 context = weak. 2-3 = moderate. 4+ = strong signal.', citation: 'Marsden & Campbell (2012)' },
      { rank: 2, name: 'Contact Frequency', description: 'How often they interact. Predicts Dunbar layer placement with ~80% accuracy.', caveat: 'High frequency in one context doesn\'t automatically mean strong. Weight more when it spans multiple contexts.', citation: 'Granovetter (1973), Dunbar (2010), Roberts & Dunbar (2011)' },
      { rank: 3, name: 'Recency', description: 'How recently they last interacted. 100 past interactions but nothing in 6 months ≠ 10 interactions with one yesterday.' },
      { rank: 4, name: 'Reciprocity', description: 'Balance of who initiates contact. Balanced = stronger. One-sided = weaker or parasocial.', citation: 'Granovetter "reciprocal services"' },
      { rank: 5, name: 'Relationship Age', description: 'How long they\'ve known each other. Longer = more resilient. Dormant strong ties retain "stored value".', citation: 'Dunbar (2018), Levin et al. (2011)' },
      { rank: 6, name: 'Interaction Quality', description: 'Depth and sentiment. A 2-hour deep conversation > a "hey" at a networking event.', maps_to: 'Granovetter\'s "emotional intensity" and "intimacy" (mutual confiding)' },
      { rank: 7, name: 'Structural Embeddedness', description: 'Mutual connections shared. Simmelian ties (triangles) are stronger and more durable than isolated dyads.', citation: 'Krackhardt (1999)' },
    ],
    creation_rules: [
      { action: 'Andrew or agent manually adds it', initial_tier: 'Any (specifier decides)', source: 'manual', notes: 'Agent includes reasoning in evidence' },
      { action: 'Two people attend the same event', initial_tier: 'Does NOT auto-create', source: null, notes: 'Copresence alone means nothing' },
      { action: 'Event + interaction logged between them', initial_tier: '2 (Familiar)', source: 'event_interaction', notes: 'They actually talked' },
      { action: 'Introduction logged (A introduces B to C)', initial_tier: '2 (Familiar)', source: 'introduction', notes: 'The introducer is evidence' },
      { action: 'Someone mentions another person', initial_tier: '1 (Ambient)', source: 'mention', notes: 'One-directional awareness' },
      { action: 'They follow each other on socials', initial_tier: '1 (Ambient)', source: 'social_follow', notes: 'Weak signal, but real' },
      { action: 'Confirmed working together (not just same company)', initial_tier: '2-3', source: 'manual', notes: 'Same company ≠ know each other' },
    ],
    strengthening_signals: [
      { action: '1:1 meeting', weight: 'Strongest single-interaction signal' },
      { action: 'Collaboration on a project', weight: 'Sustained joint effort across time' },
      { action: 'Introduction made between them', weight: 'Social capital exchange, creates triadic closure' },
      { action: 'Multi-context interaction', weight: 'Seeing someone in a new context is a bigger signal than another in the same context' },
    ],
    decay_rules: [
      { tier: '5 (Bonded)', behavior: 'No decay. Score locked unless agent/Andrew changes it.', rationale: 'Support clique survives long gaps.' },
      { tier: '4 (Close)', behavior: 'Recency half-life: 90 days', rationale: 'Sympathy group needs quarterly reinforcement.' },
      { tier: '3 (Established)', behavior: 'Recency half-life: 45 days', rationale: 'Close group needs monthly-ish contact.' },
      { tier: '2 (Familiar)', behavior: 'Recency half-life: 30 days', rationale: 'Active network fades fast without touchpoints.' },
      { tier: '1 (Ambient)', behavior: 'No decay. Auto-archive after 6 months of zero interaction.', rationale: 'Already at floor.' },
    ],
    metadata_fields: [
      { field: 'source', purpose: 'How created: manual, event_interaction, introduction, mention, social_follow' },
      { field: 'strength', purpose: 'Current tier label: bonded, close, established, familiar, ambient' },
      { field: 'score', purpose: '0-100, set by agent judgment (not a formula)' },
      { field: 'scoreReasoning', purpose: 'Agent\'s explanation for the current score' },
      { field: 'type', purpose: 'Relationship type(s): professional, personal, family, community, mentorship' },
      { field: 'context', purpose: 'Free text — how/why they know each other' },
      { field: 'howMet', purpose: 'Free text — the origin story' },
      { field: 'evidence', purpose: 'JSONB array: [{ action, date, detail, source, agent }]' },
      { field: 'multiplexityContexts', purpose: 'JSONB array of observed context types: ["professional", "social", "event"]' },
      { field: 'lastEvidenceAt', purpose: 'Timestamp of most recent evidence (used by decay script)' },
      { field: 'lastScoredAt', purpose: 'When an agent last evaluated the score' },
      { field: 'lastScoredBy', purpose: 'Which agent last scored it (e.g. "kira", "probe-able", "andrew-manual")' },
      { field: 'connectedAt', purpose: 'When the connection was first established' },
    ],
    hard_constraints: [
      'No assumed connections. Same company, same event, same tags — none of these create connections automatically.',
      'Every connection needs evidence. The source and evidence fields must be populated.',
      'Andrew can override anything. Manual adjustments always win.',
      'Connections are bidirectional by default but can be asymmetric — use ambient for one-directional awareness.',
      'The graph should be sparse. A sparse, accurate graph is infinitely more valuable than a dense, fictional one.',
      'Decay is a feature. Relationships that aren\'t maintained should visibly weaken.',
      'Multiplexity > frequency. Agents should weight context diversity above raw interaction count.',
      'Agents score, Mycelio stores. Mycelio never computes scores.',
      'Show your work. Agents must populate scoreReasoning when setting or changing a score.',
    ],
  };
}

// ── Agent guide ──

function buildAgentGuide() {
  return {
    version: '1.0.0',
    generated_at: new Date().toISOString(),
    what_is_mycelio: 'Mycelio is a relationship intelligence platform. It stores people, organizations, interactions, events, connections, campaigns, projects, and tasks. It is the data backbone for managing a personal and professional network. Agents read from and write to Mycelio to maintain relationship health.',
    core_entities: [
      { name: 'People', description: 'Individuals in the network. Each has a tier (1-5), tags, milestones, talking points, and a relationship stage.', primary_endpoint: '/api/people' },
      { name: 'Organizations', description: 'Companies, communities, or groups. People can belong to multiple.', primary_endpoint: '/api/organizations' },
      { name: 'Interactions', description: 'Logged contacts — meetings, calls, emails, events, intros. Drive follow-up cadence.', primary_endpoint: '/api/interactions' },
      { name: 'Events', description: 'Meetups, conferences, dinners with attendees and roles.', primary_endpoint: '/api/events' },
      { name: 'Connections', description: 'Graph edges between people. Scored by agents (0-100). See /api/docs/connection-rules.', primary_endpoint: '/api/connections (via POST), /api/graph (via GET)' },
      { name: 'Campaigns', description: 'Targeted outreach with per-member tracking.', primary_endpoint: '/api/campaigns' },
      { name: 'Projects & Tasks', description: 'Project management with tasks, dependencies, and status.', primary_endpoint: '/api/projects' },
      { name: 'Venues', description: 'Physical/virtual locations for events.', primary_endpoint: '/api/venues' },
    ],
    common_workflows: [
      {
        name: 'Log an interaction',
        description: 'Record a meeting, call, or conversation with someone.',
        steps: [
          'POST /api/interactions with personId (or use MCP tool log_interaction with personName for auto-resolve)',
          'Include type, summary, sentiment, energy, and occurredAt',
          'lastContactAt on the person is automatically updated',
        ],
        example_request: {
          method: 'POST',
          path: '/api/interactions',
          body: {
            personId: '550e8400-e29b-41d4-a716-446655440000',
            type: 'meeting',
            summary: 'Coffee catch-up. Discussed their new startup idea.',
            sentiment: 'positive',
            energy: 4,
            occurredAt: '2026-03-22T10:00:00Z',
          },
        },
        example_response: {
          data: {
            id: 'generated-uuid',
            personId: '550e8400-e29b-41d4-a716-446655440000',
            type: 'meeting',
            summary: 'Coffee catch-up. Discussed their new startup idea.',
            sentiment: 'positive',
            energy: 4,
            occurredAt: '2026-03-22T10:00:00Z',
            createdAt: '2026-03-22T10:30:00Z',
          },
        },
      },
      {
        name: 'Create a connection',
        description: 'Add a relationship edge between two people in the graph.',
        steps: [
          'POST /api/connections with fromPersonId, toPersonId',
          'Include strength, type, source, context, and howMet',
          'Score and scoreReasoning should be set when agent has context to judge',
        ],
        example_request: {
          method: 'POST',
          path: '/api/connections',
          body: {
            fromPersonId: '550e8400-e29b-41d4-a716-446655440000',
            toPersonId: '660e8400-e29b-41d4-a716-446655440001',
            strength: 'medium',
            type: 'collaborator',
            source: 'manual',
            context: 'Both on the Build Club organizing team',
            howMet: 'Met at Build Club December 2025 meetup',
          },
        },
        example_response: {
          data: {
            id: 'generated-uuid',
            fromPersonId: '550e8400-e29b-41d4-a716-446655440000',
            toPersonId: '660e8400-e29b-41d4-a716-446655440001',
            strength: 'medium',
            type: 'collaborator',
            source: 'manual',
            context: 'Both on the Build Club organizing team',
            howMet: 'Met at Build Club December 2025 meetup',
            createdAt: '2026-03-22T10:30:00Z',
          },
        },
      },
      {
        name: 'Search for people',
        description: 'Find people by name, tier, tags, or organization.',
        steps: [
          'GET /api/people?q=name&tier=2&tags=ai-founder&limit=10',
        ],
        example_request: {
          method: 'GET',
          path: '/api/people?q=Tim&tier=3&limit=5',
        },
        example_response: {
          data: [
            {
              id: '550e8400-e29b-41d4-a716-446655440000',
              name: 'Tim Griffiths',
              tier: 3,
              tags: ['founder', 'ai-exec-coach'],
              stage: 'warm',
              lastContactAt: '2026-03-15T10:00:00Z',
            },
          ],
        },
      },
      {
        name: 'Check follow-ups',
        description: 'See who needs follow-up, sorted by urgency.',
        steps: [
          'GET /api/follow-ups?limit=20',
          'Returns people sorted by overdue status and tier priority',
        ],
        example_request: {
          method: 'GET',
          path: '/api/follow-ups?limit=10',
        },
        example_response: {
          data: [
            {
              personId: '550e8400-e29b-41d4-a716-446655440000',
              personName: 'Tim Griffiths',
              tier: 2,
              lastContactAt: '2026-02-01T10:00:00Z',
              daysSinceContact: 49,
              overdue: true,
              coolingAlert: true,
            },
          ],
        },
      },
      {
        name: 'Score a connection (agent workflow)',
        description: 'Agents read context, evaluate scoring dimensions, then write score + reasoning to the connection.',
        steps: [
          '1. GET the connection and both people\'s data',
          '2. GET /api/docs/connection-rules for scoring guidelines',
          '3. Consider all 7 scoring dimensions (multiplexity most important)',
          '4. PATCH the connection with score, scoreReasoning, lastScoredAt, lastScoredBy, multiplexityContexts',
          '5. Always show your work in scoreReasoning',
        ],
      },
      {
        name: 'Get the relationship graph',
        description: 'Fetch the full or filtered graph for visualization or analysis.',
        steps: [
          'GET /api/graph — full graph (nodes + edges + groups)',
          'GET /api/graph?tier=3 — only people with tier ≤ 3',
          'GET /api/graph/ego/:personId — ego-centric subgraph around one person',
          'GET /api/graph/communities — detect micro-communities',
          'GET /api/graph/influence — influence/centrality scores',
        ],
      },
    ],
    self_documentation: {
      schema: 'GET /api/schema — full data model with every table, field, enum, and relationship',
      connection_rules: 'GET /api/docs/connection-rules — scoring philosophy, tiers, decay rules, hard constraints',
      guide: 'GET /api/docs/guide — this endpoint (agent onboarding)',
      changelog: 'GET /api/docs/changelog — recent schema changes',
    },
    tips_for_agents: [
      'Always check /api/schema if unsure about field names or types.',
      'Connection scoring is YOUR job — read /api/docs/connection-rules before scoring.',
      'Multiplexity (context diversity) is the #1 predictor of tie strength. Weight it heavily.',
      'Always populate scoreReasoning when setting connection scores. No unexplained numbers.',
      'The graph should be sparse. Don\'t create connections without evidence.',
      'Use the _meta fields in responses for contextual hints about valid values and editable fields.',
      'Check /api/docs/changelog periodically to see if the schema has changed.',
    ],
  };
}

// ── Changelog ──

function buildChangelog() {
  return {
    version: '1.0.0',
    generated_at: new Date().toISOString(),
    description: 'Recent schema and API changes. Check this endpoint to see if your understanding of the Mycelio data model is stale.',
    changes: [
      {
        date: '2026-03-22',
        version: '1.0.0',
        type: 'addition',
        description: 'Added self-documentation endpoints: /api/schema, /api/docs/connection-rules, /api/docs/guide, /api/docs/changelog',
        affected_tables: [],
        affected_endpoints: ['/api/schema', '/api/docs/connection-rules', '/api/docs/guide', '/api/docs/changelog'],
      },
      {
        date: '2026-03-22',
        version: '1.0.0',
        type: 'addition',
        description: 'Added _meta response enrichment to entity endpoints (people, connections) with contextual hints for agents',
        affected_tables: [],
        affected_endpoints: ['/api/people/:id', '/api/connections'],
      },
      {
        date: '2026-03-22',
        version: '1.0.0',
        type: 'documentation',
        description: 'CONNECTION_RULES.md defines new connection fields: score, scoreReasoning, lastScoredAt, lastScoredBy, multiplexityContexts, evidence. These are documented in schema but may not yet be columns in the DB — they represent the target schema for connection scoring.',
        affected_tables: ['connections'],
        affected_endpoints: ['/api/connections', '/api/graph'],
        notes: 'The connections table schema.ts currently has: strength, type, source, context, howMet, connectedAt. The CONNECTION_RULES.md fields (score, scoreReasoning, evidence, etc.) are the planned additions. Check schema.ts for current column status.',
      },
      {
        date: '2026-03-15',
        version: '0.9.0',
        type: 'addition',
        description: 'Added projects and tasks tables for project management',
        affected_tables: ['projects', 'tasks'],
        affected_endpoints: ['/api/projects', '/api/projects/:id/tasks'],
      },
      {
        date: '2026-03-01',
        version: '0.8.0',
        type: 'addition',
        description: 'Added campaigns and campaign_members tables for outreach tracking',
        affected_tables: ['campaigns', 'campaign_members'],
        affected_endpoints: ['/api/campaigns'],
      },
    ],
  };
}

// ── Meta enrichment helpers (exported for use in other routes) ──

export const META = {
  person: {
    tier_values: {
      1: 'Inner Circle — weekly contact expected. Your closest relationships.',
      2: 'Close — biweekly contact. Strong professional or personal ties.',
      3: 'Active — monthly contact. Established relationships with ongoing value.',
      4: 'Peripheral — quarterly contact. Warm but not regularly maintained.',
      5: 'Acquaintance — yearly contact. Know them, but not deeply connected.',
    },
    editable_fields: ['name', 'email', 'phone', 'linkedin', 'twitter', 'instagram', 'title', 'organizationId', 'organizationIds', 'tier', 'tags', 'archetypes', 'values', 'commProfile', 'notes', 'availability', 'stage', 'followUpConfig', 'snoozedUntil'],
    interaction_types: ['meeting', 'email', 'call', 'social', 'event', 'intro', 'follow_up', 'other'],
    stages: ['prospect', 'warm', 'active', 'collaborator', 'inner_circle'],
    milestone_types: ['birthday', 'funding_round', 'job_change', 'wedding', 'child', 'launch', 'award', 'move', 'other'],
    self_doc: {
      schema: 'GET /api/schema',
      guide: 'GET /api/docs/guide',
    },
  },
  connection: {
    tier_values: {
      '5 (Bonded, 90-100)': 'Life-level ties. Unbreakable.',
      '4 (Close, 70-89)': 'Regular, meaningful contact. Go out of their way.',
      '3 (Established, 40-69)': 'Real relationship. Can call on each other.',
      '2 (Familiar, 15-39)': 'Have met. Not a cold outreach.',
      '1 (Ambient, 1-14)': 'Aware of each other. No meaningful interaction yet.',
    },
    editable_fields: ['strength', 'type', 'source', 'context', 'howMet', 'connectedAt', 'score', 'scoreReasoning', 'lastScoredAt', 'lastScoredBy', 'multiplexityContexts', 'evidence'],
    strength_values: ['strong', 'medium', 'weak'],
    source_values: ['manual', 'event_copresence', 'introduction', 'inferred', 'event_interaction', 'mention', 'social_follow'],
    type_values: ['professional', 'personal', 'family', 'community', 'mentorship', 'colleague', 'mentor', 'mentee', 'co-founder', 'friend', 'investor', 'client', 'collaborator', 'other'],
    multiplexity_contexts: ['professional', 'social', 'event', 'community', 'personal', 'digital'],
    evidence_format: { action: 'string — what happened', date: 'ISO 8601', detail: 'string — specifics', source: 'string — data source', agent: 'string — which agent logged this' },
    scoring_guide: 'GET /api/docs/connection-rules',
    self_doc: {
      schema: 'GET /api/schema',
      connection_rules: 'GET /api/docs/connection-rules',
    },
  },
};

// ── Route registration ──

export async function docsRoutes(app: FastifyInstance) {
  // GET /api/schema — full data model as structured JSON
  app.get('/schema', async () => {
    return buildSchemaResponse();
  });

  // GET /api/docs/connection-rules — CONNECTION_RULES.md as structured JSON
  app.get('/docs/connection-rules', async () => {
    return parseConnectionRules();
  });

  // GET /api/docs/guide — agent onboarding doc
  app.get('/docs/guide', async () => {
    return buildAgentGuide();
  });

  // GET /api/docs/changelog — recent schema changes
  app.get('/docs/changelog', async () => {
    return buildChangelog();
  });
}
