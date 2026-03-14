import { db, schema } from '../db/index.js';
import { eq, sql } from 'drizzle-orm';
import type { PersonInfluence, MicroCommunity } from '@mycelio/shared';

const { connections, people, events } = schema;

/**
 * Compute influence metrics for all people in the network.
 * Uses degree centrality, betweenness centrality, and cluster coefficient.
 */
export async function computeInfluenceScores(): Promise<PersonInfluence[]> {
  const allPeople = await db.select({ id: people.id, name: people.name }).from(people);
  const allConnections = await db.select().from(connections);

  // Build adjacency list
  const adj = new Map<string, Set<string>>();
  for (const p of allPeople) adj.set(p.id, new Set());
  for (const c of allConnections) {
    adj.get(c.fromPersonId)?.add(c.toPersonId);
    adj.get(c.toPersonId)?.add(c.fromPersonId);
  }

  const totalNodes = allPeople.length;
  if (totalNodes < 2) return [];

  // 1. Degree centrality
  const degreeCentrality = new Map<string, number>();
  for (const [id, neighbors] of adj) {
    degreeCentrality.set(id, neighbors.size / (totalNodes - 1));
  }

  // 2. Betweenness centrality (approximate using BFS from each node)
  const betweenness = new Map<string, number>();
  for (const p of allPeople) betweenness.set(p.id, 0);

  // Sample nodes for betweenness (cap at 100 for performance)
  const sampleNodes = allPeople.length <= 100
    ? allPeople
    : allPeople.sort(() => Math.random() - 0.5).slice(0, 100);

  for (const source of sampleNodes) {
    // BFS from source
    const dist = new Map<string, number>();
    const sigma = new Map<string, number>(); // number of shortest paths
    const pred = new Map<string, string[]>();
    const stack: string[] = [];
    const queue: string[] = [source.id];

    dist.set(source.id, 0);
    sigma.set(source.id, 1);

    while (queue.length > 0) {
      const v = queue.shift()!;
      stack.push(v);
      const d = dist.get(v)!;

      for (const w of adj.get(v) || []) {
        if (!dist.has(w)) {
          dist.set(w, d + 1);
          queue.push(w);
        }
        if (dist.get(w) === d + 1) {
          sigma.set(w, (sigma.get(w) || 0) + (sigma.get(v) || 1));
          if (!pred.has(w)) pred.set(w, []);
          pred.get(w)!.push(v);
        }
      }
    }

    // Accumulate betweenness
    const delta = new Map<string, number>();
    while (stack.length > 0) {
      const w = stack.pop()!;
      const d = delta.get(w) || 0;
      for (const v of pred.get(w) || []) {
        const contribution = ((sigma.get(v) || 1) / (sigma.get(w) || 1)) * (1 + d);
        delta.set(v, (delta.get(v) || 0) + contribution);
      }
      if (w !== source.id) {
        betweenness.set(w, (betweenness.get(w) || 0) + (delta.get(w) || 0));
      }
    }
  }

  // Normalize betweenness
  const scale = sampleNodes.length < totalNodes ? totalNodes / sampleNodes.length : 1;
  const maxBetweenness = Math.max(...Array.from(betweenness.values()), 1);

  // 3. Cluster coefficient
  const clusterCoeff = new Map<string, number>();
  for (const [id, neighbors] of adj) {
    const neighborList = Array.from(neighbors);
    if (neighborList.length < 2) {
      clusterCoeff.set(id, 0);
      continue;
    }
    let triangles = 0;
    for (let i = 0; i < neighborList.length; i++) {
      for (let j = i + 1; j < neighborList.length; j++) {
        if (adj.get(neighborList[i])?.has(neighborList[j])) {
          triangles++;
        }
      }
    }
    const possibleTriangles = (neighborList.length * (neighborList.length - 1)) / 2;
    clusterCoeff.set(id, triangles / possibleTriangles);
  }

  // Compute composite influence score
  const results: PersonInfluence[] = allPeople.map((p) => {
    const dc = degreeCentrality.get(p.id) || 0;
    const bc = ((betweenness.get(p.id) || 0) * scale) / maxBetweenness;
    const cc = clusterCoeff.get(p.id) || 0;

    // Weighted composite: degree 40%, betweenness 40%, cluster 20%
    const influenceScore = Math.round((dc * 0.4 + bc * 0.4 + cc * 0.2) * 100);

    return {
      personId: p.id,
      personName: p.name,
      degreeCentrality: Math.round(dc * 1000) / 1000,
      betweennessCentrality: Math.round(bc * 1000) / 1000,
      clusterCoefficient: Math.round(cc * 1000) / 1000,
      influenceScore: Math.min(100, influenceScore),
    };
  });

  return results.sort((a, b) => b.influenceScore - a.influenceScore);
}

