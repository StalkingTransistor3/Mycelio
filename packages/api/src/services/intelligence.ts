import { eq, desc, sql } from 'drizzle-orm';
import { db, schema } from '../db/index.js';

const { interactions, people } = schema;

/**
 * Analyze communication patterns for a person.
 * Tracks which channels work, timing patterns, and response quality.
 */
export async function analyzeCommPatterns(personId: string) {
  const allInteractions = await db
    .select()
    .from(interactions)
    .where(
      sql`${interactions.personId} = ${personId} OR ${interactions.personIds}::jsonb @> ${JSON.stringify([personId])}::jsonb`
    )
    .orderBy(desc(interactions.occurredAt));

  if (allInteractions.length === 0) return null;

  // Channel effectiveness: which types get positive sentiment
  const channelStats: Record<string, { total: number; positive: number; negative: number; avgEnergy: number | null; energySum: number; energyCount: number }> = {};

  for (const i of allInteractions) {
    if (!channelStats[i.type]) {
      channelStats[i.type] = { total: 0, positive: 0, negative: 0, avgEnergy: null, energySum: 0, energyCount: 0 };
    }
    const stat = channelStats[i.type];
    stat.total++;
    if (i.sentiment === 'positive') stat.positive++;
    if (i.sentiment === 'negative') stat.negative++;
    if (i.energy != null) {
      stat.energySum += i.energy;
      stat.energyCount++;
    }
  }

  // Compute averages
  for (const stat of Object.values(channelStats)) {
    stat.avgEnergy = stat.energyCount > 0 ? Math.round((stat.energySum / stat.energyCount) * 10) / 10 : null;
  }

  // Best channel: highest positive ratio
  const channels = Object.entries(channelStats)
    .filter(([, s]) => s.total >= 2)
    .map(([type, s]) => ({
      type,
      total: s.total,
      positiveRate: s.total > 0 ? Math.round((s.positive / s.total) * 100) : 0,
      avgEnergy: s.avgEnergy,
    }))
    .sort((a, b) => b.positiveRate - a.positiveRate);

  // Timing patterns: day of week and time of day
  const dayOfWeekCounts: Record<string, number> = {};
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  for (const i of allInteractions) {
    const day = dayNames[new Date(i.occurredAt).getDay()];
    dayOfWeekCounts[day] = (dayOfWeekCounts[day] || 0) + 1;
  }

  const bestDays = Object.entries(dayOfWeekCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([day, count]) => ({ day, count }));

  // Sentiment trajectory over time
  const recentSentiments = allInteractions
    .filter(i => i.sentiment)
    .slice(0, 10)
    .map(i => ({
      sentiment: i.sentiment!,
      date: i.occurredAt,
    }));

  const trajectory = recentSentiments.length >= 3
    ? ((): 'warming' | 'cooling' | 'stable' => {
        const recent = recentSentiments.slice(0, 3);
        const older = recentSentiments.slice(3, 6);
        const sentimentVal = (s: string) => s === 'positive' ? 1 : s === 'negative' ? -1 : 0;
        const recentAvg = recent.reduce((sum, s) => sum + sentimentVal(s.sentiment), 0) / recent.length;
        const olderAvg = older.length > 0
          ? older.reduce((sum, s) => sum + sentimentVal(s.sentiment), 0) / older.length
          : 0;
        if (recentAvg > olderAvg + 0.3) return 'warming';
        if (recentAvg < olderAvg - 0.3) return 'cooling';
        return 'stable';
      })()
    : 'stable';

  return {
    personId,
    totalInteractions: allInteractions.length,
    channels,
    bestChannel: channels[0]?.type || null,
    bestDays,
    trajectory,
    recentSentiments: recentSentiments.slice(0, 5),
    lastInteraction: allInteractions[0]?.occurredAt || null,
  };
}

/**
 * Auto-detect availability/stress from interaction patterns.
 * Infer if someone is overwhelmed based on declining sentiment, fewer responses, etc.
 */
