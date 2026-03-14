import { eq, sql } from 'drizzle-orm';
import { db, schema } from '../db/index.js';

const { organizations, people } = schema;

export async function findDuplicateOrgs() {
  const allOrgs = await db.select().from(organizations).orderBy(organizations.name);

  const duplicates: Array<{
    orgA: { id: string; name: string };
    orgB: { id: string; name: string };
    similarity: 'exact' | 'fuzzy';
  }> = [];

  for (let i = 0; i < allOrgs.length; i++) {
    for (let j = i + 1; j < allOrgs.length; j++) {
      const nameA = allOrgs[i].name.toLowerCase().trim();
      const nameB = allOrgs[j].name.toLowerCase().trim();

      if (nameA === nameB) {
        duplicates.push({
          orgA: { id: allOrgs[i].id, name: allOrgs[i].name },
          orgB: { id: allOrgs[j].id, name: allOrgs[j].name },
          similarity: 'exact',
        });
      } else if (
        nameA.includes(nameB) || nameB.includes(nameA) ||
        levenshteinDistance(nameA, nameB) <= 2
      ) {
        duplicates.push({
          orgA: { id: allOrgs[i].id, name: allOrgs[i].name },
          orgB: { id: allOrgs[j].id, name: allOrgs[j].name },
          similarity: 'fuzzy',
        });
      }
    }
  }

  return duplicates;
}

export async function mergeOrgs(keepId: string, removeId: string) {
  // Move all people from removeId to keepId
  const peopleMoved = await db
    .update(people)
    .set({
      organizationId: keepId,
      updatedAt: new Date(),
    })
    .where(eq(people.organizationId, removeId))
    .returning();

  // Update organizationIds JSONB: replace removeId with keepId
  const allPeople = await db.select().from(people);
  for (const p of allPeople) {
    const orgIds = p.organizationIds as string[];
    if (orgIds.includes(removeId)) {
      const newOrgIds = Array.from(new Set(
        orgIds.map(id => id === removeId ? keepId : id)
      ));
      await db
        .update(people)
        .set({ organizationIds: newOrgIds, updatedAt: new Date() })
        .where(eq(people.id, p.id));
    }
  }

  // Merge memberIds from removeOrg into keepOrg
  const keepOrg = await db.select().from(organizations).where(eq(organizations.id, keepId)).limit(1);
  const removeOrg = await db.select().from(organizations).where(eq(organizations.id, removeId)).limit(1);

  if (keepOrg[0] && removeOrg[0]) {
    const keepMembers = keepOrg[0].memberIds as string[];
    const removeMembers = removeOrg[0].memberIds as string[];
    const mergedMembers = Array.from(new Set([...keepMembers, ...removeMembers]));

    // Merge tags too
    const keepTags = keepOrg[0].tags as string[];
    const removeTags = removeOrg[0].tags as string[];
    const mergedTags = Array.from(new Set([...keepTags, ...removeTags]));

    await db
      .update(organizations)
      .set({
        memberIds: mergedMembers,
        tags: mergedTags,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, keepId));
  }

  // Delete the duplicate org
  await db.delete(organizations).where(eq(organizations.id, removeId));

  return {
    kept: keepId,
    removed: removeId,
    peopleMoved: peopleMoved.length,
  };
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= a.length; i++) matrix[i] = [i];
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }
  return matrix[a.length][b.length];
}