/**
 * Detect micro-communities using co-attendance patterns and connection clustering.
 */
export async function detectMicroCommunities(): Promise<MicroCommunity[]> {
  const allConnections = await db.select().from(connections);
  const allPeople = await db.select({ id: people.id, name: people.name, tags: people.tags }).from(people);

  // Build adjacency
  const adj = new Map<string, Set<string>>();
  for (const p of allPeople) adj.set(p.id, new Set());
  for (const c of allConnections) {
    adj.get(c.fromPersonId)?.add(c.toPersonId);
    adj.get(c.toPersonId)?.add(c.fromPersonId);
  }

  // Simple community detection: connected components with high internal density
  const visited = new Set<string>();
  const communities: MicroCommunity[] = [];
  let communityIdx = 0;

  for (const person of allPeople) {
    if (visited.has(person.id)) continue;
    if ((adj.get(person.id)?.size || 0) === 0) continue;

    // BFS to find connected component
    const component: string[] = [];
    const queue = [person.id];
    visited.add(person.id);

    while (queue.length > 0) {
      const current = queue.shift()!;
      component.push(current);
      for (const neighbor of adj.get(current) || []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    if (component.length < 3) continue; // Skip tiny components

    // Calculate internal edge density (cohesion)
    let internalEdges = 0;
    const componentSet = new Set(component);
    for (const c of allConnections) {
      if (componentSet.has(c.fromPersonId) && componentSet.has(c.toPersonId)) {
        internalEdges++;
      }
    }
    const maxEdges = (component.length * (component.length - 1)) / 2;
    const cohesion = maxEdges > 0 ? internalEdges / maxEdges : 0;

    // Find shared tags
    const tagCounts = new Map<string, number>();
    for (const pid of component) {
      const p = allPeople.find(pp => pp.id === pid);
      for (const tag of (p?.tags as string[]) || []) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    }
    const sharedTags = Array.from(tagCounts.entries())
      .filter(([, count]) => count >= Math.ceil(component.length * 0.3))
      .map(([tag]) => tag)
      .sort();

    communityIdx++;
    communities.push({
      id: `community-${communityIdx}`,
      name: sharedTags.length > 0 ? sharedTags.slice(0, 3).join(' / ') : `Cluster ${communityIdx}`,
      memberIds: component,
      sharedTags,
      cohesion: Math.round(cohesion * 1000) / 1000,
    });
  }

  return communities.sort((a, b) => b.memberIds.length - a.memberIds.length);
}

/**
 * Find the warmest introduction path between two people.
 * Factors in connection strength and relationship tier.
 */
export async function findWarmPath(
  fromId: string,
  toId: string,
  maxDepth = 4
): Promise<Array<{ path: Array<{ personId: string; personName: string; tier: number }>; warmthScore: number }>> {
  const allConnections = await db.select().from(connections);
  const allPeople = await db.select({ id: people.id, name: people.name, tier: people.tier }).from(people);

  const personMap = new Map(allPeople.map(p => [p.id, p]));

  // Build adjacency with strength weights
  const adj = new Map<string, Array<{ id: string; strength: string }>>();
  for (const c of allConnections) {
    if (!adj.has(c.fromPersonId)) adj.set(c.fromPersonId, []);
    if (!adj.has(c.toPersonId)) adj.set(c.toPersonId, []);
    adj.get(c.fromPersonId)!.push({ id: c.toPersonId, strength: c.strength });
    adj.get(c.toPersonId)!.push({ id: c.fromPersonId, strength: c.strength });
  }

  // BFS with warmth scoring
  const strengthScore: Record<string, number> = { strong: 3, medium: 2, weak: 1 };
  const tierScore = (tier: number) => 6 - tier; // T1=5, T5=1

  const paths: Array<{ personIds: string[]; warmth: number }> = [];
  const queue: Array<{ path: string[]; warmth: number }> = [{ path: [fromId], warmth: 0 }];

  while (queue.length > 0 && paths.length < 5) {
    const { path, warmth } = queue.shift()!;
    const current = path[path.length - 1];

    if (current === toId) {
      paths.push({ personIds: path, warmth });
      continue;
    }

    if (path.length > maxDepth) continue;

    for (const neighbor of adj.get(current) || []) {
      if (!path.includes(neighbor.id)) {
        const person = personMap.get(neighbor.id);
        const edgeWarmth = (strengthScore[neighbor.strength] || 1) + (person ? tierScore(person.tier) : 0);
        queue.push({
          path: [...path, neighbor.id],
          warmth: warmth + edgeWarmth,
        });
      }
    }
  }

  // Sort by warmth (higher = warmer path)
  return paths
    .sort((a, b) => b.warmth - a.warmth)
    .map(p => ({
      path: p.personIds.map(pid => {
        const person = personMap.get(pid);
        return {
          personId: pid,
          personName: person?.name || 'Unknown',
          tier: person?.tier || 5,
        };
      }),
      warmthScore: p.warmth,
    }));
}

/**
 * Get a person's social context: their immediate cluster, close connections, and overlapping circles.
 */
export async function getSocialContext(personId: string) {
  const allConnections = await db.select().from(connections);
  const allPeople = await db.select({
    id: people.id,
    name: people.name,
    tier: people.tier,
    organizationId: people.organizationId,
    tags: people.tags,
  }).from(people);

  const personMap = new Map(allPeople.map(p => [p.id, p]));
  const person = personMap.get(personId);
  if (!person) return null;

  // Direct connections
  const directConnections = allConnections
    .filter(c => c.fromPersonId === personId || c.toPersonId === personId)
    .map(c => {
      const otherId = c.fromPersonId === personId ? c.toPersonId : c.fromPersonId;
      const other = personMap.get(otherId);
      return {
        personId: otherId,
        personName: other?.name || 'Unknown',
        tier: other?.tier || 5,
        strength: c.strength,
        type: c.type,
      };
    })
    .sort((a, b) => {
      const strengthOrder: Record<string, number> = { strong: 0, medium: 1, weak: 2 };
      return (strengthOrder[a.strength] || 2) - (strengthOrder[b.strength] || 2);
    });

  // Shared connections (mutual friends)
  const myConnections = new Set(directConnections.map(c => c.personId));
  const mutualConnections: Array<{ personId: string; personName: string; mutualCount: number }> = [];

  for (const dc of directConnections) {
    const theirConnections = allConnections
      .filter(c => c.fromPersonId === dc.personId || c.toPersonId === dc.personId)
      .map(c => c.fromPersonId === dc.personId ? c.toPersonId : c.fromPersonId)
      .filter(id => id !== personId && myConnections.has(id));

    if (theirConnections.length > 0) {
      mutualConnections.push({
        personId: dc.personId,
        personName: dc.personName,
        mutualCount: theirConnections.length,
      });
    }
  }

  mutualConnections.sort((a, b) => b.mutualCount - a.mutualCount);

  // Shared tags with direct connections
  const myTags = new Set((person.tags as string[]) || []);
  const tagOverlap = new Map<string, number>();
  for (const dc of directConnections) {
    const other = personMap.get(dc.personId);
    for (const tag of (other?.tags as string[]) || []) {
      if (myTags.has(tag)) {
        tagOverlap.set(tag, (tagOverlap.get(tag) || 0) + 1);
      }
    }
  }

  return {
    person: { id: person.id, name: person.name, tier: person.tier },
    directConnections,
    mutualConnections: mutualConnections.slice(0, 10),
    connectionCount: directConnections.length,
    strongConnections: directConnections.filter(c => c.strength === 'strong').length,
    sharedTagOverlap: Array.from(tagOverlap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({ tag, count })),
  };
}