export async function detectAvailability(personId: string): Promise<{
  inferredStatus: 'available' | 'busy' | 'overwhelmed' | 'unknown';
  confidence: number;
  signals: string[];
} | null> {
  const person = await db.select().from(people).where(eq(people.id, personId)).limit(1);
  if (!person[0]) return null;

  const recentInteractions = await db
    .select()
    .from(interactions)
    .where(
      sql`(${interactions.personId} = ${personId} OR ${interactions.personIds}::jsonb @> ${JSON.stringify([personId])}::jsonb) AND ${interactions.occurredAt} >= ${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()}`
    )
    .orderBy(desc(interactions.occurredAt));

  const signals: string[] = [];
  let score = 0; // negative = overwhelmed, positive = available

  // Signal 1: Recent interaction count
  if (recentInteractions.length === 0) {
    signals.push('No interactions in 30 days');
    score -= 1;
  } else if (recentInteractions.length >= 5) {
    signals.push(`${recentInteractions.length} interactions in 30 days`);
    score += 2;
  }

  // Signal 2: Sentiment trend
  const sentiments = recentInteractions.filter(i => i.sentiment);
  if (sentiments.length >= 2) {
    const negativeCount = sentiments.filter(i => i.sentiment === 'negative').length;
    const positiveCount = sentiments.filter(i => i.sentiment === 'positive').length;
    if (negativeCount > positiveCount) {
      signals.push('Recent sentiment trending negative');
      score -= 2;
    } else if (positiveCount > negativeCount * 2) {
      signals.push('Recent sentiment very positive');
      score += 1;
    }
  }

  // Signal 3: Energy levels
  const energyValues = recentInteractions.filter(i => i.energy != null).map(i => i.energy!);
  if (energyValues.length >= 2) {
    const avgEnergy = energyValues.reduce((s, e) => s + e, 0) / energyValues.length;
    if (avgEnergy < 2.5) {
      signals.push(`Low avg energy (${avgEnergy.toFixed(1)}/5)`);
      score -= 2;
    } else if (avgEnergy >= 4) {
      signals.push(`High avg energy (${avgEnergy.toFixed(1)}/5)`);
      score += 1;
    }
  }

  // Signal 4: Response gap widening
  if (recentInteractions.length >= 3) {
    const gaps: number[] = [];
    for (let i = 1; i < Math.min(recentInteractions.length, 5); i++) {
      const gap = new Date(recentInteractions[i - 1].occurredAt).getTime() - new Date(recentInteractions[i].occurredAt).getTime();
      gaps.push(gap / (1000 * 60 * 60 * 24));
    }
    const recentGap = gaps[0] || 0;
    const olderAvgGap = gaps.slice(1).reduce((s, g) => s + g, 0) / (gaps.length - 1 || 1);
    if (recentGap > olderAvgGap * 2 && recentGap > 7) {
      signals.push('Response gaps widening');
      score -= 1;
    }
  }

  // Determine status
  let inferredStatus: 'available' | 'busy' | 'overwhelmed' | 'unknown';
  if (signals.length === 0) {
    inferredStatus = 'unknown';
  } else if (score <= -3) {
    inferredStatus = 'overwhelmed';
  } else if (score <= -1) {
    inferredStatus = 'busy';
  } else {
    inferredStatus = 'available';
  }

  const confidence = Math.min(1, Math.max(0.1, signals.length * 0.25));

  return { inferredStatus, confidence: Math.round(confidence * 100) / 100, signals };
}

/**
 * Smart re-engagement: enhanced follow-up triggers that factor in
 * relationship trajectory, reciprocity, and contextual signals.
 */
export async function getSmartReengagement(personId: string): Promise<{
  urgency: 'critical' | 'high' | 'medium' | 'low' | 'none';
  reasons: string[];
  suggestedApproach: string;
  suggestedChannel: string | null;
  suggestedTiming: string | null;
} | null> {
  const person = await db.select().from(people).where(eq(people.id, personId)).limit(1);
  if (!person[0]) return null;

  const p = person[0];
  const now = new Date();
  const daysSinceContact = p.lastContactAt
    ? Math.floor((now.getTime() - p.lastContactAt.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const tierThresholds: Record<number, number> = { 1: 7, 2: 14, 3: 30, 4: 60, 5: 90 };
  const config = p.followUpConfig as Record<string, unknown> | null;
  const threshold = (config?.cadenceDays as number) || tierThresholds[p.tier] || 30;

  const reasons: string[] = [];
  let urgencyScore = 0;

  // Factor 1: Time overdue
  if (daysSinceContact !== null) {
    const overdueRatio = daysSinceContact / threshold;
    if (overdueRatio > 3) {
      reasons.push(`Significantly overdue: ${daysSinceContact}d since contact (${threshold}d threshold)`);
      urgencyScore += 3;
    } else if (overdueRatio > 1.5) {
      reasons.push(`Overdue: ${daysSinceContact}d since contact`);
      urgencyScore += 2;
    } else if (overdueRatio > 1) {
      reasons.push(`Slightly overdue: ${daysSinceContact}d since contact`);
      urgencyScore += 1;
    }
  } else {
    reasons.push('Never contacted');
    urgencyScore += 1;
  }

  // Factor 2: Tier importance
  if (p.tier <= 2 && urgencyScore > 0) {
    reasons.push(`High-priority tier (T${p.tier})`);
    urgencyScore += 1;
  }

  // Factor 3: Milestones
  const milestones = (p.milestones as Array<{ type: string; description: string; date?: string; recurring?: boolean }>) || [];
  for (const m of milestones) {
    if (!m.date) continue;
    const mDate = new Date(m.date);
    if (m.recurring) {
      const thisYear = new Date(now.getFullYear(), mDate.getMonth(), mDate.getDate());
      const daysUntil = Math.ceil((thisYear.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      if (daysUntil >= 0 && daysUntil <= 7) {
        reasons.push(`Upcoming ${m.type}: "${m.description}" in ${daysUntil}d`);
        urgencyScore += 2;
      }
    }
  }

  // Determine urgency level
  let urgency: 'critical' | 'high' | 'medium' | 'low' | 'none';
  if (urgencyScore >= 5) urgency = 'critical';
  else if (urgencyScore >= 3) urgency = 'high';
  else if (urgencyScore >= 2) urgency = 'medium';
  else if (urgencyScore >= 1) urgency = 'low';
  else urgency = 'none';

  // Suggested approach based on context
  let suggestedApproach = 'Send a casual check-in message';
  if (urgency === 'critical') {
    suggestedApproach = 'Schedule a personal meeting or call — this relationship needs attention';
  } else if (reasons.some(r => r.includes('Upcoming'))) {
    suggestedApproach = 'Reach out acknowledging their upcoming milestone';
  } else if (daysSinceContact && daysSinceContact > threshold * 2) {
    suggestedApproach = 'Low-pressure touchpoint — share something relevant to their interests';
  }

  // Suggested channel from comm profile
  const commProfile = p.commProfile as Record<string, unknown> | null;
  const suggestedChannel = (commProfile?.preferredPlatform as string) || null;
  const suggestedTiming = (commProfile?.bestTimes as string) || null;

  return {
    urgency,
    reasons,
    suggestedApproach,
    suggestedChannel,
    suggestedTiming,
  };
}
