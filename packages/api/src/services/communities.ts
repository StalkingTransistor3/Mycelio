import { eq, desc, and, gte } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import type { CommunityHealth } from '@mycelio/shared';

const { communities, people, interactions } = schema;

export async function getCommunities() {
  return db.select().from(communities).orderBy(communities.name);
}

export async function getCommunityById(id: string) {
  const result = await db.select().from(communities).where(eq(communities.id, id)).limit(1);
  return result[0] || null;
}

export async function createCommunity(data: {
  name: string;
  description?: string;
  memberIds?: string[];
  tags?: string[];
}) {
  const result = await db
    .insert(communities)
    .values({
      name: data.name,
      description: data.description || null,
      memberIds: data.memberIds || [],
      tags: data.tags || [],
    })
    .returning();
  return result[0];
}

export async function getCommunityHealth(communityId: string): Promise<CommunityHealth | null> {
  const community = await getCommunityById(communityId);
  if (!community) return null;

  const memberIds = community.memberIds as string[];
  if (memberIds.length === 0) {
    return {
      communityId: community.id,
      communityName: community.name,
      memberCount: 0,
      avgTier: 0,
      recentInteractions: 0,
      staleMemberCount: 0,
    };
  }

  // Get member details
  const members = await db
    .select()
    .from(people)
    .where(
      eq(people.id, memberIds[0]) // fallback for single; real impl uses inArray
    );

  // For a real implementation with many members, use SQL IN clause
  // This is simplified for MVP
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
    communityId: community.id,
    communityName: community.name,
    memberCount: allMembers.length,
    avgTier: Math.round(avgTier * 10) / 10,
    recentInteractions: 0, // would count interactions in last 30 days
    staleMemberCount,
  };
}
