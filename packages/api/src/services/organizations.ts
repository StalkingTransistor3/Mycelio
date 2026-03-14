import { eq } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import type { OrganizationHealth } from '@mycelio/shared';

const { organizations, people } = schema;

export async function getOrganizations(filter?: { type?: string }) {
  const query = db.select().from(organizations).orderBy(organizations.name);
  const results = await query;
  if (filter?.type) {
    return results.filter((o) => o.type === filter.type);
  }
  return results;
}

export async function getOrganizationById(id: string) {
  const result = await db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
  return result[0] || null;
}

export async function getOrganizationByName(name: string) {
  const all = await db.select().from(organizations).orderBy(organizations.name);
  return all.find((o) => o.name.toLowerCase().includes(name.toLowerCase())) || null;
}

export async function createOrganization(data: {
  name: string;
  type?: string;
  domain?: string;
  industry?: string;
  description?: string;
  notes?: string;
  memberIds?: string[];
  tags?: string[];
}) {
  const result = await db
    .insert(organizations)
    .values({
      name: data.name,
      type: data.type || 'company',
      domain: data.domain || null,
      industry: data.industry || null,
      description: data.description || null,
      notes: data.notes || null,
      memberIds: data.memberIds || [],
      tags: data.tags || [],
    })
    .returning();
  return result[0];
}

export async function updateOrganization(id: string, data: Partial<{
  name: string;
  type: string;
  domain: string;
  industry: string;
  description: string;
  notes: string;
  memberIds: string[];
  tags: string[];
}>) {
  const result = await db
    .update(organizations)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(organizations.id, id))
    .returning();
  return result[0] || null;
}

export async function getOrganizationMembers(id: string) {
  const org = await getOrganizationById(id);
  if (!org) return null;

  const memberIds = org.memberIds as string[];
  if (memberIds.length === 0) return [];

  const members = [];
  for (const mid of memberIds) {
    const m = await db.select().from(people).where(eq(people.id, mid)).limit(1);
    if (m[0]) members.push(m[0]);
  }
  return members;
}

export async function getOrganizationHealth(orgId: string): Promise<OrganizationHealth | null> {
  const org = await getOrganizationById(orgId);
  if (!org) return null;

  const memberIds = org.memberIds as string[];
  if (memberIds.length === 0) {
    return {
      organizationId: org.id,
      organizationName: org.name,
      memberCount: 0,
      avgTier: 0,
      recentInteractions: 0,
      staleMemberCount: 0,
    };
  }

  const allMembers = [];
  for (const mid of memberIds) {
    const m = await db.select().from(people).where(eq(people.id, mid)).limit(1);
    if (m[0]) allMembers.push(m[0]);
  }

  const avgTier = allMembers.length > 0
    ? allMembers.reduce((sum, m) => sum + m.tier, 0) / allMembers.length
    : 0;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const staleMemberCount = allMembers.filter(
    (m) => !m.lastContactAt || m.lastContactAt < thirtyDaysAgo
  ).length;

  return {
    organizationId: org.id,
    organizationName: org.name,
    memberCount: allMembers.length,
    avgTier: Math.round(avgTier * 10) / 10,
    recentInteractions: 0,
    staleMemberCount,
  };
}
