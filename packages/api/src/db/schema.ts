import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  jsonb,
  boolean,
} from 'drizzle-orm/pg-core';

// ── People ──
export const people = pgTable('people', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  linkedin: varchar('linkedin', { length: 255 }),
  twitter: varchar('twitter', { length: 255 }),
  instagram: varchar('instagram', { length: 255 }),
  title: varchar('title', { length: 255 }),
  organizationId: uuid('organization_id').references(() => organizations.id),
  organizationIds: jsonb('organization_ids').$type<string[]>().notNull().default([]),
  tier: integer('tier').notNull().default(3),
  tags: jsonb('tags').$type<string[]>().notNull().default([]),
  archetypes: jsonb('archetypes').$type<string[]>().notNull().default([]),
  values: jsonb('values').$type<string[]>().notNull().default([]),
  commProfile: jsonb('comm_profile').$type<Record<string, unknown>>(),
  milestones: jsonb('milestones').$type<Record<string, unknown>[]>().notNull().default([]),
  talkingPoints: jsonb('talking_points').$type<Record<string, unknown>[]>().notNull().default([]),
  notes: text('notes'),
  availability: jsonb('availability').$type<Record<string, unknown>>(),
  stage: varchar('stage', { length: 30 }).default('prospect'),
  stageHistory: jsonb('stage_history').$type<{ from: string | null; to: string; at: string; reason?: string }[]>().notNull().default([]),
  followUpConfig: jsonb('follow_up_config').$type<Record<string, unknown>>(),
  snoozedUntil: timestamp('snoozed_until', { withTimezone: true }),
  lastContactAt: timestamp('last_contact_at', { withTimezone: true }),
  nextFollowUpAt: timestamp('next_follow_up_at', { withTimezone: true }),
  archived: boolean('archived').notNull().default(false),
  // embedding: vector('embedding', { dimensions: 1536 }), // deferred
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Organizations (unified: companies, communities, other) ──
export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull().default('company'),
  domain: varchar('domain', { length: 255 }),
  industry: varchar('industry', { length: 255 }),
  description: text('description'),
  notes: text('notes'),
  memberIds: jsonb('member_ids').$type<string[]>().notNull().default([]),
  tags: jsonb('tags').$type<string[]>().notNull().default([]),
  archived: boolean('archived').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Interactions ──
export const interactions = pgTable('interactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  personId: uuid('person_id').notNull().references(() => people.id, { onDelete: 'cascade' }),
  personIds: jsonb('person_ids').$type<string[]>().notNull().default([]),
  eventId: uuid('event_id').references(() => events.id),
  type: varchar('type', { length: 50 }).notNull(),
  sentiment: varchar('sentiment', { length: 20 }),
  energy: integer('energy'),
  initiatedBy: uuid('initiated_by').references(() => people.id),
  summary: text('summary').notNull(),
  details: text('details'),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Venues ──
export const venues = pgTable('venues', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  address: text('address'),
  capacity: integer('capacity'),
  vibe: jsonb('vibe').$type<string[]>().notNull().default([]),
  contactPersonId: uuid('contact_person_id').references(() => people.id),
  organizationId: uuid('organization_id').references(() => organizations.id),
  notes: text('notes'),
  tags: jsonb('tags').$type<string[]>().notNull().default([]),
  availability: jsonb('availability').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Events ──
export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  date: timestamp('date', { withTimezone: true }).notNull(),
  venueId: uuid('venue_id').references(() => venues.id),
  location: varchar('location', { length: 255 }),
  description: text('description'),
  url: varchar('url', { length: 500 }),
  isOrganizer: integer('is_organizer').notNull().default(0), // 1 = Andrew's event, 0 = attending
  status: varchar('event_status', { length: 30 }).default('upcoming'), // upcoming, planning, promoted, live, completed, debriefed
  attendeeIds: jsonb('attendee_ids').$type<string[]>().notNull().default([]),
  attendees: jsonb('attendees').$type<{ personId: string; role: string }[]>().notNull().default([]),
  tags: jsonb('tags').$type<string[]>().notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Campaigns ──
export const campaigns = pgTable('campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  goal: text('goal'),
  status: varchar('status', { length: 30 }).notNull().default('draft'),
  type: varchar('type', { length: 50 }).notNull().default('outreach'),
  tags: jsonb('tags').$type<string[]>().notNull().default([]),
  organizationIds: jsonb('organization_ids').$type<string[]>().notNull().default([]),
  eventIds: jsonb('event_ids').$type<string[]>().notNull().default([]),
  startDate: timestamp('start_date', { withTimezone: true }),
  endDate: timestamp('end_date', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Campaign Members (junction) ──
export const campaignMembers = pgTable('campaign_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  personId: uuid('person_id').notNull().references(() => people.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 30 }).notNull().default('not_started'),
  priority: integer('priority').notNull().default(0),
  warmth: integer('warmth'),
  notes: text('notes'),
  lastOutreachAt: timestamp('last_outreach_at', { withTimezone: true }),
  nextActionAt: timestamp('next_action_at', { withTimezone: true }),
  nextAction: text('next_action'),
  addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Projects ──
export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 30 }).notNull().default('active'),
  eventId: uuid('event_id').references(() => events.id),
  startDate: timestamp('start_date', { withTimezone: true }),
  endDate: timestamp('end_date', { withTimezone: true }),
  tags: jsonb('tags').$type<string[]>().notNull().default([]),
  color: varchar('color', { length: 30 }).default('#00f0ff'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Tasks ──
export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 30 }).notNull().default('todo'),
  priority: integer('priority').notNull().default(0),
  assignee: varchar('assignee', { length: 255 }),
  startDate: timestamp('start_date', { withTimezone: true }),
  dueDate: timestamp('due_date', { withTimezone: true }),
  dependencies: jsonb('dependencies').$type<string[]>().notNull().default([]),
  tags: jsonb('tags').$type<string[]>().notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Connections (relationship graph edges) ──
export const connections = pgTable('connections', {
  id: uuid('id').primaryKey().defaultRandom(),
  fromPersonId: uuid('from_person_id').notNull().references(() => people.id, { onDelete: 'cascade' }),
  toPersonId: uuid('to_person_id').notNull().references(() => people.id, { onDelete: 'cascade' }),
  strength: varchar('strength', { length: 20 }).notNull().default('medium'),
  type: varchar('type', { length: 50 }),
  source: varchar('source', { length: 30 }).notNull().default('manual'),
  context: text('context'),
  howMet: text('how_met'),
  connectedAt: timestamp('connected_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Person Relationships (richer person-to-person network edges) ──
export const personRelationships = pgTable('person_relationships', {
  id: uuid('id').primaryKey().defaultRandom(),
  personAId: uuid('person_a_id').notNull().references(() => people.id, { onDelete: 'cascade' }),
  personBId: uuid('person_b_id').notNull().references(() => people.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 50 }).notNull(),
  strength: integer('strength').notNull().default(3),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Organization Relationships (org-to-org network edges) ──
export const orgRelationships = pgTable('org_relationships', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgAId: uuid('org_a_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  orgBId: uuid('org_b_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 50 }).notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
