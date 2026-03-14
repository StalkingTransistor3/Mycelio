import { lte, isNotNull, asc, isNull, or, sql } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import type { FollowUp } from '@mycelio/shared';

const { people } = schema;

export async function getFollowUps(): Promise<FollowUp[]> {
  const now = new Date();

  // Get people who have a follow-up date or are overdue based on tier
  const allPeople = await db
    .select()
    .from(people)
    .orderBy(asc(people.nextFollowUpAt));

  return allPeople
    .map((p) => {
      const daysSinceContact = p.lastContactAt
        ? Math.floor((now.getTime() - p.lastContactAt.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      // Tier-based follow-up thresholds (days)
      const thresholds: Record<number, number> = {
        1: 7,    // weekly
        2: 14,   // biweekly
        3: 30,   // monthly
        4: 60,   // every 2 months
        5: 90,   // quarterly
      };

      const threshold = thresholds[p.tier] || 30;
      const overdue = p.nextFollowUpAt
        ? p.nextFollowUpAt <= now
        : daysSinceContact !== null && daysSinceContact > threshold;

      return {
        personId: p.id,
        personName: p.name,
        tier: p.tier as 1 | 2 | 3 | 4 | 5,
        lastContactAt: p.lastContactAt?.toISOString() || null,
        nextFollowUpAt: p.nextFollowUpAt?.toISOString() || null,
        daysSinceContact,
        overdue,
      };
    })
    .filter((f) => f.overdue || f.nextFollowUpAt)
    .sort((a, b) => {
      // Overdue first, then by days since contact
      if (a.overdue && !b.overdue) return -1;
      if (!a.overdue && b.overdue) return 1;
      return (b.daysSinceContact || 0) - (a.daysSinceContact || 0);
    });
}
