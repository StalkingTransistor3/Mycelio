# Mycelio Relationship Maintenance Cadence System

## Design Document v1.0

**Author:** Kira (Starship Velociraptor)
**Date:** 2026-03-20
**Status:** Design Complete — Ready for Implementation

---

## 1. Problem Statement

Andrew maintains ~2,020 contacts across 271 organizations. Without systematic maintenance, relationships decay by default — this is biology (Dunbar), not personal failure. The goal: a tiered cadence system that generates prioritized daily reminders within a fixed time budget (~8hrs/week), suggesting the right touch type for each contact at the right time.

**Key constraint:** The system generates reminders. Andrew controls all outbound communication. No auto-sending. Ever.

---

## 2. Dunbar-to-Mycelio Tier Mapping

### Theoretical Foundation

Dunbar's layers (validated: 23 studies, 61M people) define cognitive relationship capacity. Robinett's 5+50+100 system provides practical cadence targets. We synthesize both:

| Dunbar Layer | Cognitive Limit | Mycelio Tier | Label | Population Target | Touch Cadence | Time per Touch | Weekly Budget |
|---|---|---|---|---|---|---|---|
| Intimate | 5 | **T1** | Inner Circle | 5 | 2x/week | 15-30 min | ~2.5 hrs |
| Sympathy | 15 | **T2** | Key Relationships | 10-15 | 1x/week | 10-15 min | ~2.5 hrs |
| Close | 50 | **T3** | Active Network | 35-50 | 1x/month | 5-10 min | ~1.5 hrs |
| Casual | 150 | **T4** | Extended Network | 100 | 1x/2 months | 3-5 min | ~1.0 hrs |
| Acquaintance | 500+ | **T5** | Acquaintances | 1,800+ | 1x/quarter | 1-3 min | ~0.5 hrs |

**Total weekly budget: ~8 hours**

### Daily Touch Budget Breakdown

| Metric | Value |
|---|---|
| Weekly budget | 8 hours (480 min) |
| Daily budget | ~68 min (~1hr 8min) |
| Target touches/day | 7-12 |
| T1 touches/day | ~1-2 (10 touches/week across 5 people) |
| T2 touches/day | ~2-3 (15 touches/week across 15 people) |
| T3 touches/day | ~2-3 (~10/week across 50 people monthly) |
| T4 touches/day | ~1-2 (spread across 100 people bimonthly) |
| T5 touches/day | ~1 (batch/event-based, quarterly) |

---

## 3. Touch Type Taxonomy

### Touch Types by Effort Level

| Level | Time | Examples | Best For |
|---|---|---|---|
| **Micro** (1-3 min) | < 3 min | Social media like/comment, emoji reaction, content share | T4, T5 |
| **Light** (3-5 min) | 3-5 min | Quick message, voice note, relevant article forward | T3, T4 |
| **Medium** (10-15 min) | 10-15 min | Meaningful message, intro facilitation, feedback request | T2, T3 |
| **Deep** (30-60 min) | 30-60 min | Call, coffee, lunch, collaborative session, dinner | T1, T2 |
| **Immersive** (60+ min) | 60+ min | Full meeting, working session, event co-attendance | T1 |

### Recommended Touch Types by Tier

#### T1 — Inner Circle (2x/week)
- **Primary:** Deep conversation (call, meeting, dinner)
- **Secondary:** Personal check-in message, proactive help/intro
- **Milestone:** Always personalized, meaningful gesture
- **Key rule:** Never go more than 5 days without contact. Vary channel.

#### T2 — Key Relationships (weekly)
- **Primary:** Meaningful message, coffee/lunch, strategic intro
- **Secondary:** Content share with personal note, event invitation
- **Milestone:** Personalized acknowledgment
- **Key rule:** Alternate between digital and in-person. Reference past conversations.

#### T3 — Active Network (monthly)
- **Primary:** Content share, social media engagement, group event invite
- **Secondary:** Brief check-in, "saw this and thought of you"
- **Milestone:** Congratulations message
- **Key rule:** Low-pressure, context-relevant touches. Batch where possible.

#### T4 — Extended Network (bimonthly)
- **Primary:** Social media interactions, event-based reactivation
- **Secondary:** Seasonal/milestone greetings, relevant article forward
- **Key rule:** Maintain visibility without obligation. Events are the primary vehicle.

#### T5 — Acquaintances (quarterly)
- **Primary:** Batch communications (newsletter, event announcements)
- **Secondary:** Social media presence, annual milestone acknowledgment
- **Key rule:** Keep the thread alive. One meaningful touch > four generic ones.

