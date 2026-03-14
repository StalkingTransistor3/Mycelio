import { eq, desc, sql } from 'drizzle-orm';
import { db, schema } from '../db/index.js';

const { interactions, people } = schema;

export async function logInteraction(data: {
  personId: string;
  personIds?: string[];
  eventId?: string;
  type: string;
  sentiment?: string;
  energy?: number;
  initiatedBy?: string;
  summary: string;
  details?: string;
  occurredAt?: Date;
}) {
  // Ensure personIds always includes the primary personId
  const allPersonIds = data.personIds && data.personIds.length > 0
    ? Array.from(new Set([data.personId, ...data.personIds]))
    : [data.personId];

  const result = await db
    .insert(interactions)
    .values({
      personId: data.personId,
      personIds: allPersonIds,
      eventId: data.eventId || null,
      type: data.type,
      sentiment: data.sentiment || null,
      energy: data.energy || null,
      initiatedBy: data.initiatedBy || null,
      summary: data.summary,
      details: data.details || null,
      occurredAt: data.occurredAt || new Date(),
    })
    .returning();

  // Update lastContactAt and auto-compute nextFollowUpAt on ALL referenced people
  const contactDate = data.occurredAt || new Date();
  const tierThresholds: Record<number, number> = { 1: 7, 2: 14, 3: 30, 4: 60, 5: 90 };

  for (const pid of allPersonIds) {
    const person = await db.select().from(people).where(eq(people.id, pid)).limit(1);
    if (!person[0]) continue;

    const config = person[0].followUpConfig as Record<string, unknown> | null;
    const cadenceDays = (config?.cadenceDays as number) || tierThresholds[person[0].tier] || 30;
    const nextFollowUp = new Date(contactDate.getTime() + cadenceDays * 24 * 60 * 60 * 1000);

    await db
      .update(people)
      .set({
        lastContactAt: contactDate,
        nextFollowUpAt: nextFollowUp,
        updatedAt: new Date(),
      })
      .where(eq(people.id, pid));
  }

  return result[0];
}

export async function getInteractionsByPerson(personId: string, limit = 20) {
  // Match on either the legacy personId column OR the personIds JSONB array
  return db
    .select()
    .from(interactions)
    .where(
      sql`${interactions.personId} = ${personId} OR ${interactions.personIds}::jsonb @> ${JSON.stringify([personId])}::jsonb`
    )
    .orderBy(desc(interactions.occurredAt))
    .limit(limit);
}

export async function getInteractionsByEvent(eventId: string, limit = 100) {
  return db
    .select()
    .from(interactions)
    .where(eq(interactions.eventId, eventId))
    .orderBy(desc(interactions.occurredAt))
    .limit(limit);
}

export async function getRecentInteractions(limit = 50) {
  return db
    .select()
    .from(interactions)
    .orderBy(desc(interactions.occurredAt))
    .limit(limit);
}

export async function getPersonSentimentTrajectory(personId: string, limit = 10) {
  return db
    .select({
      id: interactions.id,
      type: interactions.type,
      sentiment: interactions.sentiment,
      energy: interactions.energy,
      summary: interactions.summary,
      occurredAt: interactions.occurredAt,
    })
    .from(interactions)
    .where(
      sql`(${interactions.personId} = ${personId} OR ${interactions.personIds}::jsonb @> ${JSON.stringify([personId])}::jsonb) AND (${interactions.sentiment} IS NOT NULL OR ${interactions.energy} IS NOT NULL)`
    )
    .orderBy(desc(interactions.occurredAt))
    .limit(limit);
}
