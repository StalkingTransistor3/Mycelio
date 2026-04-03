#!/usr/bin/env npx tsx
/**
 * Archive orphaned organizations and contacts in Mycelio.
 *
 * Orphaned org: no person references it via organizationId or organizationIds
 * Orphaned contact: T3+ with zero interactions AND zero connections
 */

const API = 'http://localhost:3001/api';

async function fetchAll<T>(path: string): Promise<T[]> {
  const resp = await fetch(`${API}${path}`);
  const json = await resp.json() as { data: T[] };
  return json.data;
}

async function archiveOrg(id: string): Promise<void> {
  await fetch(`${API}/organizations/${id}/archive`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ archived: true }),
  });
}

async function archivePerson(id: string): Promise<void> {
  await fetch(`${API}/people/${id}/archive`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ archived: true }),
  });
}

interface Org {
  id: string;
  name: string;
  archived: boolean;
}

interface Person {
  id: string;
  name: string;
  tier: number;
  organizationId: string | null;
  organizationIds: string[];
  archived: boolean;
}

interface Interaction {
  id: string;
  personId: string;
  personIds: string[];
}

interface Connection {
  id: string;
  fromPersonId: string;
  toPersonId: string;
}

async function main() {
  console.log('=== Mycelio Orphan Archiver ===\n');

  // Fetch all data (include archived to get full picture)
  const [orgs, allPeople, allInteractions, allConnections] = await Promise.all([
    fetchAll<Org>('/organizations?includeArchived=true&limit=1000'),
    fetchAll<Person>('/people?includeArchived=true&limit=5000'),
    fetchAll<Interaction>('/interactions?limit=50000'),
    fetchAll<Connection>('/graph'),
  ]);

  // --- Phase 1: Archive orphaned orgs ---
  console.log(`Total orgs: ${orgs.length}`);

  // Build set of org IDs referenced by people
  const referencedOrgIds = new Set<string>();
  for (const p of allPeople) {
    if (p.organizationId) referencedOrgIds.add(p.organizationId);
    for (const oid of (p.organizationIds || [])) {
      referencedOrgIds.add(oid);
    }
  }

  const orphanedOrgs = orgs.filter(o => !o.archived && !referencedOrgIds.has(o.id));
  console.log(`Orphaned orgs (no people linked): ${orphanedOrgs.length}`);

  let orgArchived = 0;
  for (const org of orphanedOrgs) {
    await archiveOrg(org.id);
    orgArchived++;
    if (orgArchived % 50 === 0) console.log(`  ...archived ${orgArchived}/${orphanedOrgs.length} orgs`);
  }
  console.log(`✓ Archived ${orgArchived} orphaned orgs\n`);

  // --- Phase 2: Archive orphaned contacts ---
  console.log(`Total people: ${allPeople.length}`);

  // Build sets of people who have interactions or connections
  const hasInteraction = new Set<string>();
  for (const i of allInteractions) {
    hasInteraction.add(i.personId);
    for (const pid of (i.personIds || [])) {
      hasInteraction.add(pid);
    }
  }

  // Graph endpoint returns { nodes, edges, groups } — we need edges
  const graphResp = await fetch(`${API}/graph?limit=50000`);
  const graphData = await graphResp.json() as { data: { edges: Array<{ source: string; target: string }> } };
  const edges = graphData.data?.edges || [];

  const hasConnection = new Set<string>();
  for (const e of edges) {
    hasConnection.add(e.source);
    hasConnection.add(e.target);
  }

  // Orphaned contact: T3+ (tier >= 3), not archived, no interactions, no connections
  const orphanedPeople = allPeople.filter(p =>
    !p.archived &&
    p.tier >= 3 &&
    !hasInteraction.has(p.id) &&
    !hasConnection.has(p.id)
  );

  console.log(`Orphaned contacts (T3+ with no interactions/connections): ${orphanedPeople.length}`);
  console.log(`  Tier breakdown: T3=${orphanedPeople.filter(p => p.tier === 3).length}, T4=${orphanedPeople.filter(p => p.tier === 4).length}, T5=${orphanedPeople.filter(p => p.tier === 5).length}`);

  let peopleArchived = 0;
  for (const p of orphanedPeople) {
    await archivePerson(p.id);
    peopleArchived++;
    if (peopleArchived % 100 === 0) console.log(`  ...archived ${peopleArchived}/${orphanedPeople.length} contacts`);
  }
  console.log(`✓ Archived ${peopleArchived} orphaned contacts\n`);

  // --- Summary ---
  const remainingPeople = allPeople.length - peopleArchived;
  const remainingOrgs = orgs.length - orgArchived;
  console.log('=== Summary ===');
  console.log(`Orgs: ${orgs.length} → ${remainingOrgs} active (${orgArchived} archived)`);
  console.log(`People: ${allPeople.length} → ${remainingPeople} active (${peopleArchived} archived)`);
  console.log('\nDone. Use ?includeArchived=true to see archived records.');
}

main().catch(console.error);
