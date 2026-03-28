# Mycelio Contact Tag Taxonomy

**Created:** 2026-03-27
**Status:** Active — canonical reference for all contact tagging

## Conventions

- **Format:** `lowercase-hyphenated` (e.g., `ai-safety`, `build-club`)
- **Brand names:** Use the brand's canonical form, hyphenated (e.g., `safetyculture`, not `safety-culture` — exception: brand IS one word)
- **Singulars:** Always singular unless the concept is inherently plural (e.g., `hackathon` not `hackathons`)
- **Role vs Domain:** Use role tags for what someone *does*, domain tags for their *field*
- **Ex-company:** Use `ex-{company}` prefix, not `{company}-alumni` or slang (e.g., `ex-google` not `xoogler`)
- **Org affiliation:** Use tags for quick queryability; full org membership goes in `organizationIds`
- **Avoid:** Overly generic tags (`senior`, `startups`), tags that duplicate tier/stage data (`inner-circle` when tier=1)

---

## Tag Categories

### 1. ROLE — What someone does

| Canonical Tag | Description | Merges/Replaces |
|---|---|---|
| `founder` | Founder, co-founder, startup founder | `co-founder`, `startup-founder`, `solo-founder`, `founder-operator` |
| `serial-founder` | Multiple ventures | `serial-entrepreneur`, `serial-founder` |
| `exited-founder` | Had a successful exit | — |
| `ceo` | CEO / Managing Director | — |
| `cto` | CTO / Technical Co-founder | — |
| `caio` | Chief AI Officer | — |
| `cdao` | Chief Data/Analytics Officer | `cdaio` |
| `investor` | Active investor (any type) | — |
| `angel-investor` | Angel investor specifically | `angel` |
| `vc` | Venture capitalist / GP / Partner | — |
| `venture-partner` | VC venture partner | — |
| `professor` | Academic professor | — |
| `academic` | Academic (non-professor) | — |
| `researcher` | Research role | — |
| `engineer` | Software/hardware engineer | `software-engineer`, `developer` |
| `ml-engineer` | ML/AI engineer | `ai-engineer` |
| `data-scientist` | Data scientist | — |
| `designer` | UX/product designer | — |
| `product-manager` | Product manager | — |
| `journalist` | Journalist / tech press writer | — |
| `speaker` | Public speaker | `public-speaker`, `public-speaking` |
| `podcast-host` | Hosts a podcast | `podcast` (when person hosts) |
| `mentor` | Active mentor | `mentorship` |
| `community-builder` | Builds/runs communities | `community-leader`, `community-host` |
| `meetup-organizer` | Runs meetups | — |
| `recruiter` | Recruiter / talent | — |
| `operator` | Operational/executive role | — |
| `consultant` | Consulting role | `consulting` |
| `board` | Board member / advisor | — |
| `sales-leader` | Sales leadership | `sales` (when role, not domain) |

### 2. DOMAIN — Field or industry

| Canonical Tag | Description | Merges/Replaces |
|---|---|---|
| `ai` | Artificial intelligence (broad) | — |
| `agentic-ai` | Agentic AI specifically | — |
| `ai-safety` | AI safety / alignment | — |
| `ai-governance` | AI governance / policy | `ai-policy`, `ai-ethics` |
| `ai-infrastructure` | AI infra (compute, MLOps) | `llmops`, `mlops` |
| `generative-ai` | GenAI | `genai` |
| `machine-learning` | ML broadly | — |
| `computer-vision` | CV | — |
| `nlp` | NLP (add if needed) | — |
| `deep-tech` | Deep tech / hard tech | — |
| `fintech` | Financial technology | — |
| `healthcare` | Healthcare / health tech | `health-tech`, `health-ai` |
| `edtech` | Education technology | — |
| `proptech` | Property technology | — |
| `legaltech` | Legal technology | — |
| `food-tech` | Food technology | `foodtech` |
| `climate-tech` | Climate / clean tech | — |
| `cybersecurity` | Cybersecurity | — |
| `quantum` | Quantum computing | `quantum-computing`, `quantum-physics` |
| `robotics` | Robotics | — |
| `hardware` | Hardware / electronics | — |
| `voice-tech` | Voice technology | — |
| `vr` | VR / AR / haptics | `haptics` |
| `data` | Data domain (broad) | — |
| `data-analytics` | Data analytics | `analytics`, `data-science` (when domain not role), `digital-analytics` |
| `saas` | SaaS | — |
| `enterprise-ai` | Enterprise AI | — |
| `open-source` | Open source | — |
| `energy` | Energy sector | — |
| `mining` | Mining sector | — |
| `insurance` | Insurance | — |
| `banking` | Banking / finance | `finance` |
| `defence` | Defence / military | — |
| `logistics` | Logistics / supply chain | — |
| `retail` | Retail | — |
| `government` | Government / public sector | — |
| `policy` | Policy / regulation | — |
| `nfp` | Not-for-profit | `nonprofit`, `nfp-structure` |
| `social-impact` | Social impact | — |
| `corporate` | Corporate / enterprise context | — |
| `infrastructure` | Infrastructure (tech or physical) | — |

### 3. ORGANIZATION — Affiliation markers

Use for quick queries. Full membership tracked via `organizationIds`.

| Pattern | Examples | Notes |
|---|---|---|
| `{company}` | `atlassian`, `canva`, `qantas`, `anthropic` | Current affiliation |
| `ex-{company}` | `ex-google`, `ex-microsoft`, `ex-atlassian` | Former affiliation. **Not** `{company}-alumni` or slang |
| `{vc-firm}` | `blackbird`, `airtree`, `square-peg`, `main-sequence` | VC firm affiliation |
| `{vc-firm}-portfolio` | `blackbird-portfolio`, `airtree-portfolio` | Portfolio company founder |
| `{program}` | `startmate`, `yc`, `antler`, `techstars` | Accelerator/program alumni |
| `{community}` | `build-club`, `fishburners`, `stone-and-chalk` | Community membership |
| `{university}` | `unsw`, `usyd`, `uts`, `mit`, `cambridge` | University affiliation |

