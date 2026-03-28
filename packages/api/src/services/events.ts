import { eq, asc, and } from 'drizzle-orm';
import { db, schema } from '../db/index.js';

const { events } = schema;

export async function createEvent(data: {
  name: string;
  date: Date;
  venueId?: string;
  location?: string;
  description?: string;
  url?: string;
  isOrganizer?: number;
  status?: string;
  attendeeIds?: string[];
  attendees?: { personId: string; role: string }[];
  tags?: string[];
}) {
  // Dual-write: keep attendeeIds in sync with attendees
  const structuredAttendees = data.attendees || [];
  const attendeeIdsFromStructured = structuredAttendees.map(a => a.personId);
  const mergedAttendeeIds = Array.from(new Set([
    ...(data.attendeeIds || []),
    ...attendeeIdsFromStructured,
  ]));

  const result = await db
    .insert(events)
    .values({
      name: data.name,
      date: data.date,
      venueId: data.venueId || null,
      location: data.location || null,
      description: data.description || null,
      url: data.url || null,
      isOrganizer: data.isOrganizer ?? 0,
      status: data.status || 'upcoming',
      attendeeIds: mergedAttendeeIds,
      attendees: structuredAttendees,
      tags: data.tags || [],
    })
    .returning();
  return result[0];
}

export async function getEvents(limit = 100, onlyMine = false) {
  if (onlyMine) {
    return db.select().from(events)
      .where(eq(events.isOrganizer, 1))
      .orderBy(asc(events.date)).limit(limit);
  }
  return db.select().from(events).orderBy(asc(events.date)).limit(limit);
}

export async function getEventById(id: string) {
  const result = await db.select().from(events).where(eq(events.id, id)).limit(1);
  return result[0] || null;
}

export async function updateEvent(id: string, data: Partial<{
  name: string;
  date: Date;
  venueId: string;
  location: string;
  description: string;
  url: string;
  attendeeIds: string[];
  attendees: { personId: string; role: string }[];
  tags: string[];
}>) {
  // If attendees provided, sync attendeeIds
  const updateData: Record<string, unknown> = { ...data, updatedAt: new Date() };
  if (data.attendees) {
    const idsFromAttendees = data.attendees.map(a => a.personId);
    const existingIds = data.attendeeIds || [];
    updateData.attendeeIds = Array.from(new Set([...existingIds, ...idsFromAttendees]));
  }

  const result = await db
    .update(events)
    .set(updateData)
    .where(eq(events.id, id))
    .returning();
  return result[0] || null;
}
