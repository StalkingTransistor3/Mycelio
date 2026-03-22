# Mycelio — Connection Rules

Connections are relationships between two people in the network. They are never assumed — every connection must be created through an explicit, evidenced action. The network graph should reflect reality, not guesses.

---

## Architecture: Who Does What

**Mycelio is the data store, not the brain.**

| Responsibility | Owner | How |
|---------------|-------|-----|
| Store connections, scores, evidence | **Mycelio API** | CRUD endpoints, schema enforcement |
| Judge connection strength + assign scores | **Agents** (Kira, probes, etc.) | Agent reads this doc + all available context, then writes score + reasoning to Mycelio |
| Apply time-based decay | **Decay script** (cron) | Mechanical math — no judgment, just half-life calculations on `lastEvidenceAt` |
| Self-document the data model | **Mycelio API** | API responses include schema descriptions; this doc is served at `/docs/connection-rules` |

**Why agents score, not Mycelio:** Agents have richer context than any formula. They were in the conversation, they read the room, they know Andrew mentioned someone warmly vs. dismissively. A composite formula can approximate tie strength, but an agent that just processed "Andrew and X had a 2-hour deep conversation about faith and career" can assess that far better than `frequency × 0.25 + recency × 0.20`.

**The scoring dimensions below are guidelines for agents**, not a hardcoded formula. Agents should consider all of them when assigning a score, but use judgment — not mechanical arithmetic.

---

## Connection Strength Tiers

| Tier | Label | Score | Description | Examples |
|------|-------|-------|-------------|----------|
| 5 | **Bonded** | 90-100 | Life-level ties. Unbreakable unless something catastrophic happens. | Family, partners, co-founders, best friends, mentors with deep history |
| 4 | **Close** | 70-89 | Regular, meaningful contact. Would go out of their way for each other. | Close work collaborators, good friends, trusted advisors, accountability partners |
| 3 | **Established** | 40-69 | Have a real relationship. Can call on each other. Know each other's context. | Colleagues who work together, recurring event contacts with 1:1 history, warm professional relationships |
| 2 | **Familiar** | 15-39 | Have met. Can place each other. Could reach out without it being cold. | Met at an event and had a real conversation, introduced by a mutual contact, worked on a one-off project together |
| 1 | **Ambient** | 1-14 | Aware of each other's existence. No direct meaningful interaction yet. | Someone mentioned them at an event, follow each other on socials, attended the same event but didn't talk, name-dropped in conversation |

---

## Scoring Dimensions (Agent Guidelines)

When assigning or updating a connection score, agents should consider these dimensions. They are grounded in peer-reviewed relationship science and ranked by predictive power.

### 1. Multiplexity (most important)

**What:** How many distinct social contexts the pair shares.
**Why:** Marsden & Campbell (2012) found this is the single best behavioral predictor of tie strength — better than contact frequency. Someone you only interact with at work is weaker than someone you see at work + events + personal catch-ups, even if the work contact is daily.

Context categories:
- `professional` — work meetings, business calls/emails
- `social` — casual hangouts, dinners, drinks
- `event` — co-attendance at events with confirmed interaction
- `community` — shared community/org participation (Build Club, church, etc.)
- `personal` — direct messages, personal catch-ups, favors
- `digital` — social media engagement, online collaboration

**Agent heuristic:** 1 context = weak. 2-3 = moderate. 4+ = strong signal.

### 2. Contact Frequency

**What:** How often the pair interacts.
**Why:** Granovetter (1973), Dunbar (2010), Roberts & Dunbar (2011) — frequency predicts Dunbar layer placement with ~80% accuracy.
**Caveat:** High frequency in one context (daily coworker) doesn't automatically mean strong. Weight frequency more when it spans multiple contexts.

### 3. Recency

**What:** How recently they last interacted.
**Why:** A relationship with 100 past interactions but nothing in 6 months is different from 10 interactions with one yesterday.

### 4. Reciprocity

**What:** Balance of who initiates contact.
**Why:** Granovetter's "reciprocal services" dimension. Balanced initiation = stronger tie. One-sided = weaker or parasocial.

### 5. Relationship Age

**What:** How long they've known each other.
**Why:** Dunbar (2018) — longer relationships are more resilient. Levin et al. (2011) — dormant strong ties retain "stored value" that can be reactivated.

### 6. Interaction Quality

**What:** Depth and sentiment of interactions. A 2-hour deep conversation about life > a "hey" at a networking event.
**Why:** Proxy for Granovetter's "emotional intensity" and "intimacy" (mutual confiding) dimensions.

### 7. Structural Embeddedness

**What:** How many mutual connections they share.
**Why:** Simmelian ties (Krackhardt 1999) — relationships embedded in triangles (A-B-C all know each other) are stronger and more durable than isolated dyads.

---

## Dunbar Layer Alignment

The tiers map to Dunbar's social brain layers, validated across 23 studies and 61M+ people (Zhou et al. 2005). The ~3x scaling ratio between layers is consistent across cultures.

| Score | Tier | Dunbar Layer | Size | Contact Cadence | Criterion |
|-------|------|-------------|------|----------------|-----------|
| 90-100 | 5 (Bonded) | Support clique | ~5 | Multiple/week | Would drop everything in a crisis |
| 70-89 | 4 (Close) | Sympathy group | ~15 | Weekly | Their loss would be devastating |
| 40-69 | 3 (Established) | Close group | ~50 | Monthly | Would invite to dinner unprompted |
| 15-39 | 2 (Familiar) | Active network | ~150 | Quarterly | Could join for a drink uninvited |
| 1-14 | 1 (Ambient) | Acquaintances | ~500 | Annually | Name to face, know something about them |

