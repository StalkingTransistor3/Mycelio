import { eq, desc } from 'drizzle-orm';
import { db, schema } from '../db/index.js';

const { events } = schema;

export async function createEvent(data: {
  name: string;
  date: Date;
  location?: string;
  description?: string;
  attendeeIds?: string[];
  tags?: string[];
}) {
  const result = await db
    .insert(events)
    .values({
      name: data.name,
      date: data.date,
      location: data.location || null,
      description: data.description || null,
      attendeeIds: data.attendeeIds || [],
      tags: data.tags || [],
    })
    .returning();
  return result[0];
}

export async function getEvents(limit = 50) {
  return db.select().from(events).orderBy(desc(events.date)).limit(limit);
}

export async function getEventById(id: string) {
  const result = await db.select().from(events).where(eq(events.id, id)).limit(1);
  return result[0] || null;
}

export async function updateEvent(id: string, data: Partial<{
  name: string;
  date: Date;
  location: string;
  description: string;
  attendeeIds: string[];
  tags: string[];
}>) {
  const result = await db
    .update(events)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(events.id, id))
    .returning();
  return result[0] || null;
}
