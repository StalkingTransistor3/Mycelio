import { asc, desc, sql } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { getUpcomingMilestones } from './people.js';
import { getPersonSentimentTrajectory } from './interactions.js';
import type { FollowUp } from '@mycelio/shared';

const { people } = schema;

export async function getFollowUps(options?: { includeSnoozed?: boolean; limit?: number }): Promise<FollowUp[]> {
  const now = new Date();

  const allPeople = await db
    .select()
    .from(people)
    .orderBy(asc(people.nextFollowUpAt));

  // Get upcoming milestones for next 7 days
  const upcoming = await getUpcomingMilestones(7);
  const milestoneMap = new Map<string, { type: string; description: string; daysUntil: number }>();
  for (const m of upcoming) {
    if (!milestoneMap.has(m.personId)) {
      milestoneMap.set(m.personId, {
        type: m.milestone.type as string,
        description: m.milestone.description as string,
        daysUntil: m.daysUntil,
      });
    }
  }

  const results: FollowUp[] = [];

  for (const p of allPeople) {
    // Skip snoozed unless requested
    const snoozedUntil = p.snoozedUntil;
    if (snoozedUntil && snoozedUntil > now && !options?.includeSnoozed) {
      continue;
    }

    const daysSinceContact = p.lastContactAt
      ? Math.floor((now.getTime() - p.lastContactAt.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    // Per-person cadence override or tier-based threshold
    const config = p.followUpConfig as Record<string, unknown> | null;
    const thresholds: Record<number, number> = {
      1: 7, 2: 14, 3: 30, 4: 60, 5: 90,
    };
    const threshold = (config?.cadenceDays as number) || thresholds[p.tier] || 30;

    const overdue = p.nextFollowUpAt
      ? p.nextFollowUpAt <= now
      : daysSinceContact !== null && daysSinceContact > threshold;

    // Detect sentiment cooling: check if last 3 interactions trend negative
    let coolingAlert = false;
    try {
      const trajectory = await getPersonSentimentTrajectory(p.id, 3);
      if (trajectory.length >= 2) {
        const negativeCount = trajectory.filter(t => t.sentiment === 'negative').length;
        const positiveCount = trajectory.filter(t => t.sentiment === 'positive').length;
        coolingAlert = negativeCount > positiveCount;
      }
    } catch {
      // Ignore sentiment errors
    }

    const upcomingMilestone = milestoneMap.get(p.id) || null;

    // Generate suggested action
    let suggestedAction: string | null = null;
    if (upcomingMilestone) {
      suggestedAction = `${upcomingMilestone.type.replace('_', ' ')} in ${upcomingMilestone.daysUntil} days — reach out`;
    } else if (coolingAlert) {
      suggestedAction = 'Relationship cooling — schedule a personal check-in';
    } else if (overdue && daysSinceContact && daysSinceContact > threshold * 2) {
      suggestedAction = 'Significantly overdue — re-engage with low-pressure touchpoint';
    }

    const followUp: FollowUp = {
      personId: p.id,
      personName: p.name,
      tier: p.tier as 1 | 2 | 3 | 4 | 5,
      lastContactAt: p.lastContactAt?.toISOString() || null,
      nextFollowUpAt: p.nextFollowUpAt?.toISOString() || null,
      daysSinceContact,
      overdue,
      snoozedUntil: snoozedUntil?.toISOString() || null,
      coolingAlert,
      upcomingMilestone,
      suggestedAction,
    };

    if (overdue || p.nextFollowUpAt || upcomingMilestone || coolingAlert) {
      results.push(followUp);
    }
  }

  const sorted = results.sort((a, b) => {
    // Cooling alerts first, then overdue, then by days since contact
    if (a.coolingAlert && !b.coolingAlert) return -1;
    if (!a.coolingAlert && b.coolingAlert) return 1;
    if (a.overdue && !b.overdue) return -1;
    if (!a.overdue && b.overdue) return 1;
    return (b.daysSinceContact || 0) - (a.daysSinceContact || 0);
  });

  return options?.limit ? sorted.slice(0, options.limit) : sorted;
}
