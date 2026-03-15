import { eq, ilike, and, desc } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import type {
  CampaignSearchParams,
  CampaignMemberSearchParams,
  CampaignMemberStatus,
  CampaignStats,
} from '@mycelio/shared';

const { campaigns, campaignMembers, people } = schema;

// ── Campaign CRUD ──

export async function searchCampaigns(params: CampaignSearchParams) {
  const conditions = [];

  if (params.query) {
    conditions.push(ilike(campaigns.name, `%${params.query}%`));
  }
  if (params.status) {
    conditions.push(eq(campaigns.status, params.status));
  }
  if (params.type) {
    conditions.push(eq(campaigns.type, params.type));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const limit = params.limit || 500;
  const offset = params.offset || 0;

  const results = await db
    .select()
    .from(campaigns)
    .where(where)
    .limit(limit)
    .offset(offset)
    .orderBy(desc(campaigns.updatedAt));

  // Filter by tags in application layer (jsonb)
  if (params.tags && params.tags.length > 0) {
    return results.filter((c) =>
      params.tags!.some((tag: string) => (c.tags as string[]).includes(tag))
    );
  }

  return results;
}

export async function getCampaignById(id: string) {
  const result = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
  return result[0] || null;
}

export async function createCampaign(data: {
  name: string;
  description?: string;
  goal?: string;
  status?: string;
  type?: string;
  tags?: string[];
  organizationIds?: string[];
  eventIds?: string[];
  startDate?: Date;
  endDate?: Date;
}) {
  const result = await db
    .insert(campaigns)
    .values({
      name: data.name,
      description: data.description || null,
      goal: data.goal || null,
      status: data.status || 'draft',
      type: data.type || 'outreach',
      tags: data.tags || [],
      organizationIds: data.organizationIds || [],
      eventIds: data.eventIds || [],
      startDate: data.startDate || null,
      endDate: data.endDate || null,
    })
    .returning();
  return result[0];
}

export async function updateCampaign(
  id: string,
  data: Partial<{
    name: string;
    description: string;
    goal: string;
    status: string;
    type: string;
    tags: string[];
    organizationIds: string[];
    eventIds: string[];
    startDate: Date;
    endDate: Date;
  }>
) {
  const result = await db
    .update(campaigns)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(campaigns.id, id))
    .returning();
  return result[0] || null;
}

export async function deleteCampaign(id: string) {
  const result = await db.delete(campaigns).where(eq(campaigns.id, id)).returning();
  return result[0] || null;
}

// ── Campaign Stats ──

export async function getCampaignStats(campaignId: string): Promise<CampaignStats> {
  const members = await db
    .select()
    .from(campaignMembers)
    .where(eq(campaignMembers.campaignId, campaignId));

  const total = members.length;
  const byStatus: Record<string, number> = {
    not_started: 0,
    contacted: 0,
    interested: 0,
    not_interested: 0,
    converted: 0,
    deferred: 0,
  };

  let warmthSum = 0;
  let warmthCount = 0;

  for (const m of members) {
    byStatus[m.status] = (byStatus[m.status] || 0) + 1;
    if (m.warmth != null) {
      warmthSum += m.warmth;
      warmthCount++;
    }
  }

  const contacted = total - (byStatus.not_started || 0);
  const contactedPercent = total > 0 ? Math.round((contacted / total) * 100) : 0;
  const conversionRate = total > 0 ? Math.round(((byStatus.converted || 0) / total) * 100) : 0;
  const avgWarmth = warmthCount > 0 ? Math.round((warmthSum / warmthCount) * 10) / 10 : null;

  return {
    totalMembers: total,
    byStatus: byStatus as Record<CampaignMemberStatus, number>,
    contactedPercent,
    conversionRate,
    avgWarmth,
  };
}

export async function getCampaignWithStats(id: string) {
  const campaign = await getCampaignById(id);
  if (!campaign) return null;
  const stats = await getCampaignStats(id);
  return { ...campaign, stats };
}

// ── Campaign Members ──