**Merges:**
- `google-alumni` → `ex-google`
- `xoogler` → `ex-google`
- `microsoft-alumni` → `ex-microsoft`
- `meta-alumni` → `ex-meta`
- `stone-chalk` → `stone-and-chalk`
- `yc-alum` → `yc` (use notes for batch: S23, W25)
- `yc-s23` → `yc` + notes
- `yc-w25` → `yc` + notes
- `steadyself` ← `steady-self` (brand is SteadySelf → `steadyself`)
- `safetyculture` ← `safety-culture` (brand is SafetyCulture)

### 4. BUILD CLUB — Internal community tags

| Canonical Tag | Description | Keep? |
|---|---|---|
| `build-club` | Member / attendee | YES — primary tag |
| `build-club-cofounder` | Co-founder of Build Club | YES |
| `build-club-mentor` | Mentor at Build Club | YES |
| `build-club-pipeline` | In recruitment pipeline | YES |
| `build-club-prospect` | Prospective member | MERGE → `build-club-pipeline` |
| `build-club-advisor` | Advisor | YES |
| `build-club-advocate` | Advocate / champion | MERGE → `build-club` + note |
| `build-club-sydney` | Sydney chapter | REMOVE — redundant (Build Club IS Sydney) |

### 5. NETWORK — Relationship intelligence tags

| Canonical Tag | Description | Notes |
|---|---|---|
| `investor-network` | Part of investor/VC network | Keep — useful for bulk queries |
| `wildcard` | High-potential contact | Keep |
| `top-10-wildcard` | Top 10 wildcard priority | Keep |
| `ecosystem-connector` | Well-connected bridge node | Keep |
| `connector` | Same as ecosystem-connector | MERGE → `ecosystem-connector` |
| `inner-circle` | Inner circle member | REMOVE — duplicates tier=1 |

### 6. EVENT — Event-specific tags

| Canonical Tag | Description |
|---|---|
| `sip-and-scale` | Sip & Scale attendee |
| `founders-hack` | Founders Hack attendee |
| `ai-salon` | AI Salon attendee |
| `ai-tinkerers` | AI Tinkerers attendee |
| `nextgen` | NextGen Ventures affiliated |
| `side-stage` | Side Stage event |

### 7. LOCATION — Geographic tags

| Canonical Tag | Description |
|---|---|
| `sydney` | Sydney-based |
| `melbourne` | Melbourne-based |
| `adelaide` | Adelaide-based |
| `brisbane` | Brisbane-based |
| `singapore` | Singapore-based |
| `us-based` | US-based |
| `apac` | APAC region |
| `global` | Global presence |

**Merge:** `brisbane-origin` → `brisbane`

### 8. RECOGNITION — Awards, achievements, credentials

| Canonical Tag | Description |
|---|---|
| `forbes-30u30` | Forbes 30 Under 30 |
| `forbes-tech-council` | Forbes Tech Council |
| `phd` | Has PhD |
| `tedx` | TEDx speaker |
| `sxsw-winner` | SxSW award winner |
| `unicorn` | Founded/led a unicorn |
| `legendary-exit` | Notable exit |

---

## Fixes Applied (2026-03-27)

### Duplicate Merges
| From | To | Affected People |
|---|---|---|
| `foodtech` | `food-tech` | Jason L |
| `stone-chalk` | `stone-and-chalk` | Jacqui Duncan, Anthony Eisen |
| `steady-self` | `steadyself` | Proffy |
| `safety-culture` | `safetyculture` | Luke Anear |
| `angel` | `angel-investor` | Les Szekely |
| `public-speaker` | `speaker` | Tim Griffiths |
| `public-speaking` | `speaker` | Kailash Sarma |
| `hackathons` | `hackathon` | Annie Liao |
| `google-alumni` | `ex-google` | Stephen Ma |
| `xoogler` | `ex-google` | Stephen Ma |
| `microsoft-alumni` | `ex-microsoft` | Joel Pobar |
| `nonprofit` | `nfp` | Paul Conyngham |
| `partnership` | `partnerships` | Varun Agarwal |
| `build-club-prospect` | `build-club-pipeline` | (if any) |
| `connector` | `ecosystem-connector` | (if any) |

### Removals
| Tag | Reason | Affected People |
|---|---|---|
| `inner-circle` | Duplicates tier=1 | (7 people) |
| `build-club-sydney` | Redundant — Build Club IS Sydney | (7 people) |

---

## Flagged for Andrew

These require human judgment:

1. **`investor-network` (52 people)** — Very widely used. Is this still a useful segmentation or should it be replaced by org tags + `investor` role?
2. **`cdaio` vs `cdao`** — Are these distinct roles in your network or the same thing?
3. **Company-as-tag pattern** — 50+ company names used as tags (e.g., `atlassian`, `canva`). These work for quick queries but could be org memberships. Keep both or migrate?
4. **`yc-s23` / `yc-w25`** — Batch info is useful. Merge to `yc` + notes, or keep batch-specific tags for querying?
5. **`senior` (2 people)** — Too vague to be useful. Remove or replace with specific role?
6. **`podcast` vs `podcast-host`** — Simon Thomsen has `podcast` (he runs Startup Daily). Should this be `podcast-host`?
7. **`thought-leader` (3 people)** — Subjective. Keep or remove?
8. **Event tags on people** — Tags like `sip-and-scale`, `founders-hack` mark event attendance. Should this be tracked via event attendance records instead?
