import { sql, desc } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import type { ReciprocityIndex } from '@mycelio/shared';

const { interactions, people } = schema;

/**
 * Compute a reciprocity index for a relationship between the user and a specific person.
 * Analyzes initiation patterns, sentiment balance, energy, and frequency.
 */
export async function computeReciprocityIndex(
  personId: string,
  selfId?: string
): Promise<ReciprocityIndex | null> {
  const person = await db.select().from(people).where(sql`${people.id} = ${personId}`).limit(1);
  if (!person[0]) return null;

  // Get all interactions involving this person
  const allInteractions = await db
    .select()
    .from(interactions)
    .where(
      sql`${interactions.personId} = ${personId} OR ${interactions.personIds}::jsonb @> ${JSON.stringify([personId])}::jsonb`
    )
    .orderBy(desc(interactions.occurredAt));

  if (allInteractions.length === 0) {
    return {
      personId,
      personName: person[0].name,
      score: 50,
      breakdown: {
        totalInteractions: 0,
        youInitiated: 0,
        theyInitiated: 0,
        unknownInitiator: 0,
        initiationRatio: 0.5,
        avgResponseGapDays: null,
        sentimentBalance: { positive: 0, neutral: 0, negative: 0 },
        energyAvg: null,
        lastInteraction: null,
        interactionFrequencyDays: null,
      },
      assessment: 'insufficient-data',
    };
  }

  // Analyze initiation patterns
  let youInitiated = 0;
  let theyInitiated = 0;
  let unknownInitiator = 0;

  for (const i of allInteractions) {
    if (!i.initiatedBy) {
      unknownInitiator++;
    } else if (i.initiatedBy === personId) {
      theyInitiated++;
    } else {
      youInitiated++;
    }
  }

  // Sentiment balance
  const sentimentBalance = { positive: 0, neutral: 0, negative: 0 };
  for (const i of allInteractions) {
    if (i.sentiment === 'positive') sentimentBalance.positive++;
    else if (i.sentiment === 'negative') sentimentBalance.negative++;
    else if (i.sentiment === 'neutral') sentimentBalance.neutral++;
  }

  // Energy average
  const energyValues = allInteractions.filter(i => i.energy != null).map(i => i.energy!);
  const energyAvg = energyValues.length > 0
    ? Math.round((energyValues.reduce((s, e) => s + e, 0) / energyValues.length) * 10) / 10
    : null;

  // Interaction frequency
  let interactionFrequencyDays: number | null = null;
  if (allInteractions.length >= 2) {
    const dates = allInteractions.map(i => new Date(i.occurredAt).getTime()).sort((a, b) => a - b);
    const gaps: number[] = [];
    for (let j = 1; j < dates.length; j++) {
      gaps.push((dates[j] - dates[j - 1]) / (1000 * 60 * 60 * 24));
    }
    interactionFrequencyDays = Math.round((gaps.reduce((s, g) => s + g, 0) / gaps.length) * 10) / 10;
  }

  // Response gap: average days between consecutive interactions
  const avgResponseGapDays = interactionFrequencyDays;

  // Compute initiation ratio (0 = you always initiate, 1 = they always initiate)
  const knownCount = youInitiated + theyInitiated;
  const initiationRatio = knownCount > 0 ? theyInitiated / knownCount : 0.5;

  // Compute composite score (0-100, 50 = perfectly balanced)
  let score: number;
  if (knownCount < 2) {
    score = 50; // not enough data
  } else {
    // Base on initiation ratio: 0.5 = perfect (score 100), 0 or 1 = one-sided (score 0)
    const balanceScore = 1 - Math.abs(initiationRatio - 0.5) * 2; // 0-1
    // Factor in sentiment: more positive = better
    const totalSentiment = sentimentBalance.positive + sentimentBalance.neutral + sentimentBalance.negative;
    const sentimentScore = totalSentiment > 0
      ? (sentimentBalance.positive - sentimentBalance.negative) / totalSentiment
      : 0; // -1 to 1
    // Factor in energy
    const energyScore = energyAvg ? (energyAvg - 1) / 4 : 0.5; // normalize 1-5 to 0-1

    score = Math.round(
      (balanceScore * 0.5 + ((sentimentScore + 1) / 2) * 0.25 + energyScore * 0.25) * 100
    );
    score = Math.max(0, Math.min(100, score));
  }

  // Assessment
  let assessment: ReciprocityIndex['assessment'];
  if (knownCount < 3) {
    assessment = 'insufficient-data';
  } else if (initiationRatio >= 0.35 && initiationRatio <= 0.65) {
    assessment = 'balanced';
  } else if (initiationRatio < 0.35) {
    assessment = 'you-lead';
  } else if (initiationRatio > 0.65) {
    assessment = 'they-lead';
  } else {
    assessment = 'balanced';
  }

  // Flag one-sided if extreme imbalance
  if (knownCount >= 5 && (initiationRatio < 0.15 || initiationRatio > 0.85)) {
    assessment = 'one-sided';
  }

  return {
    personId,
    personName: person[0].name,
    score,
    breakdown: {
      totalInteractions: allInteractions.length,
      youInitiated,
      theyInitiated,
      unknownInitiator,
      initiationRatio: Math.round(initiationRatio * 100) / 100,
      avgResponseGapDays,
      sentimentBalance,
      energyAvg,
      lastInteraction: allInteractions[0]?.occurredAt?.toISOString?.() || String(allInteractions[0]?.occurredAt) || null,
      interactionFrequencyDays,
    },
    assessment,
  };
}
