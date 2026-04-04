#!/usr/bin/env npx tsx
/**
 * Seed person_relationships from transcript mining results.
 * Deduped across 7 transcripts, strongest evidence wins.
 */

const API = 'http://localhost:3001/api';

interface Rel {
  personA: string; // name
  personB: string; // name
  type: string;
  strength: number;
  notes: string;
}

// Deduplicated relationships from all 7 transcripts
// When same pair appears in multiple transcripts, highest strength + merged context wins
const relationships: Rel[] = [
  // === CORE BUILD CLUB INNER CIRCLE ===
  { personA: 'Andrew Suryanto', personB: 'Annie Liao', type: 'colleague', strength: 5, notes: 'Build Club predecessor/mentor. Trusted sounding board for career + NFP decisions. Advisory role on BC NFP board. Super-connector in community.' },
  { personA: 'Andrew Suryanto', personB: 'Trinidad Canales Calleja', type: 'partner', strength: 4, notes: 'BC NFP co-leader (one of big three). Runs women-centric BC events independently. Challenges Andrew constructively. Proven event runner.' },
  { personA: 'Andrew Suryanto', personB: 'Edouard D Hakim', type: 'colleague', strength: 4, notes: 'BC NFP co-leader (one of big three). Sales background — does talking to important people. Super active, always around Andrew.' },
  { personA: 'Andrew Suryanto', personB: 'Jordan Shen', type: 'friend', strength: 5, notes: 'Close friend from uni. BC co-leader, proposed NFP board member. Has Lawpath access, set up multiple ABNs/ACNs. See each other every 2-3 days. Helping with NFP legal/structure.' },
  { personA: 'Andrew Suryanto', personB: 'Jason Tan', type: 'colleague', strength: 4, notes: 'BC operations — code, media. Was in Araya accelerator Ch2. Working on Gastonomy. Helps with NFP structure, Lawpath, found $40K govt grants. Came up with BC train analogy.' },
  { personA: 'Andrew Suryanto', personB: 'Jeremy Yee', type: 'colleague', strength: 3, notes: 'Regular BC host. Helped with Lawpath/grants. Connected to Araya. Former Next Gen Ventures person.' },
  { personA: 'Andrew Suryanto', personB: 'Lily Lin', type: 'colleague', strength: 2, notes: 'BC volunteer, not yet deployed to events.' },
  { personA: 'Andrew Suryanto', personB: 'Ivara Huang', type: 'colleague', strength: 2, notes: 'BC volunteer, not yet deployed to events.' },

  // === INNER CIRCLE CROSS-RELATIONSHIPS ===
  { personA: 'Jordan Shen', personB: 'Jason Tan', type: 'friend', strength: 4, notes: 'Good friends. Had car conversation about crypto that inspired Jordan\'s new product direction. Spend time together socially outside BC.' },
  { personA: 'Jordan Shen', personB: 'Trinidad Canales Calleja', type: 'colleague', strength: 2, notes: 'Both on proposed BC NFP board. Jordan says "I think so" when asked if he\'s met Trini.' },
  { personA: 'Jordan Shen', personB: 'Annie Liao', type: 'colleague', strength: 2, notes: 'Both in BC circle. Jordan knows Annie through Andrew.' },
  { personA: 'Edouard D Hakim', personB: 'Trinidad Canales Calleja', type: 'colleague', strength: 3, notes: 'Both BC NFP big three. Trini has seen Edward at BC events. Will coordinate closely in NFP structure.' },
  { personA: 'Trinidad Canales Calleja', personB: 'Annie Liao', type: 'friend', strength: 3, notes: 'Annie introduced Trini to Vivian and Lana at BC event. Active social connector relationship.' },

  // === RELEVANCE AI CO-FOUNDERS ===
  { personA: 'Andrew Suryanto', personB: 'Jacky Koh', type: 'colleague', strength: 4, notes: 'Relevance AI co-founder. Andrew respects him as leader. Jacky pushes community events, has 20+ direct reports. Andrew cares what founders think of him.' },
  { personA: 'Andrew Suryanto', personB: 'Daniel Vassilev', type: 'colleague', strength: 2, notes: 'Relevance AI co-founder/co-CEO, based in SF. Drives enterprise/unicorn strategy. Andrew is critical of this direction. Minimal direct interaction.' },
  { personA: 'Andrew Suryanto', personB: 'Daniel Palmer', type: 'colleague', strength: 2, notes: 'Relevance AI co-founder. Chris from H2O met Daniel previously.' },
  { personA: 'Jacky Koh', personB: 'Daniel Vassilev', type: 'co-founder', strength: 5, notes: 'Co-founders/co-CEOs of Relevance AI. Both engineers by trade. Jacky handles AU, Dan drives sales from SF.' },

  // === RELEVANCE AI TEAM ===
  { personA: 'Andrew Suryanto', personB: 'Pea Lord-Doyle', type: 'colleague', strength: 4, notes: 'Andrew\'s direct boss (Head of People/HR). One of the few people whose opinion Andrew truly cares about.' },

  // === COMMUNITY CONNECTORS ===
  { personA: 'Annie Liao', personB: 'Vivian Fu', type: 'friend', strength: 3, notes: 'Annie introduced Vivian to Trini at BC event. Annie functions as community super-connector.' },
  { personA: 'Trinidad Canales Calleja', personB: 'Vivian Fu', type: 'friend', strength: 3, notes: 'Now close friends after Annie\'s introduction at BC event.' },
  { personA: 'Trinidad Canales Calleja', personB: 'Freesia Gaul', type: 'colleague', strength: 2, notes: 'Trini knows Freesia from ACS community. Pushed Andrew to learn from Freesia\'s NFP experience.' },

  // === ECOSYSTEM PARTNERS ===
  { personA: 'Andrew Suryanto', personB: 'Jerry X\'Lingson', type: 'partner', strength: 3, notes: 'Next Gen Ventures co-founder. Andrew has known Jerry before. Co-organizes Founders Hack where Andrew mentors.' },
  { personA: 'Andrew Suryanto', personB: 'Caitlin Evans', type: 'partner', strength: 2, notes: 'Programs & Community at AirTree/Folklore. New connection — enthusiastic about BC collaboration. "You found the right person." Venue rotation, student programs.' },
  { personA: 'Andrew Suryanto', personB: 'Chris Fong', type: 'colleague', strength: 2, notes: 'Founder of Zugler (ex-Google network). Met at Relevance event. Exchanged WhatsApp. Singapore/US based.' },
  { personA: 'Andrew Suryanto', personB: 'Sree', type: 'colleague', strength: 2, notes: '15yr fitness veteran, new to coding (Claude Code for 3 days). Andrew excited to bring him into BC.' },
  { personA: 'Andrew Suryanto', personB: 'Ishita Gupta', type: 'colleague', strength: 3, notes: 'Co-founder Steady Self. Former Andrew subcontractor. Used to be around BC a lot.' },
  { personA: 'Ishita Gupta', personB: 'Kailash Sarma', type: 'co-founder', strength: 5, notes: 'Co-founders of Steady Self. Ishita developed the entire app herself.' },
  { personA: 'Andrew Suryanto', personB: 'Ethan Lee', type: 'colleague', strength: 3, notes: 'Product manager, key BC host/volunteer. "Important one of those twenty." Brings board games for games nights.' },
  { personA: 'Andrew Suryanto', personB: 'Cindy Liang', type: 'friend', strength: 3, notes: 'BC ally — runs her own thing but close enough to be considered BC. Mentioned as host who regularly turns up.' },
  { personA: 'Andrew Suryanto', personB: 'Proffy', type: 'friend', strength: 2, notes: 'Andrew offered him a ride from BC event. Casual friendly relationship.' },
  { personA: 'Andrew Suryanto', personB: 'Orshi', type: 'colleague', strength: 1, notes: 'New Araya resident. Building social commerce platform. Met at BC demo night.' },
  { personA: 'Andrew Suryanto', personB: 'Freesia Gaul', type: 'colleague', strength: 1, notes: 'Runs ACS community (Hardware Meetup). Exchanged LinkedIn at BC event. Potential NFP governance knowledge source.' },
  { personA: 'Andrew Suryanto', personB: 'Barb Swanson', type: 'colleague', strength: 2, notes: 'Business transformation coach, AI food coach. Eager BC volunteer with deep corporate change management expertise.' },
  { personA: 'Andrew Suryanto', personB: 'Varun Agarwal', type: 'colleague', strength: 2, notes: 'OpenAI team, demoed GPT voice API at Relevance event. Singapore-based. Partnership contact.' },
  { personA: 'Andrew Suryanto', personB: 'Taras Rymar', type: 'colleague', strength: 2, notes: 'Relevance AI colleague. Leads "matcha club" at office. Social/cultural figure.' },

  // === STARTUP FOUNDERS (from events) ===
  { personA: 'Andrew Suryanto', personB: 'Simon Kubica', type: 'colleague', strength: 2, notes: 'Co-founder Alloy (cloud playground). Ex-Atlassian PM, YC S23, raised from Blackbird + Bain Capital. Speaker at NextGen event.' },
  { personA: 'Andrew Suryanto', personB: 'Felix', type: 'colleague', strength: 2, notes: 'Swiss founder building Farley (driving license learning app). Demos at BC coworking.' },
  { personA: 'Andrew Suryanto', personB: 'Kyle Lankowicz', type: 'colleague', strength: 2, notes: 'Building Nina AI customer service employee. From Taiwan. Strong demo at BC, 1-2 weeks from launch.' },

  // === Galen + Annie (Build Club startup entity) ===
  { personA: 'Annie Liao', personB: 'Jerry X\'Lingson', type: 'colleague', strength: 2, notes: 'Both in the broader Sydney/SF startup ecosystem. Annie was involved with BC startup entity.' },
];

