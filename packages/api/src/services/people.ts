import { eq, ilike, and, inArray, sql } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import type { PeopleSearchParams } from '@mycelio/shared';

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
  const limit = params.limit || 50;
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
  title?: string;
  organizationId?: string;
  tier?: number;
  tags?: string[];
  notes?: string;
}) {
  const result = await db
    .insert(people)
    .values({
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      title: data.title || null,
      organizationId: data.organizationId || null,
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
  title: string;
  organizationId: string;
  tier: number;
  tags: string[];
  notes: string;
  lastContactAt: Date;
  nextFollowUpAt: Date;
}>) {
  const result = await db
    .update(people)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(people.id, id))
    .returning();
  return result[0] || null;
}
