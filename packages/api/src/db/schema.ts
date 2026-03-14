import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  jsonb,
} from 'drizzle-orm/pg-core';

// ── People ──
export const people = pgTable('people', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  title: varchar('title', { length: 255 }),
  organizationId: uuid('organization_id').references(() => organizations.id),
  tier: integer('tier').notNull().default(3),
  tags: jsonb('tags').$type<string[]>().notNull().default([]),
  notes: text('notes'),
  lastContactAt: timestamp('last_contact_at', { withTimezone: true }),
  nextFollowUpAt: timestamp('next_follow_up_at', { withTimezone: true }),
  // embedding: vector('embedding', { dimensions: 1536 }), // deferred
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Organizations ──
export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  domain: varchar('domain', { length: 255 }),
  industry: varchar('industry', { length: 255 }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Interactions ──
export const interactions = pgTable('interactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  personId: uuid('person_id').notNull().references(() => people.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 50 }).notNull(),
  summary: text('summary').notNull(),
  details: text('details'),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Events ──
export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  date: timestamp('date', { withTimezone: true }).notNull(),
  location: varchar('location', { length: 255 }),
  description: text('description'),
  url: varchar('url', { length: 500 }),
  attendeeIds: jsonb('attendee_ids').$type<string[]>().notNull().default([]),
  tags: jsonb('tags').$type<string[]>().notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Communities ──
export const communities = pgTable('communities', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  memberIds: jsonb('member_ids').$type<string[]>().notNull().default([]),
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
  context: text('context'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