---

## What Creates a Connection

A connection is created the FIRST time evidence of awareness or contact between two people is logged. The source determines the initial strength.

| Action | Initial Tier | Source Type | Notes |
|--------|-------------|-------------|-------|
| Andrew or agent manually adds it | Any (specifier decides) | `manual` | Agent includes reasoning in `evidence` |
| Two people attend the same event | Does NOT auto-create | — | Copresence alone means nothing |
| Event + interaction logged between them | 2 (Familiar) | `event_interaction` | They actually talked |
| Introduction logged (A introduces B to C) | 2 (Familiar) | `introduction` | The introducer is evidence |
| Someone mentions another person | 1 (Ambient) | `mention` | One-directional awareness |
| They follow each other on socials | 1 (Ambient) | `social_follow` | Weak signal, but real |
| Confirmed working together (not just same company) | 2-3 | `manual` | Same company ≠ know each other |

---

## What Strengthens a Connection

Agents reassess the score when logging new interactions. The agent considers all dimensions above and the full interaction history, then writes the updated score with reasoning.

High-signal actions for agents to weight heavily:
- **1:1 meeting** — strongest single-interaction signal
- **Collaboration on a project** — sustained joint effort across time
- **Introduction made between them** — social capital exchange, creates triadic closure
- **Multi-context interaction** — seeing someone in a new context (first time meeting a coworker socially) is a bigger signal than another interaction in the same context

---

## Decay Script (Cron)

A script runs periodically (e.g., daily) and applies mechanical decay. No intelligence needed — just math.

| Tier | Decay Behavior | Rationale |
|------|---------------|-----------|
| 5 (Bonded) | No decay. Score locked unless agent/Andrew changes it. | Support clique survives long gaps (Levin et al. 2011) |
| 4 (Close) | Recency half-life: 90 days | Sympathy group needs quarterly reinforcement |
| 3 (Established) | Recency half-life: 45 days | Close group needs monthly-ish contact |
| 2 (Familiar) | Recency half-life: 30 days | Active network fades fast without touchpoints |
| 1 (Ambient) | No decay. Auto-archive after 6 months of zero interaction. | Already at floor |

Decay reduces the score but never below Tier 1. Only manual action deletes a connection.

When a decayed connection crosses a tier boundary downward, the script logs it so agents can flag it to Andrew as "relationship cooling" if relevant.

---

## Connection Metadata

Every connection stores:

| Field | Purpose |
|-------|---------|
| `source` | How created: `manual`, `event_interaction`, `introduction`, `mention`, `social_follow` |
| `strength` | Current tier label: `bonded`, `close`, `established`, `familiar`, `ambient` |
| `score` | 0-100, set by agent judgment (not a formula output) |
| `scoreReasoning` | Agent's explanation for the current score — why this number |
| `type` | Relationship type(s): `professional`, `personal`, `family`, `community`, `mentorship` |
| `context` | Free text — how/why they know each other |
| `howMet` | Free text — the origin story |
| `evidence` | JSONB array: `[{ action, date, detail, source, agent }]` |
| `multiplexityContexts` | JSONB array of observed context types: `["professional", "social", "event"]` |
| `lastEvidenceAt` | Timestamp of most recent evidence (used by decay script) |
| `lastScoredAt` | When an agent last evaluated the score |
| `lastScoredBy` | Which agent last scored it (e.g., `kira`, `probe-able`, `andrew-manual`) |
| `connectedAt` | When the connection was first established |

---

## Rules — Hard Constraints

1. **No assumed connections.** Same company, same event attendance, same tags — none of these create connections automatically.
2. **Every connection needs evidence.** The `source` and `evidence` fields must be populated.
3. **Andrew can override anything.** Manual adjustments always win.
4. **Connections are bidirectional by default** but can be asymmetric (A knows B, B doesn't know A) — use `ambient` for one-directional awareness.
5. **The graph should be sparse.** A sparse, accurate graph is infinitely more valuable than a dense, fictional one.
6. **Decay is a feature.** Relationships that aren't maintained should visibly weaken. This creates urgency to cultivate them.
7. **Multiplexity > frequency.** Agents should weight context diversity above raw interaction count.
8. **Agents score, Mycelio stores.** Mycelio never computes scores. Agents read the data, consider the dimensions, and write their judgment. The decay script is the only automated score modifier.
9. **Show your work.** Agents must populate `scoreReasoning` when setting or changing a score. No unexplained numbers.

---

## References

- Granovetter, M.S. (1973). "The Strength of Weak Ties." *American Journal of Sociology*, 78(6).
- Dunbar, R.I.M. (2010). *How Many Friends Does One Person Need?*
- Marsden, P.V. & Campbell, K.E. (2012). "Reflections on Conceptualizing and Measuring Tie Strength." *Social Forces*, 91(1).
- Berscheid, E., Snyder, M. & Omoto, A.M. (1989). "The Relationship Closeness Inventory." *JPSP*, 57(5).
- Roberts, S.G.B. & Dunbar, R.I.M. (2011). "Communication in social networks." *Evolution and Human Behavior*, 32(6).
- Levin, D.Z., Walter, J. & Murnighan, J.K. (2011). "Dormant Ties." *Organization Science*, 22(4).
- Krackhardt, D. (1999). "The Ties That Torture: Simmelian Tie Analysis." *Research in the Sociology of Organizations*, 16.
- Sutcliffe, A., Dunbar, R., Binder, J. & Arrow, H. (2012). "Relationships and the social brain." *British Journal of Psychology*, 103(2).
- Zhou, W.-X. et al. (2005). "Discrete hierarchical organization of social group sizes." *Proc. R. Soc. B*, 272.
