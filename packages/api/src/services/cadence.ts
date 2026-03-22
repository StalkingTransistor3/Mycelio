import { asc, desc, sql, eq, and } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { getUpcomingMilestones } from './people.js';
import { computeReciprocityIndex } from './reciprocity.js';
import type { RelationshipTier, FollowUpConfig, CommProfile } from '@mycelio/shared';

const { people, interactions } = schema;

// ── Constants ──

/** Decay constants (λ) by tier. Half-life = ln(2)/λ */
const DECAY_CONSTANTS: Record<number, number> = {
  1: 0.0990,  // half-life ~7 days
  2: 0.0495,  // half-life ~14 days
  3: 0.0231,  // half-life ~30 days
  4: 0.0116,  // half-life ~60 days
  5: 0.0077,  // half-life ~90 days
};

/** Tier weights for priority scoring */
const TIER_WEIGHTS: Record<number, number> = {
  1: 5, 2: 4, 3: 3, 4: 2, 5: 1,
};

/** Default cadence thresholds in days */
const CADENCE_THRESHOLDS: Record<number, number> = {
  1: 7, 2: 14, 3: 30, 4: 60, 5: 90,
};

/** Estimated minutes per touch by tier */
const TOUCH_MINUTES: Record<number, number> = {
  1: 25, 2: 12, 3: 5, 4: 3, 5: 2,
};

/** Daily budget in minutes (~8hrs/week ÷ 7) */
const DAILY_BUDGET_MINUTES = 68;

/** Health status thresholds */
type HealthStatus = 'fresh' | 'warm' | 'cooling' | 'cold' | 'dormant';

function healthToStatus(health: number): HealthStatus {
  if (health >= 0.75) return 'fresh';
  if (health >= 0.50) return 'warm';
  if (health >= 0.25) return 'cooling';
  if (health >= 0.10) return 'cold';
  return 'dormant';
}

// ── Types ──

export interface CadenceEntry {
  personId: string;
  personName: string;
  tier: RelationshipTier;
  healthScore: number;
  healthStatus: HealthStatus;
  daysSinceContact: number | null;
  priority: number;
  suggestedTouchType: string;
  suggestedEffort: 'micro' | 'light' | 'medium' | 'deep' | 'immersive';
  suggestedChannel: string | null;
  estimatedMinutes: number;
  context: string[];
  upcomingMilestone: { type: string; description: string; daysUntil: number } | null;
  coolingAlert: boolean;
  reciprocityAssessment: string | null;
}

export interface DailyCadenceReport {
  date: string;
  budgetMinutes: number;
  usedMinutes: number;
  totalEligible: number;
  entries: CadenceEntry[];
  summary: {
    critical: number;
    overdue: number;
    dueSoon: number;
    skipped: number;
    tierBreakdown: Record<number, number>;
  };
}

export interface WeeklyCadenceStats {
  weekStart: string;
  weekEnd: string;
  totalTouches: number;
  totalMinutes: number;
  budgetMinutes: number;
  coverage: Record<number, { target: number; actual: number; percent: number }>;
  healthDistribution: Record<HealthStatus, number>;
  alerts: string[];
}

// ── Core Functions ──

/**
 * Compute relationship health score for a person.
 * Uses exponential decay with contextual modifiers.
 */
export function computeHealthScore(
  daysSinceContact: number | null,
  tier: number,
  modifiers?: {
    lastSentiment?: string | null;
    coolingTrajectory?: boolean;
    reciprocityBalance?: string | null;
    personOverwhelmed?: boolean;
    hasMilestoneWithin7Days?: boolean;
  }
): number {
  if (daysSinceContact === null) return 0.0; // Never contacted

  let lambda = DECAY_CONSTANTS[tier] || DECAY_CONSTANTS[3];

  // Apply modifiers
  if (modifiers) {
    if (modifiers.lastSentiment === 'positive') lambda *= 0.8;
    if (modifiers.lastSentiment === 'negative') lambda *= 1.3;
    if (modifiers.reciprocityBalance === 'balanced') lambda *= 0.9;
    if (modifiers.reciprocityBalance === 'one-sided') lambda *= 1.1;
    if (modifiers.coolingTrajectory) lambda *= 1.4;
    if (modifiers.personOverwhelmed) lambda *= 0.6;
    // Milestones don't modify decay — they boost priority directly
  }

  const health = Math.exp(-lambda * daysSinceContact);
  return Math.round(health * 100) / 100;
}

