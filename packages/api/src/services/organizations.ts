import { eq } from 'drizzle-orm';
import { db, schema } from '../db/index.js';

const { organizations } = schema;

export async function getOrganizations() {
  return db.select().from(organizations).orderBy(organizations.name);
}

export async function getOrganizationById(id: string) {
  const result = await db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
  return result[0] || null;
}

export async function createOrganization(data: {
  name: string;
  domain?: string;
  industry?: string;
  notes?: string;
}) {
  const result = await db
    .insert(organizations)
    .values({
      name: data.name,
      domain: data.domain || null,
      industry: data.industry || null,
      notes: data.notes || null,
    })
    .returning();
  return result[0];
}

export async function updateOrganization(id: string, data: Partial<{
  name: string;
  domain: string;
  industry: string;
  notes: string;
}>) {
  const result = await db
    .update(organizations)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(organizations.id, id))
    .returning();
  return result[0] || null;
}