---

## 4. Relationship Decay Model

### Exponential Decay Function

Relationship health decays exponentially after last contact:

```
health(t) = e^(-λ × t)
```

Where:
- `t` = days since last contact
- `λ` = decay constant (varies by tier)
- `health` = 0.0 to 1.0 (1.0 = just contacted)

### Decay Constants by Tier

| Tier | λ (decay rate) | Half-life (days) | Critical threshold (health < 0.25) |
|---|---|---|---|
| T1 | 0.0990 | 7 days | 14 days |
| T2 | 0.0495 | 14 days | 28 days |
| T3 | 0.0231 | 30 days | 60 days |
| T4 | 0.0116 | 60 days | 120 days |
| T5 | 0.0077 | 90 days | 180 days |

### Health Status Mapping

| Health Score | Status | Visual | Action |
|---|---|---|---|
| 1.00 - 0.75 | **Fresh** | Green | No action needed |
| 0.75 - 0.50 | **Warm** | Yellow | Touch soon (within cadence) |
| 0.50 - 0.25 | **Cooling** | Orange | Overdue — schedule touch |
| 0.25 - 0.10 | **Cold** | Red | Critical — prioritize re-engagement |
| < 0.10 | **Dormant** | Grey | Relationship at risk — dormant tie reactivation needed |

### Decay Modifiers

The base decay rate is adjusted by contextual signals:

| Signal | Modifier | Rationale |
|---|---|---|
| Positive last sentiment | λ × 0.8 (slower decay) | Good interactions linger |
| Negative last sentiment | λ × 1.3 (faster decay) | Negative needs faster repair |
| High reciprocity balance | λ × 0.9 | Balanced relationships are more resilient |
| One-sided (you lead) | λ × 1.1 | Over-investing may signal fading |
| Milestone within 7 days | λ × 1.5 (force urgency) | Time-sensitive opportunity |
| Person overwhelmed | λ × 0.6 (slower) | Don't pile on when they're stressed |
| Cooling trajectory | λ × 1.4 | Trend-aware — catch declines early |

---

## 5. Daily Cadence Engine

### Algorithm: Priority Queue Generation

Each day, the cadence engine generates a prioritized list of recommended touches:

```
1. COMPUTE health score for all contacts
2. APPLY decay modifiers (sentiment, reciprocity, milestones, availability)
3. FILTER to actionable contacts:
   - Not snoozed
   - Health < tier-appropriate threshold
   - OR has upcoming milestone (within 7 days)
   - OR cooling alert triggered
4. SCORE each contact:
   priority = (1 - health) × tier_weight × urgency_multiplier
   Where:
     tier_weight = { T1: 5, T2: 4, T3: 3, T4: 2, T5: 1 }
     urgency_multiplier:
       - Milestone in ≤3 days: 3.0
       - Cooling alert: 2.5
       - Health < 0.10 (dormant risk): 2.0
       - Health < 0.25 (cold): 1.5
       - Default: 1.0
5. SORT by priority descending
6. SELECT top N contacts that fit daily time budget
7. SUGGEST touch type based on:
   - Tier → appropriate effort level
   - Comm profile → preferred channel
   - Last interaction type → vary channel
   - Context → milestone, cooling, dormant
```

### Daily Output Format (Cadence Report)

```
═══════════════════════════════════════════
  DAILY CADENCE REPORT — 2026-03-20
  Budget: 68 min remaining | 10 touches
═══════════════════════════════════════════

🔴 CRITICAL (do first)
  1. [T1] Sarah Chen — 12 days since contact
     Health: 0.18 | Suggested: Call (15 min)
     Context: Birthday in 3 days
     Channel: Phone (preferred)

  2. [T2] James Wu — 21 days since contact
     Health: 0.22 | Suggested: Coffee invite (5 min)
     Context: Cooling trajectory detected
     Channel: LinkedIn DM

🟠 OVERDUE
  3. [T2] Lisa Park — 18 days since contact
     Health: 0.41 | Suggested: Share article (3 min)
     Channel: Email

  4. [T3] Marcus Webb — 35 days since contact
     Health: 0.44 | Suggested: Quick check-in (3 min)
     Channel: Text

🟡 DUE SOON
  5. [T1] David Kim — 5 days since contact
     Health: 0.61 | Suggested: Deep conversation (30 min)
     Channel: In-person meeting

  ...

═══════════════════════════════════════════
  Budget used: 56 min of 68 min
  Skipped: 3 T4, 5 T5 (can batch at weekend)
═══════════════════════════════════════════
```