async function resolvePersonId(name: string): Promise<string | null> {
  const resp = await fetch(`${API}/people?q=${encodeURIComponent(name)}&limit=5&includeArchived=true`);
  const json = await resp.json() as { data: Array<{ id: string; name: string }> };
  // Exact match first
  const exact = json.data.find(p => p.name.toLowerCase() === name.toLowerCase());
  if (exact) return exact.id;
  // Partial match
  if (json.data.length > 0) return json.data[0].id;
  return null;
}

async function createRelationship(rel: Rel) {
  const [aId, bId] = await Promise.all([
    resolvePersonId(rel.personA),
    resolvePersonId(rel.personB),
  ]);

  if (!aId) { console.log(`  ✗ Could not find: ${rel.personA}`); return false; }
  if (!bId) { console.log(`  ✗ Could not find: ${rel.personB}`); return false; }
  if (aId === bId) { console.log(`  ✗ Same person: ${rel.personA} = ${rel.personB}`); return false; }

  const resp = await fetch(`${API}/person-relationships`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      personAId: aId,
      personBId: bId,
      type: rel.type,
      strength: rel.strength,
      notes: rel.notes,
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    console.log(`  ✗ API error for ${rel.personA} → ${rel.personB}: ${err}`);
    return false;
  }
  return true;
}

async function main() {
  console.log(`=== Seeding ${relationships.length} relationships ===\n`);

  let created = 0;
  let failed = 0;

  for (const rel of relationships) {
    const ok = await createRelationship(rel);
    if (ok) {
      created++;
      console.log(`  ✓ ${rel.personA} ↔ ${rel.personB} (${rel.type}, ${rel.strength}/5)`);
    } else {
      failed++;
    }
  }

  console.log(`\n=== Done: ${created} created, ${failed} failed ===`);
}

main().catch(console.error);