export async function getCampaignMembers(
  campaignId: string,
  params: CampaignMemberSearchParams = {}
) {
  const members = await db
    .select()
    .from(campaignMembers)
    .where(eq(campaignMembers.campaignId, campaignId));

  // Fetch people individually (matching existing service patterns)
  const personIds = members.map((m) => m.personId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const personMap = new Map<string, any>();
  for (const pid of personIds) {
    const rows = await db.select().from(people).where(eq(people.id, pid)).limit(1);
    if (rows[0]) personMap.set(pid, rows[0]);
  }

  // Enrich members with person data
  let enriched = members
    .filter((m) => personMap.has(m.personId))
    .map((m) => ({
      ...m,
      person: personMap.get(m.personId)!,
    }));

  // Apply filters
  if (params.query) {
    const q = params.query.toLowerCase();
    enriched = enriched.filter((m) => m.person.name.toLowerCase().includes(q));
  }
  if (params.status) {
    enriched = enriched.filter((m) => m.status === params.status);
  }
  if (params.tier != null) {
    enriched = enriched.filter((m) => m.person.tier === params.tier);
  }
  if (params.stage) {
    enriched = enriched.filter((m) => m.person.stage === params.stage);
  }
  if (params.tags && params.tags.length > 0) {
    enriched = enriched.filter((m) =>
      params.tags!.some((tag: string) => (m.person.tags as string[]).includes(tag))
    );
  }
  if (params.organizationId) {
    enriched = enriched.filter(
      (m) =>
        m.person.organizationId === params.organizationId ||
        (m.person.organizationIds as string[]).includes(params.organizationId!)
    );
  }
  if (params.minWarmth != null) {
    enriched = enriched.filter((m) => m.warmth != null && m.warmth >= params.minWarmth!);
  }
  if (params.maxWarmth != null) {
    enriched = enriched.filter((m) => m.warmth != null && m.warmth <= params.maxWarmth!);
  }

  // Sort
  const sortBy = params.sortBy || 'addedAt';
  const sortOrder = params.sortOrder || 'desc';
  const dir = sortOrder === 'asc' ? 1 : -1;

  enriched.sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return dir * a.person.name.localeCompare(b.person.name);
      case 'warmth': {
        const aw = a.warmth ?? -1;
        const bw = b.warmth ?? -1;
        return dir * (aw - bw);
      }
      case 'tier':
        return dir * (a.person.tier - b.person.tier);
      case 'priority':
        return dir * (a.priority - b.priority);
      case 'lastOutreach': {
        const at = a.lastOutreachAt ? new Date(a.lastOutreachAt).getTime() : 0;
        const bt = b.lastOutreachAt ? new Date(b.lastOutreachAt).getTime() : 0;
        return dir * (at - bt);
      }
      case 'nextAction': {
        const at = a.nextActionAt ? new Date(a.nextActionAt).getTime() : Infinity;
        const bt = b.nextActionAt ? new Date(b.nextActionAt).getTime() : Infinity;
        return dir * (at - bt);
      }
      case 'addedAt':
      default: {
        const at = new Date(a.addedAt).getTime();
        const bt = new Date(b.addedAt).getTime();
        return dir * (at - bt);
      }
    }
  });

  // Pagination
  const limit = params.limit || 500;
  const offset = params.offset || 0;
  return enriched.slice(offset, offset + limit);
}

export async function addCampaignMember(
  campaignId: string,
  data: {
    personId: string;
    priority?: number;
    warmth?: number;
    notes?: string;
    nextAction?: string;
    nextActionAt?: Date;
  }
) {
  // Check for duplicate
  const existing = await db
    .select()
    .from(campaignMembers)
    .where(
      and(
        eq(campaignMembers.campaignId, campaignId),
        eq(campaignMembers.personId, data.personId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  const result = await db
    .insert(campaignMembers)
    .values({
      campaignId,
      personId: data.personId,
      priority: data.priority ?? 0,
      warmth: data.warmth ?? null,
      notes: data.notes || null,
      nextAction: data.nextAction || null,
      nextActionAt: data.nextActionAt || null,
    })
    .returning();
  return result[0];
}

export async function addBulkCampaignMembers(campaignId: string, personIds: string[]) {
  let added = 0;
  for (const personId of personIds) {
    const existing = await db
      .select()
      .from(campaignMembers)
      .where(
        and(
          eq(campaignMembers.campaignId, campaignId),
          eq(campaignMembers.personId, personId)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      await db.insert(campaignMembers).values({ campaignId, personId });
      added++;
    }
  }
  return { added, total: personIds.length };
}

export async function updateCampaignMember(
  id: string,
  data: Partial<{
    status: string;
    priority: number;
    warmth: number;
    notes: string;
    nextAction: string;
    nextActionAt: Date;
    lastOutreachAt: Date;
  }>
) {
  const result = await db
    .update(campaignMembers)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(campaignMembers.id, id))
    .returning();
  return result[0] || null;
}

export async function removeCampaignMember(id: string) {
  const result = await db
    .delete(campaignMembers)
    .where(eq(campaignMembers.id, id))
    .returning();
  return result[0] || null;
}