---

## 6. Weekly Cadence Rhythm

### Suggested Weekly Schedule

| Day | Focus | Touch Profile |
|---|---|---|
| **Monday** | T1 deep dive + T2 warm-up | 1-2 deep, 2-3 medium |
| **Tuesday** | T2 priority + T3 batch | 2-3 medium, 3-4 light |
| **Wednesday** | T1 midweek + T3 social | 1 deep, 2-3 light, 2-3 micro |
| **Thursday** | T2 follow-through + T4 batch | 2-3 medium, 3-4 micro |
| **Friday** | T1 close-week + milestones | 1-2 deep, milestone touches |
| **Saturday** | T3-T5 batch day | 5-10 micro/light (social media sweep) |
| **Sunday** | Weekly review + planning | Review cadence report, plan Monday |

### Weekly Review Checklist

- [ ] All T1 contacts touched 2x this week?
- [ ] All T2 contacts touched 1x this week?
- [ ] T3 batch complete for this week's cohort?
- [ ] Any cooling alerts unaddressed?
- [ ] Any milestones in next 7 days planned for?
- [ ] Reciprocity imbalances identified and addressed?
- [ ] Dormant ties worth reactivating this week?

---

## 7. Integration Points with Existing Mycelio

### Existing Infrastructure Used

| Component | How Cadence Uses It |
|---|---|
| `people.tier` | Determines decay rate and touch cadence |
| `people.lastContactAt` | Input to decay function |
| `people.nextFollowUpAt` | Overridden by cadence engine for precision |
| `people.followUpConfig.cadenceDays` | Per-person cadence override |
| `people.snoozedUntil` | Respected — snooze suppresses reminders |
| `people.commProfile` | Drives channel suggestions |
| `people.milestones` | Milestone-triggered urgency boost |
| `people.stage` | Influences touch type suggestions |
| `interactions` table | Tracks touches, feeds decay modifiers |
| `follow-ups` service | Base priority calculation (enhanced by cadence) |
| `intelligence` service | Comm patterns, availability, smart re-engagement |
| `reciprocity` service | Reciprocity balance as decay modifier |
| `campaigns` system | Batch outreach for T4-T5 segments |

### New Components Required

| Component | Type | Description |
|---|---|---|
| `cadence.ts` service | Backend service | Core cadence engine — health calculation, priority queue, touch suggestions |
| `cadence_touchpoints` table | DB schema | Track generated recommendations and completion status |
| `/api/cadence/daily` | REST endpoint | Get today's cadence report |
| `/api/cadence/stats` | REST endpoint | Weekly cadence compliance stats |
| `cadence_report` MCP tool | MCP tool | Get daily cadence report via Claude |
| `complete_touch` MCP tool | MCP tool | Mark a recommended touch as completed |
| Daily cron job | System | Generate daily cadence report at 7am AEST |

---

## 8. Implementation Plan

### Phase 1: Core Cadence Engine (Service Layer)

**File:** `packages/api/src/services/cadence.ts`

```typescript
// Core functions to implement:

interface CadenceEntry {
  personId: string;
  personName: string;
  tier: RelationshipTier;
  healthScore: number;          // 0.0 - 1.0
  healthStatus: 'fresh' | 'warm' | 'cooling' | 'cold' | 'dormant';
  daysSinceContact: number | null;
  priority: number;             // higher = more urgent
  suggestedTouchType: string;   // 'call', 'message', 'coffee', etc.
  suggestedChannel: string | null;
  estimatedMinutes: number;
  context: string[];            // reasons for priority
  upcomingMilestone: { type: string; description: string; daysUntil: number } | null;
  coolingAlert: boolean;
  reciprocityAssessment: string | null;
}

interface DailyCadenceReport {
  date: string;
  budgetMinutes: number;
  usedMinutes: number;
  entries: CadenceEntry[];
  summary: {
    critical: number;
    overdue: number;
    dueSoon: number;
    skipped: number;
    tierBreakdown: Record<number, number>;
  };
}

// Functions:
computeHealthScore(person, interactions, modifiers): number
getDailyCadenceReport(options): DailyCadenceReport
getWeeklyCadenceStats(): WeeklyStats
suggestTouchType(person, lastInteractions): TouchSuggestion
```

### Phase 2: Database Extension

**New table:** `cadence_touchpoints`

