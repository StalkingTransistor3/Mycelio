import { eq, ilike, and, inArray, sql, gte } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import type { PeopleSearchParams } from '@mycelio/shared';
import { randomUUID } from 'crypto';

const { people } = schema;

export async function searchPeople(params: PeopleSearchParams) {
  const conditions = [];

  if (params.query) {
    conditions.push(
      ilike(people.name, `%${params.query}%`)
    );
  }
  if (params.tier) {
    conditions.push(eq(people.tier, params.tier));
  }
  if (params.organizationId) {
    conditions.push(eq(people.organizationId, params.organizationId));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const limit = params.limit || 5000;
  const offset = params.offset || 0;

  const results = await db
    .select()
    .from(people)
    .where(where)
    .limit(limit)
    .offset(offset)
    .orderBy(people.name);

  // Filter by tags in application layer (jsonb)
  if (params.tags && params.tags.length > 0) {
    return results.filter((p) =>
      params.tags!.some((tag: string) => (p.tags as string[]).includes(tag))
    );
  }

  return results;
}

export async function getPersonById(id: string) {
  const result = await db.select().from(people).where(eq(people.id, id)).limit(1);
  return result[0] || null;
}

export async function createPerson(data: {
  name: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  twitter?: string;
  instagram?: string;
  title?: string;
  organizationId?: string;
  organizationIds?: string[];
  tier?: number;
  tags?: string[];
  notes?: string;
}) {
  // Sync organizationIds with organizationId
  const orgIds = data.organizationIds || [];
  if (data.organizationId && !orgIds.includes(data.organizationId)) {
    orgIds.push(data.organizationId);
  }

  const result = await db
    .insert(people)
    .values({
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      linkedin: data.linkedin || null,
      twitter: data.twitter || null,
      instagram: data.instagram || null,
      title: data.title || null,
      organizationId: data.organizationId || null,
      organizationIds: orgIds,
      tier: data.tier || 3,
      tags: data.tags || [],
      notes: data.notes || null,
    })
    .returning();
  return result[0];
}

export async function updatePerson(id: string, data: Partial<{
  name: string;
  email: string;
  phone: string;
  linkedin: string;
  twitter: string;
  instagram: string;
  title: string;
  organizationId: string;
  organizationIds: string[];
  tier: number;
  tags: string[];
  archetypes: string[];
  values: string[];
  commProfile: Record<string, unknown>;
  milestones: Record<string, unknown>[];
  talkingPoints: Record<string, unknown>[];
  availability: Record<string, unknown>;
  stage: string;
  followUpConfig: Record<string, unknown>;
  snoozedUntil: Date;
  notes: string;
  lastContactAt: Date;
  nextFollowUpAt: Date;
}>) {
  // If organizationId is being set, ensure it's in organizationIds
  const updateData: Record<string, unknown> = { ...data, updatedAt: new Date() };
  if (data.organizationId && data.organizationIds) {
    if (!data.organizationIds.includes(data.organizationId)) {
      updateData.organizationIds = [...data.organizationIds, data.organizationId];
    }
  } else if (data.organizationId && !data.organizationIds) {
    // Fetch current organizationIds to ensure sync
    const current = await getPersonById(id);
    if (current) {
      const currentOrgIds = (current.organizationIds as string[]) || [];
      if (!currentOrgIds.includes(data.organizationId)) {
        updateData.organizationIds = [...currentOrgIds, data.organizationId];
      }
    }
  }

  const result = await db
    .update(people)
    .set(updateData)
    .where(eq(people.id, id))
    .returning();
  return result[0] || null;
}

export async function addMilestone(personId: string, milestone: {
  type: string;
  description: string;
  date?: string;
  recurring?: boolean;
}) {
  const person = await getPersonById(personId);
  if (!person) throw new Error('Person not found');

  const newMilestone = {
    id: randomUUID(),
    type: milestone.type,
    description: milestone.description,
    date: milestone.date || null,
    recurring: milestone.recurring || false,
    createdAt: new Date().toISOString(),
  };

  const existing = (person.milestones as Record<string, unknown>[]) || [];
  const result = await db
    .update(people)
    .set({
      milestones: [...existing, newMilestone],
      updatedAt: new Date(),
    })
    .where(eq(people.id, personId))
    .returning();
  return { person: result[0], milestone: newMilestone };
}

export async function addTalkingPoint(personId: string, point: {
  text: string;
  context?: string;
}) {
  const person = await getPersonById(personId);
  if (!person) throw new Error('Person not found');

  const newPoint = {
    id: randomUUID(),
    text: point.text,
    context: point.context || null,
    createdAt: new Date().toISOString(),
    usedAt: null,
    active: true,
  };

  const existing = (person.talkingPoints as Record<string, unknown>[]) || [];
  const result = await db
    .update(people)
    .set({
      talkingPoints: [...existing, newPoint],
      updatedAt: new Date(),
    })
    .where(eq(people.id, personId))
    .returning();
  return { person: result[0], talkingPoint: newPoint };
}

export async function getUpcomingMilestones(daysAhead = 30) {
  // Fetch all people who have milestones
  const allPeople = await db
    .select({
      id: people.id,
      name: people.name,
      milestones: people.milestones,
    })
    .from(people)
    .where(sql`jsonb_array_length(${people.milestones}) > 0`);

  const now = new Date();
  const cutoff = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  const upcoming: Array<{
    personId: string;
    personName: string;
    milestone: Record<string, unknown>;
    daysUntil: number;
  }> = [];

  for (const person of allPeople) {
    const milestones = (person.milestones as Record<string, unknown>[]) || [];
    for (const m of milestones) {
      if (!m.date) continue;
      const mDate = new Date(m.date as string);

      // For recurring milestones, check this year's occurrence
      if (m.recurring) {
        const thisYear = new Date(now.getFullYear(), mDate.getMonth(), mDate.getDate());
        if (thisYear >= now && thisYear <= cutoff) {
          upcoming.push({
            personId: person.id,
            personName: person.name,
            milestone: m,
            daysUntil: Math.ceil((thisYear.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
          });
        }
      } else if (mDate >= now && mDate <= cutoff) {
        upcoming.push({
          personId: person.id,
          personName: person.name,
          milestone: m,
          daysUntil: Math.ceil((mDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
        });
      }
    }
  }

  return upcoming.sort((a, b) => a.daysUntil - b.daysUntil);
}