/**
 * Suggest a touch type based on tier, health, context, and communication profile.
 */
function suggestTouch(
  tier: number,
  healthStatus: HealthStatus,
  commProfile: CommProfile | null,
  hasMilestone: boolean,
  coolingAlert: boolean,
  lastInteractionTypes: string[]
): { touchType: string; effort: 'micro' | 'light' | 'medium' | 'deep' | 'immersive'; channel: string | null } {
  // Determine effort level
  let effort: 'micro' | 'light' | 'medium' | 'deep' | 'immersive';
  if (tier <= 1 && (healthStatus === 'cold' || healthStatus === 'dormant' || coolingAlert)) {
    effort = 'deep';
  } else if (tier <= 1) {
    effort = healthStatus === 'fresh' ? 'light' : 'deep';
  } else if (tier <= 2) {
    effort = (healthStatus === 'cold' || coolingAlert) ? 'deep' : 'medium';
  } else if (tier <= 3) {
    effort = (healthStatus === 'cold') ? 'medium' : 'light';
  } else {
    effort = 'micro';
  }

  // Determine touch type
  let touchType: string;
  if (hasMilestone) {
    touchType = tier <= 2 ? 'milestone acknowledgment (personal call/message)' : 'congratulations message';
  } else if (coolingAlert && tier <= 2) {
    touchType = 'schedule personal check-in or coffee';
  } else if (healthStatus === 'dormant') {
    touchType = 'low-pressure re-engagement (share relevant content)';
  } else if (healthStatus === 'cold') {
    if (tier <= 1) touchType = 'call or in-person meeting';
    else if (tier <= 2) touchType = 'meaningful personal message';
    else touchType = 'quick check-in or content share';
  } else if (healthStatus === 'cooling') {
    if (tier <= 2) touchType = 'content share with personal note';
    else touchType = '"thought of you" share';
  } else {
    // Warm or fresh — vary the channel
    if (tier <= 1) touchType = 'light check-in (vary channel)';
    else if (tier <= 2) touchType = 'social engagement or quick message';
    else if (tier <= 3) touchType = 'social media interaction';
    else touchType = 'social media like/comment';
  }

  // Channel suggestion
  let channel: string | null = commProfile?.preferredPlatform || null;
  if (!channel) {
    // Avoid repeating the last 2 channels
    const recentChannels = new Set(lastInteractionTypes.slice(0, 2));
    const tierDefaults: Record<number, string[]> = {
      1: ['call', 'in-person', 'message'],
      2: ['message', 'call', 'social'],
      3: ['social', 'message', 'email'],
      4: ['social', 'email', 'event'],
      5: ['event', 'social', 'email'],
    };
    const defaults = tierDefaults[tier] || tierDefaults[3];
    channel = defaults.find(c => !recentChannels.has(c)) || defaults[0];
  }

  return { touchType, effort, channel };
}

/**
 * Generate the daily cadence report — the core output of the system.
 * Returns a prioritized list of contacts to touch today within the time budget.
 */