```sql
CREATE TABLE cadence_touchpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  generated_date DATE NOT NULL,
  priority NUMERIC NOT NULL,
  health_score NUMERIC NOT NULL,
  suggested_touch_type VARCHAR(50),
  suggested_channel VARCHAR(50),
  estimated_minutes INTEGER,
  context JSONB DEFAULT '[]',
  status VARCHAR(20) DEFAULT 'pending',  -- pending, completed, skipped, deferred
  completed_at TIMESTAMPTZ,
  completed_via VARCHAR(50),  -- interaction type used
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cadence_date ON cadence_touchpoints(generated_date);
CREATE INDEX idx_cadence_person ON cadence_touchpoints(person_id);
CREATE INDEX idx_cadence_status ON cadence_touchpoints(status);
```

### Phase 3: API Endpoints

```
GET  /api/cadence/daily          — Today's cadence report
GET  /api/cadence/daily/:date    — Cadence report for a specific date
GET  /api/cadence/stats          — Weekly/monthly compliance stats
POST /api/cadence/generate       — Force-generate today's cadence
POST /api/cadence/:id/complete   — Mark a touchpoint as completed
POST /api/cadence/:id/skip       — Skip with reason
POST /api/cadence/:id/defer      — Defer to tomorrow
```

### Phase 4: MCP Tools

```
cadence_report     — Get today's prioritized touch list
complete_touch     — Mark a contact as touched (logs interaction + completes touchpoint)
cadence_stats      — View weekly compliance metrics
```

### Phase 5: Automation

- **Daily cron (7am AEST):** Generate cadence report, store touchpoints
- **Weekly cron (Sunday 8pm AEST):** Generate weekly review summary
- **Integration with `log_interaction`:** Auto-complete matching cadence touchpoints when interactions are logged

---

## 9. Touch Suggestion Logic

### Channel Selection Algorithm

```
1. Check person.commProfile.preferredPlatform → use if set
2. Check recent interaction types → avoid repeating last 2 channels
3. Apply tier-appropriate defaults:
   T1: call > in-person > message
   T2: message > call > social
   T3: social > message > email
   T4: social > email > event
   T5: event > social > email
4. Factor in context:
   Milestone → personal channel (call/message)
   Cooling → warm channel (call/in-person)
   Dormant → low-pressure (social/email)
   Batch → scalable channel (social/email)
```

### Touch Type Selection Matrix

| Tier | Health Status | Has Milestone? | Cooling? | Suggested Touch |
|---|---|---|---|---|
| T1 | Cold | Yes | - | Call + milestone acknowledgment |
| T1 | Cold | No | Yes | In-person meeting ASAP |
| T1 | Cold | No | No | Call or deep message |
| T1 | Cooling | - | - | Schedule deep conversation |
| T1 | Warm/Fresh | - | - | Light check-in (vary channel) |
| T2 | Cold | Yes | - | Personal message + milestone |
| T2 | Cold | No | Yes | Coffee/lunch invite |
| T2 | Cold | No | No | Meaningful message |
| T2 | Cooling | - | - | Content share + check-in |
| T2 | Warm/Fresh | - | - | Social engagement |
| T3 | Cold | Yes | - | Congratulations message |
| T3 | Cold | No | - | Quick check-in or content share |
| T3 | Cooling | - | - | "Thought of you" share |
| T3+ | Any | - | - | Social media / batch |

---

## 10. Dormant Tie Reactivation Protocol

Per Granovetter + Ferrazzi: dormant ties have MORE value than maintained ties because they've accumulated divergent experience.

### Reactivation Triggers

- Contact drops below health 0.10 AND was previously T1-T3
- Upcoming event that contact attended previously
- Contact's organization appears in news/funding
- Mutual connection recently mentioned them
- Seasonal reactivation window (New Year, holidays)

### Reactivation Approaches (by original tier)

| Former Tier | Approach | Example |
|---|---|---|
| T1-T2 | Personal, direct | "Hey, I was thinking about our [shared project]. How have you been?" |
| T3 | Context-driven | "Saw [relevant news]. Reminded me of our conversation about [topic]." |
| T4-T5 | Event-based | Event invitation, group gathering, "catching up at [event name]" |

---

## 11. Metrics & Compliance Tracking

### Key Metrics

| Metric | Target | Measurement |
|---|---|---|
| **T1 coverage** | 100% touched 2x/week | Weekly audit |
| **T2 coverage** | 100% touched 1x/week | Weekly audit |
| **T3 coverage** | 100% touched 1x/month | Monthly audit |
| **Budget adherence** | 7-9 hrs/week | Weekly total |
| **Cadence compliance** | > 80% of daily touchpoints completed | Daily tracking |
| **Decay prevention** | < 5% of T1-T3 in "cold" status | Weekly snapshot |
| **Relationship health avg** | T1 > 0.7, T2 > 0.6, T3 > 0.5 | Rolling average |
| **Channel diversity** | No single channel > 60% of touches | Monthly audit |
| **Reciprocity balance** | > 60% of T1-T2 relationships "balanced" | Monthly audit |

