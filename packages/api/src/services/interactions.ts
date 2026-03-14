import { eq, desc } from 'drizzle-orm';
import { db, schema } from '../db/index.js';

const { interactions, people } = schema;

export async function logInteraction(data: {
  personId: string;
  type: string;
  summary: string;
  details?: string;
  occurredAt?: Date;
}) {
  const result = await db
    .insert(interactions)
    .values({
      personId: data.personId,
      type: data.type,
      summary: data.summary,
      details: data.details || null,
      occurredAt: data.occurredAt || new Date(),
    })
    .returning();

  // Update lastContactAt on the person
  await db
    .update(people)
    .set({
      lastContactAt: data.occurredAt || new Date(),
      updatedAt: new Date(),
    })
    .where(eq(people.id, data.personId));

  return result[0];
}

export async function getInteractionsByPerson(personId: string, limit = 20) {
  return db
    .select()
    .from(interactions)
    .where(eq(interactions.personId, personId))
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
