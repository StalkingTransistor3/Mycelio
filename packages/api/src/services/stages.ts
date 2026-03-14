import { eq } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import type { RelationshipStage, StageTransition } from '@mycelio/shared';

const { people } = schema;

const STAGE_ORDER: RelationshipStage[] = ['prospect', 'warm', 'active', 'collaborator', 'inner_circle'];

// Default follow-up cadence by stage (days)
const STAGE_CADENCE: Record<RelationshipStage, number> = {
  prospect: 60,
  warm: 30,
  active: 14,
  collaborator: 7,
  inner_circle: 5,
};

export function getStageIndex(stage: RelationshipStage): number {
  return STAGE_ORDER.indexOf(stage);
}

export async function transitionStage(
  personId: string,
  newStage: RelationshipStage,
  reason?: string
): Promise<{ person: unknown; transition: StageTransition } | null> {
  const person = await db.select().from(people).where(eq(people.id, personId)).limit(1);
  if (!person[0]) return null;

  const currentStage = (person[0].stage as RelationshipStage) || null;
  const transition: StageTransition = {
    from: currentStage,
    to: newStage,
    at: new Date().toISOString(),
    reason,
  };

  const existingHistory = (person[0].stageHistory as StageTransition[]) || [];

  const result = await db
    .update(people)
    .set({
      stage: newStage,
      stageHistory: [...existingHistory, transition],
      updatedAt: new Date(),
    })
    .where(eq(people.id, personId))
    .returning();

  return { person: result[0], transition };
}

export async function getPipeline(): Promise<Record<RelationshipStage, Array<{ id: string; name: string; tier: number; lastContactAt: string | null; daysSinceContact: number | null }>>> {
  const allPeople = await db.select().from(people);
  const now = new Date();

  const pipeline: Record<string, Array<{ id: string; name: string; tier: number; lastContactAt: string | null; daysSinceContact: number | null }>> = {};
  for (const stage of STAGE_ORDER) {
    pipeline[stage] = [];
  }

  for (const p of allPeople) {
    const stage = (p.stage as RelationshipStage) || 'prospect';
    if (!pipeline[stage]) pipeline[stage] = [];

    const daysSinceContact = p.lastContactAt
      ? Math.floor((now.getTime() - p.lastContactAt.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    pipeline[stage].push({
      id: p.id,
      name: p.name,
      tier: p.tier,
      lastContactAt: p.lastContactAt?.toISOString() || null,
      daysSinceContact,
    });
  }

  // Sort each stage by days since contact (most stale first)
  for (const stage of STAGE_ORDER) {
    pipeline[stage].sort((a, b) => (b.daysSinceContact || 999) - (a.daysSinceContact || 999));
  }

  return pipeline as Record<RelationshipStage, typeof pipeline[string]>;
}

/**
 * Suggest a stage based on interaction patterns.
 * Returns null if current stage seems appropriate.
 */
export async function suggestStage(personId: string): Promise<{
  currentStage: RelationshipStage;
  suggestedStage: RelationshipStage;
  reason: string;
} | null> {
  const person = await db.select().from(people).where(eq(people.id, personId)).limit(1);
  if (!person[0]) return null;

  const currentStage = (person[0].stage as RelationshipStage) || 'prospect';
  const tier = person[0].tier;
  const lastContact = person[0].lastContactAt;
  const daysSinceContact = lastContact
    ? Math.floor((new Date().getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // Suggest based on tier mapping:
  // T1 -> inner_circle, T2 -> collaborator, T3 -> active, T4 -> warm, T5 -> prospect
  const tierStageMap: Record<number, RelationshipStage> = {
    1: 'inner_circle',
    2: 'collaborator',
    3: 'active',
    4: 'warm',
    5: 'prospect',
  };

  const suggestedByTier = tierStageMap[tier] || 'prospect';
  const currentIdx = getStageIndex(currentStage);
  const suggestedIdx = getStageIndex(suggestedByTier);

  // If tier suggests advancement
  if (suggestedIdx > currentIdx) {
    return {
      currentStage,
      suggestedStage: suggestedByTier,
      reason: `Tier ${tier} suggests stage "${suggestedByTier}" (currently "${currentStage}")`,
    };
  }

  // If relationship has gone cold, suggest regression
  if (daysSinceContact !== null && daysSinceContact > 90 && currentIdx > 1) {
    const regressionStage = STAGE_ORDER[Math.max(0, currentIdx - 1)];
    return {
      currentStage,
      suggestedStage: regressionStage,
      reason: `No contact in ${daysSinceContact} days — consider moving to "${regressionStage}"`,
    };
  }

  return null;
}

export { STAGE_ORDER, STAGE_CADENCE };