### Weekly Compliance Report Format

```
══════════════════════════════════════
  WEEKLY CADENCE COMPLIANCE — W12 2026
══════════════════════════════════════

Coverage:
  T1: 5/5 touched 2x ✓ (100%)
  T2: 13/15 touched 1x ⚠ (87%)
  T3: 42/50 on track ✓ (84%)
  T4: 85/100 on track ✓ (85%)

Time spent: 7.5 hrs (budget: 8 hrs) ✓

Health Distribution:
  Fresh (>0.75): 45 contacts
  Warm (0.50-0.75): 62 contacts
  Cooling (0.25-0.50): 38 contacts ⚠
  Cold (<0.25): 12 contacts ⚠⚠
  Dormant (<0.10): 1,863 contacts

Alerts:
  - James Wu (T2) missed 2 consecutive weeks
  - Sarah Chen (T1) birthday in 3 days — reach out planned?
  - Build Club cohort (8 contacts) drifting to T4 — batch touch recommended

Actions for next week:
  - Prioritize 2 T2 misses from this week
  - Schedule T1 birthday touch
  - Run Build Club re-engagement batch
══════════════════════════════════════
```

---

## 12. Event-Driven Touch Opportunities

Events are the most efficient touch multiplier — a single event can reactivate 20-50 dormant ties simultaneously.

### Pre-Event Cadence

- **7 days before:** Identify attendee overlap with cadence queue
- **3 days before:** Prep talking points for priority contacts attending
- **1 day before:** Message T2+ contacts you'll see: "Looking forward to catching up"

### Post-Event Cadence

- **Within 24 hours:** Log all interactions from event
- **Within 48 hours:** Follow up with new T3+ contacts
- **Within 72 hours:** Follow up with all new contacts (Millington's 72-hour rule)
- **7 days after:** Deeper follow-up with highest-potential new contacts

### Event as Batch Touch

When Andrew attends or hosts an event, the cadence engine should:
1. Auto-identify which cadence touchpoints can be "completed" at the event
2. Suggest which overdue contacts to prioritize talking to at the event
3. Discount the daily budget for event days (in-person = high-value touches)

---

## 13. Safety & Privacy

- **No auto-send:** The system generates recommendations only. Andrew initiates all contact.
- **No data leakage:** Touch recommendations stay in Mycelio. No external API calls.
- **Snooze respected:** Snoozed contacts are excluded from cadence queue.
- **Overwhelm detection:** If a contact is detected as overwhelmed (via intelligence service), cadence is automatically slowed (decay modifier 0.6).
- **Andrew's availability:** The system should factor in Andrew's calendar/energy. Reduced daily budget on heavy days.

---

## Appendix A: Mapping to Strategic Playbook Frameworks

| Playbook Framework | How Cadence System Implements It |
|---|---|
| Dunbar's Layers (§VII) | Tier structure maps directly to Dunbar 5/15/50/150 |
| Robinett 5+50+100 (§VII) | Touch cadences derived from Robinett targets |
| Dormant Tie Theory (§III) | Reactivation protocol for contacts dropping below health 0.10 |
| Peak-End Rule (§III) | Touch suggestions emphasize quality of interaction, not just frequency |
| Orbit Model (§III) | Health score maps to orbit distance — contacts drift outward without touches |
| Structural Holes (§I) | Priority boost for bridge contacts (connecting disconnected clusters) |
| Ferrazzi Ping (§VII) | Light touches (content share, social engagement) = systematic pings |
| 72-Hour Rule (Community §3) | Post-event follow-up window enforced in cadence |

---

## Appendix B: Future Enhancements

1. **AI-generated touch suggestions:** Use LLM to draft personalized messages based on context, talking points, and milestones
2. **Calendar integration:** Factor in Andrew's actual availability, auto-suggest meeting slots
3. **Social media monitoring:** Auto-detect when contacts post milestones (promotions, launches) → trigger touch
4. **Dashboard widget:** Visual health heatmap on Mycelio dashboard showing network health at a glance
5. **Mobile notifications:** Push daily top-3 touches to phone
6. **Reciprocity-aware scheduling:** Alternate who initiates — don't always be the one reaching out
7. **Seasonal cadence adjustment:** Increase touch frequency around key seasons (end of year, conference season)