export async function getDailyCadenceReport(options?: {
  budgetMinutes?: number;
  maxEntries?: number;
  includeFresh?: boolean;
  tierFilter?: number[];
}): Promise<DailyCadenceReport> {
  const now = new Date();
  const budget = options?.budgetMinutes ?? DAILY_BUDGET_MINUTES;
  const maxEntries = options?.maxEntries ?? 20;

  // 1. Load all people and supporting data in parallel
  const [allPeople, upcomingMilestones, recentSentimentRows] = await Promise.all([
    db.select().from(people).orderBy(asc(people.tier)),
    getUpcomingMilestones(7),
    db.execute(sql`
      SELECT person_id, sentiment FROM (
        SELECT person_id, sentiment,
          ROW_NUMBER() OVER (PARTITION BY person_id ORDER BY occurred_at DESC) as rn
        FROM ${interactions}
        WHERE sentiment IS NOT NULL
      ) ranked
      WHERE rn <= 3
    `),
  ]);

  // Build milestone map
  const milestoneMap = new Map<string, { type: string; description: string; daysUntil: number }>();
  for (const m of upcomingMilestones) {
    if (!milestoneMap.has(m.personId)) {
      milestoneMap.set(m.personId, {
        type: m.milestone.type as string,
        description: m.milestone.description as string,
        daysUntil: m.daysUntil,
      });
    }
  }

  // Build sentiment/cooling map
  const sentimentByPerson = new Map<string, string[]>();
  for (const row of recentSentimentRows.rows as Array<{ person_id: string; sentiment: string }>) {
    const existing = sentimentByPerson.get(row.person_id) || [];
    existing.push(row.sentiment);
    sentimentByPerson.set(row.person_id, existing);
  }

  const coolingSet = new Set<string>();
  const lastSentimentMap = new Map<string, string>();
  for (const [personId, sentiments] of sentimentByPerson) {
    lastSentimentMap.set(personId, sentiments[0]); // Most recent
    if (sentiments.length >= 2) {
      const neg = sentiments.filter(s => s === 'negative').length;
      const pos = sentiments.filter(s => s === 'positive').length;
      if (neg > pos) coolingSet.add(personId);
    }
  }

  // Build recent interaction types per person
  const recentTypesRows = await db.execute(sql`
    SELECT person_id, type FROM (
      SELECT person_id, type,
        ROW_NUMBER() OVER (PARTITION BY person_id ORDER BY occurred_at DESC) as rn
      FROM ${interactions}
    ) ranked
    WHERE rn <= 3
  `);
  const recentTypesByPerson = new Map<string, string[]>();
  for (const row of recentTypesRows.rows as Array<{ person_id: string; type: string }>) {
    const existing = recentTypesByPerson.get(row.person_id) || [];
    existing.push(row.type);
    recentTypesByPerson.set(row.person_id, existing);
  }

  // 2. Compute health and priority for each person
  const candidates: CadenceEntry[] = [];

  for (const p of allPeople) {
    // Skip snoozed
    if (p.snoozedUntil && p.snoozedUntil > now) continue;

    // Apply tier filter if specified
    if (options?.tierFilter && !options.tierFilter.includes(p.tier)) continue;

    const daysSinceContact = p.lastContactAt
      ? Math.floor((now.getTime() - p.lastContactAt.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const milestone = milestoneMap.get(p.id) || null;
    const coolingAlert = coolingSet.has(p.id);
    const lastSentiment = lastSentimentMap.get(p.id) || null;

    // Per-person cadence override
    const config = p.followUpConfig as FollowUpConfig | null;
    const cadenceDays = config?.cadenceDays || CADENCE_THRESHOLDS[p.tier] || 30;

    // Compute health
    const healthScore = computeHealthScore(daysSinceContact, p.tier, {
      lastSentiment,
      coolingTrajectory: coolingAlert,
      hasMilestoneWithin7Days: !!milestone,
    });

    const healthStatus = healthToStatus(healthScore);

    // Skip fresh contacts unless requested
    if (healthStatus === 'fresh' && !milestone && !coolingAlert && !options?.includeFresh) continue;

    // Compute priority
    const tierWeight = TIER_WEIGHTS[p.tier] || 1;
    let urgencyMultiplier = 1.0;
    const context: string[] = [];

    if (milestone && milestone.daysUntil <= 3) {
      urgencyMultiplier = 3.0;
      context.push(`${milestone.type.replace('_', ' ')} in ${milestone.daysUntil} days: "${milestone.description}"`);
    } else if (milestone) {
      urgencyMultiplier = 1.5;
      context.push(`Upcoming ${milestone.type.replace('_', ' ')} in ${milestone.daysUntil} days`);
    }

    if (coolingAlert) {
      urgencyMultiplier = Math.max(urgencyMultiplier, 2.5);
      context.push('Relationship cooling — sentiment trending negative');
    }

    if (healthStatus === 'dormant') {
      urgencyMultiplier = Math.max(urgencyMultiplier, 2.0);
      context.push('Dormant — at risk of permanent decay');
    } else if (healthStatus === 'cold') {
      urgencyMultiplier = Math.max(urgencyMultiplier, 1.5);
      context.push(`Overdue: ${daysSinceContact}d since contact (${cadenceDays}d cadence)`);
    } else if (healthStatus === 'cooling') {
      context.push(`${daysSinceContact}d since contact — approaching cadence threshold`);
    }

    const priority = (1 - healthScore) * tierWeight * urgencyMultiplier;

    // Suggest touch
    const commProfile = p.commProfile as CommProfile | null;
    const recentTypes = recentTypesByPerson.get(p.id) || [];
    const suggestion = suggestTouch(p.tier, healthStatus, commProfile, !!milestone, coolingAlert, recentTypes);

    candidates.push({
      personId: p.id,
      personName: p.name,
      tier: p.tier as RelationshipTier,
      healthScore,
      healthStatus,
      daysSinceContact,
      priority,
      suggestedTouchType: suggestion.touchType,
      suggestedEffort: suggestion.effort,
      suggestedChannel: suggestion.channel,
      estimatedMinutes: TOUCH_MINUTES[p.tier] || 5,
      context,
      upcomingMilestone: milestone,
      coolingAlert,
      reciprocityAssessment: null, // Computed on-demand to save queries
    });
  }

  // 3. Sort by priority descending
  candidates.sort((a, b) => b.priority - a.priority);

  // 4. Select entries within budget
  let usedMinutes = 0;
  const entries: CadenceEntry[] = [];
  let skipped = 0;

  for (const entry of candidates) {
    if (entries.length >= maxEntries) {
      skipped++;
      continue;
    }
    if (usedMinutes + entry.estimatedMinutes > budget && entries.length >= 5) {
      // Always include at least 5 entries, even if over budget
      skipped++;
      continue;
    }
    entries.push(entry);
    usedMinutes += entry.estimatedMinutes;
  }

  skipped += candidates.length - entries.length - skipped;

  // 5. Compute summary
  const tierBreakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let critical = 0;
  let overdue = 0;
  let dueSoon = 0;

  for (const e of entries) {
    tierBreakdown[e.tier] = (tierBreakdown[e.tier] || 0) + 1;
    if (e.healthStatus === 'cold' || e.healthStatus === 'dormant' || e.coolingAlert) critical++;
    else if (e.healthStatus === 'cooling') overdue++;
    else dueSoon++;
  }

  return {
    date: now.toISOString().split('T')[0],
    budgetMinutes: budget,
    usedMinutes,
    totalEligible: candidates.length,
    entries,
    summary: { critical, overdue, dueSoon, skipped, tierBreakdown },
  };
}

/**
 * Get weekly cadence compliance statistics.
 */
export async function getWeeklyCadenceStats(): Promise<WeeklyCadenceStats> {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
  weekStart.setHours(0, 0, 0, 0);

  // Get all interactions this week
  const weekInteractions = await db
    .select()
    .from(interactions)
    .where(
      sql`${interactions.occurredAt} >= ${weekStart.toISOString()}`
    );

  // Unique people touched this week
  const touchedIds = new Set<string>();
  for (const i of weekInteractions) {
    touchedIds.add(i.personId);
    const extra = (i.personIds as string[]) || [];
    for (const id of extra) touchedIds.add(id);
  }

  // Get all people for tier analysis
  const allPeople = await db.select().from(people);

  // Coverage by tier
  const tierCounts: Record<number, { total: number; touched: number }> = {
    1: { total: 0, touched: 0 },
    2: { total: 0, touched: 0 },
    3: { total: 0, touched: 0 },
    4: { total: 0, touched: 0 },
    5: { total: 0, touched: 0 },
  };

  // Health distribution
  const healthDist: Record<HealthStatus, number> = {
    fresh: 0, warm: 0, cooling: 0, cold: 0, dormant: 0,
  };

  for (const p of allPeople) {
    const tier = p.tier as number;
    if (tierCounts[tier]) tierCounts[tier].total++;
    if (touchedIds.has(p.id) && tierCounts[tier]) tierCounts[tier].touched++;

    const daysSinceContact = p.lastContactAt
      ? Math.floor((now.getTime() - p.lastContactAt.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    const health = computeHealthScore(daysSinceContact, tier);
    const status = healthToStatus(health);
    healthDist[status]++;
  }

  // Weekly targets: T1=2x, T2=1x, T3 pro-rated, T4-T5 pro-rated
  const coverage: Record<number, { target: number; actual: number; percent: number }> = {};
  const weeklyTargets: Record<number, number> = {
    1: 2.0,  // 2x/week
    2: 1.0,  // 1x/week
    3: 0.25, // 1x/month ≈ 0.25/week
    4: 0.12, // 1x/2mo ≈ 0.12/week
    5: 0.08, // 1x/quarter ≈ 0.08/week
  };

  for (const [tier, counts] of Object.entries(tierCounts)) {
    const t = Number(tier);
    const weeklyTarget = weeklyTargets[t] || 0;
    // Expected touches this week for this tier
    const target = Math.ceil(counts.total * weeklyTarget);
    coverage[t] = {
      target,
      actual: counts.touched,
      percent: target > 0 ? Math.round((counts.touched / target) * 100) : 100,
    };
  }

  // Alerts
  const alerts: string[] = [];
  if (coverage[1].percent < 100) {
    alerts.push(`T1 coverage at ${coverage[1].percent}% — ${coverage[1].target - coverage[1].actual} inner circle contacts missed`);
  }
  if (coverage[2].percent < 80) {
    alerts.push(`T2 coverage at ${coverage[2].percent}% — needs attention`);
  }
  if (healthDist.cold > 5) {
    alerts.push(`${healthDist.cold} contacts in "cold" status — review for re-engagement`);
  }

  // Estimate total minutes (rough: use tier averages)
  let totalMinutes = 0;
  for (const i of weekInteractions) {
    // Estimate based on type
    const typeMinutes: Record<string, number> = {
      meeting: 30, call: 15, email: 5, social: 2, event: 60, intro: 5, follow_up: 5, other: 5,
    };
    totalMinutes += typeMinutes[i.type] || 5;
  }

  return {
    weekStart: weekStart.toISOString().split('T')[0],
    weekEnd: now.toISOString().split('T')[0],
    totalTouches: weekInteractions.length,
    totalMinutes,
    budgetMinutes: DAILY_BUDGET_MINUTES * 7,
    coverage,
    healthDistribution: healthDist,
    alerts,
  };
}

/**
 * Format a cadence report as human-readable text (for MCP tool output).
 */
export function formatCadenceReport(report: DailyCadenceReport): string {
  const lines: string[] = [];

  lines.push('═══════════════════════════════════════════');
  lines.push(`  DAILY CADENCE REPORT — ${report.date}`);
  lines.push(`  Budget: ${report.budgetMinutes} min | ${report.entries.length} touches | ${report.totalEligible} eligible`);
  lines.push('═══════════════════════════════════════════');
  lines.push('');

  // Group by urgency
  const critical = report.entries.filter(e => e.healthStatus === 'cold' || e.healthStatus === 'dormant' || e.coolingAlert);
  const overdue = report.entries.filter(e => e.healthStatus === 'cooling' && !e.coolingAlert);
  const dueSoon = report.entries.filter(e => e.healthStatus === 'warm' || e.healthStatus === 'fresh');

  if (critical.length > 0) {
    lines.push('CRITICAL (do first)');
    for (const [i, e] of critical.entries()) {
      lines.push(`  ${i + 1}. [T${e.tier}] ${e.personName} — ${e.daysSinceContact !== null ? `${e.daysSinceContact}d since contact` : 'never contacted'}`);
      lines.push(`     Health: ${e.healthScore.toFixed(2)} (${e.healthStatus}) | ${e.suggestedTouchType} (~${e.estimatedMinutes} min)`);
      if (e.suggestedChannel) lines.push(`     Channel: ${e.suggestedChannel}`);
      for (const ctx of e.context) lines.push(`     > ${ctx}`);
      lines.push('');
    }
  }

  if (overdue.length > 0) {
    lines.push('OVERDUE');
    for (const [i, e] of overdue.entries()) {
      lines.push(`  ${i + 1}. [T${e.tier}] ${e.personName} — ${e.daysSinceContact !== null ? `${e.daysSinceContact}d since contact` : 'never contacted'}`);
      lines.push(`     Health: ${e.healthScore.toFixed(2)} (${e.healthStatus}) | ${e.suggestedTouchType} (~${e.estimatedMinutes} min)`);
      if (e.suggestedChannel) lines.push(`     Channel: ${e.suggestedChannel}`);
      for (const ctx of e.context) lines.push(`     > ${ctx}`);
      lines.push('');
    }
  }

  if (dueSoon.length > 0) {
    lines.push('DUE SOON');
    for (const [i, e] of dueSoon.entries()) {
      lines.push(`  ${i + 1}. [T${e.tier}] ${e.personName} — ${e.daysSinceContact !== null ? `${e.daysSinceContact}d since contact` : 'never contacted'}`);
      lines.push(`     Health: ${e.healthScore.toFixed(2)} (${e.healthStatus}) | ${e.suggestedTouchType} (~${e.estimatedMinutes} min)`);
      if (e.suggestedChannel) lines.push(`     Channel: ${e.suggestedChannel}`);
      for (const ctx of e.context) lines.push(`     > ${ctx}`);
      lines.push('');
    }
  }

  lines.push('═══════════════════════════════════════════');
  lines.push(`  Budget used: ${report.usedMinutes} min of ${report.budgetMinutes} min`);
  lines.push(`  Tier breakdown: T1:${report.summary.tierBreakdown[1]} T2:${report.summary.tierBreakdown[2]} T3:${report.summary.tierBreakdown[3]} T4:${report.summary.tierBreakdown[4]} T5:${report.summary.tierBreakdown[5]}`);
  if (report.summary.skipped > 0) {
    lines.push(`  Skipped: ${report.summary.skipped} contacts (over budget or max entries)`);
  }
  lines.push('═══════════════════════════════════════════');

  return lines.join('\n');
}

/**
 * Format weekly stats as human-readable text.
 */
export function formatWeeklyStats(stats: WeeklyCadenceStats): string {
  const lines: string[] = [];

  lines.push('══════════════════════════════════════');
  lines.push(`  WEEKLY CADENCE STATS — ${stats.weekStart} to ${stats.weekEnd}`);
  lines.push('══════════════════════════════════════');
  lines.push('');

  lines.push('Coverage:');
  for (const [tier, cov] of Object.entries(stats.coverage)) {
    const icon = cov.percent >= 100 ? 'OK' : cov.percent >= 80 ? 'WARN' : 'MISS';
    lines.push(`  T${tier}: ${cov.actual}/${cov.target} (${cov.percent}%) [${icon}]`);
  }
  lines.push('');

  lines.push(`Time spent: ~${Math.round(stats.totalMinutes / 60 * 10) / 10} hrs (budget: ${Math.round(stats.budgetMinutes / 60)} hrs)`);
  lines.push(`Total touches: ${stats.totalTouches}`);
  lines.push('');

  lines.push('Network Health Distribution:');
  lines.push(`  Fresh  (>0.75): ${stats.healthDistribution.fresh}`);
  lines.push(`  Warm   (0.50+): ${stats.healthDistribution.warm}`);
  lines.push(`  Cooling(0.25+): ${stats.healthDistribution.cooling}`);
  lines.push(`  Cold   (0.10+): ${stats.healthDistribution.cold}`);
  lines.push(`  Dormant(<0.10): ${stats.healthDistribution.dormant}`);
  lines.push('');

  if (stats.alerts.length > 0) {
    lines.push('Alerts:');
    for (const alert of stats.alerts) {
      lines.push(`  - ${alert}`);
    }
  }

  lines.push('══════════════════════════════════════');

  return lines.join('\n');
}
