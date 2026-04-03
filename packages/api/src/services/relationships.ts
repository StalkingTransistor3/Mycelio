import { eq, or, and, desc } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import type {
  PersonRelationshipType,
  PersonRelationshipEnriched,
  OrgRelationshipType,
  OrgRelationshipEnriched,
} from '@mycelio/shared';

const { personRelationships, orgRelationships, people, organizations } = schema;

// ── Person Relationships ──

export async function createPersonRelationship(data: {
  personAId: string;
  personBId: string;
  type: PersonRelationshipType;
  strength?: number;
  notes?: string;
}) {
  const result = await db
    .insert(personRelationships)
    .values({
      personAId: data.personAId,
      personBId: data.personBId,
      type: data.type,
      strength: data.strength ?? 3,
      notes: data.notes || null,
    })
    .returning();
  return result[0];
}

export async function getPersonRelationships(personId?: string): Promise<PersonRelationshipEnriched[]> {
  const allRels = personId
    ? await db
        .select()
        .from(personRelationships)
        .where(
          or(
            eq(personRelationships.personAId, personId),
            eq(personRelationships.personBId, personId)
          )
        )
        .orderBy(desc(personRelationships.createdAt))
    : await db
        .select()
        .from(personRelationships)
        .orderBy(desc(personRelationships.createdAt));

  if (allRels.length === 0) return [];

  // Collect all person IDs
  const personIds = new Set<string>();
  for (const r of allRels) {
    personIds.add(r.personAId);
    personIds.add(r.personBId);
  }

  // Fetch all people in one query
  const allPeople = await db.select().from(people);
  const peopleById = new Map(allPeople.map(p => [p.id, p]));

  return allRels.map(r => {
    const pA = peopleById.get(r.personAId);
    const pB = peopleById.get(r.personBId);
    return {
      id: r.id,
      personAId: r.personAId,
      personBId: r.personBId,
      type: r.type as PersonRelationshipType,
      strength: r.strength,
      notes: r.notes,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      personA: {
        id: r.personAId,
        name: pA?.name || 'Unknown',
        title: pA?.title || null,
        tier: pA?.tier ?? 5,
      },
      personB: {
        id: r.personBId,
        name: pB?.name || 'Unknown',
        title: pB?.title || null,
        tier: pB?.tier ?? 5,
      },
    };
  });
}

export async function getPersonRelationshipById(id: string) {
  const result = await db
    .select()
    .from(personRelationships)
    .where(eq(personRelationships.id, id));
  return result[0] || null;
}

export async function updatePersonRelationship(
  id: string,
  data: { type?: string; strength?: number; notes?: string }
) {
  const result = await db
    .update(personRelationships)
    .set({
      ...(data.type !== undefined ? { type: data.type } : {}),
      ...(data.strength !== undefined ? { strength: data.strength } : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
      updatedAt: new Date(),
    })
    .where(eq(personRelationships.id, id))
    .returning();
  return result[0] || null;
}

export async function deletePersonRelationship(id: string) {
  const result = await db
    .delete(personRelationships)
    .where(eq(personRelationships.id, id))
    .returning();
  return result[0] || null;
}

// ── Organization Relationships ──

export async function createOrgRelationship(data: {
  orgAId: string;
  orgBId: string;
  type: OrgRelationshipType;
  notes?: string;
}) {
  const result = await db
    .insert(orgRelationships)
    .values({
      orgAId: data.orgAId,
      orgBId: data.orgBId,
      type: data.type,
      notes: data.notes || null,
    })
    .returning();
  return result[0];
}

export async function getOrgRelationships(orgId?: string): Promise<OrgRelationshipEnriched[]> {
  const allRels = orgId
    ? await db
        .select()
        .from(orgRelationships)
        .where(
          or(
            eq(orgRelationships.orgAId, orgId),
            eq(orgRelationships.orgBId, orgId)
          )
        )
        .orderBy(desc(orgRelationships.createdAt))
    : await db
        .select()
        .from(orgRelationships)
        .orderBy(desc(orgRelationships.createdAt));

  if (allRels.length === 0) return [];

  // Fetch all orgs in one query
  const allOrgs = await db.select().from(organizations);
  const orgsById = new Map(allOrgs.map(o => [o.id, o]));

  return allRels.map(r => {
    const oA = orgsById.get(r.orgAId);
    const oB = orgsById.get(r.orgBId);
    return {
      id: r.id,
      orgAId: r.orgAId,
      orgBId: r.orgBId,
      type: r.type as OrgRelationshipType,
      notes: r.notes,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      orgA: {
        id: r.orgAId,
        name: oA?.name || 'Unknown',
        type: oA?.type || 'company',
      },
      orgB: {
        id: r.orgBId,
        name: oB?.name || 'Unknown',
        type: oB?.type || 'company',
      },
    };
  });
}

export async function getOrgRelationshipById(id: string) {
  const result = await db
    .select()
    .from(orgRelationships)
    .where(eq(orgRelationships.id, id));
  return result[0] || null;
}

export async function updateOrgRelationship(
  id: string,
  data: { type?: string; notes?: string }
) {
  const result = await db
    .update(orgRelationships)
    .set({
      ...(data.type !== undefined ? { type: data.type } : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
      updatedAt: new Date(),
    })
    .where(eq(orgRelationships.id, id))
    .returning();
  return result[0] || null;
}

export async function deleteOrgRelationship(id: string) {
  const result = await db
    .delete(orgRelationships)
    .where(eq(orgRelationships.id, id))
    .returning();
  return result[0] || null;
}
