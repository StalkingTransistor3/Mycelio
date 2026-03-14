import { eq, ilike, sql, desc } from 'drizzle-orm';
import { db, schema } from '../db/index.js';

const { venues, events } = schema;

export async function createVenue(data: {
  name: string;
  address?: string;
  capacity?: number;
  vibe?: string[];
  contactPersonId?: string;
  organizationId?: string;
  notes?: string;
  tags?: string[];
  availability?: Record<string, unknown>;
}) {
  const result = await db
    .insert(venues)
    .values({
      name: data.name,
      address: data.address || null,
      capacity: data.capacity || null,
      vibe: data.vibe || [],
      contactPersonId: data.contactPersonId || null,
      organizationId: data.organizationId || null,
      notes: data.notes || null,
      tags: data.tags || [],
      availability: data.availability || null,
    })
    .returning();
  return result[0];
}

export async function getVenues(limit = 100) {
  return db.select().from(venues).orderBy(venues.name).limit(limit);
}

export async function getVenueById(id: string) {
  const result = await db.select().from(venues).where(eq(venues.id, id)).limit(1);
  return result[0] || null;
}

export async function updateVenue(id: string, data: Partial<{
  name: string;
  address: string;
  capacity: number;
  vibe: string[];
  contactPersonId: string;
  organizationId: string;
  notes: string;
  tags: string[];
  availability: Record<string, unknown>;
}>) {
  const result = await db
    .update(venues)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(venues.id, id))
    .returning();
  return result[0] || null;
}

export async function getVenueHistory(venueId: string, limit = 50) {
  return db
    .select()
    .from(events)
    .where(eq(events.venueId, venueId))
    .orderBy(desc(events.date))
    .limit(limit);
}

export async function searchVenues(criteria: {
  name?: string;
  minCapacity?: number;
  vibe?: string[];
  tags?: string[];
}) {
  let results = await db.select().from(venues).orderBy(venues.name);

  if (criteria.name) {
    const q = criteria.name.toLowerCase();
    results = results.filter(v => v.name.toLowerCase().includes(q));
  }
  if (criteria.minCapacity) {
    results = results.filter(v => v.capacity && v.capacity >= criteria.minCapacity!);
  }
  if (criteria.vibe && criteria.vibe.length > 0) {
    results = results.filter(v =>
      criteria.vibe!.some(vb => (v.vibe as string[]).includes(vb))
    );
  }
  if (criteria.tags && criteria.tags.length > 0) {
    results = results.filter(v =>
      criteria.tags!.some(t => (v.tags as string[]).includes(t))
    );
  }

  return results;
}
