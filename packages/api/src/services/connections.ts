import { eq, or } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import type { GraphData, GraphNode, GraphEdge, GraphGroup, ConnectionStrength, ConnectionType, ConnectionSource } from '@mycelio/shared';

const { connections, people, organizations } = schema;

export async function createConnection(data: {
  fromPersonId: string;
  toPersonId: string;
  strength?: ConnectionStrength;
  type?: ConnectionType;
  source?: ConnectionSource;
  context?: string;
  howMet?: string;
  connectedAt?: Date;
}) {
  const result = await db
    .insert(connections)
    .values({
      fromPersonId: data.fromPersonId,
      toPersonId: data.toPersonId,
      strength: data.strength || 'medium',
      type: data.type || null,
      source: data.source || 'manual',
      context: data.context || null,
      howMet: data.howMet || null,
      connectedAt: data.connectedAt || null,
    })
    .returning();
  return result[0];
}

export async function getConnectionsForPerson(personId: string) {
  return db
    .select()
    .from(connections)
    .where(
      or(
        eq(connections.fromPersonId, personId),
        eq(connections.toPersonId, personId)
      )
    );
}

export async function getGraphData(options?: {
  tier?: number;
  limit?: number;
}): Promise<GraphData> {
  // Fetch all people and all organizations separately to handle multi-org
  const allPeopleRaw = await db.select().from(people);
  const allOrgs = await db.select().from(organizations);
  const allConnections = await db.select().from(connections);

  const orgById = new Map(allOrgs.map(o => [o.id, o]));

  // Build adjacency for degree counting
  const degreeCount = new Map<string, number>();
  for (const c of allConnections) {
    degreeCount.set(c.fromPersonId, (degreeCount.get(c.fromPersonId) || 0) + 1);
    degreeCount.set(c.toPersonId, (degreeCount.get(c.toPersonId) || 0) + 1);
  }

  let filteredPeople = allPeopleRaw;

  // Filter by tier if provided
  if (options?.tier) {
    const maxTier = options.tier;
    filteredPeople = filteredPeople.filter((p) => (p.tier as number) <= maxTier);
  }

  // Sort by degree (most connected first) and apply limit
  if (options?.limit) {
    filteredPeople.sort((a, b) => (degreeCount.get(b.id) || 0) - (degreeCount.get(a.id) || 0));
    filteredPeople = filteredPeople.slice(0, options.limit);
  }

  const filteredIds = new Set(filteredPeople.map((p) => p.id));

  const nodes: GraphNode[] = filteredPeople.map((p) => {
    // Determine primary group: prefer first org in organizationIds, fallback to organizationId
    const orgIds = (p.organizationIds as string[]) || [];
    const primaryOrgId = orgIds[0] || p.organizationId || null;
    const primaryOrg = primaryOrgId ? orgById.get(primaryOrgId) : null;

    return {
      id: p.id,
      name: p.name,
      tier: p.tier as 1 | 2 | 3 | 4 | 5,
      group: primaryOrg?.name || null,
      organizationId: primaryOrgId,
      organizationIds: orgIds,
      tags: p.tags as string[],
    };
  });

  // Only include edges where both endpoints are in filteredIds
  const edges: GraphEdge[] = allConnections
    .filter((c) => filteredIds.has(c.fromPersonId) && filteredIds.has(c.toPersonId))
    .map((c) => ({
      source: c.fromPersonId,
      target: c.toPersonId,
      strength: c.strength as ConnectionStrength,
      source_type: c.source as ConnectionSource,
      context: c.context,
    }));

  // Build groups from all orgs that have at least one person in filtered set
  const orgMap = new Map<string, GraphGroup>();
  for (const p of filteredPeople) {
    const orgIds = (p.organizationIds as string[]) || [];
    const allOrgIds = p.organizationId ? Array.from(new Set([...orgIds, p.organizationId])) : orgIds;
    for (const oid of allOrgIds) {
      if (!orgMap.has(oid)) {
        const org = orgById.get(oid);
        if (org) {
          orgMap.set(oid, { id: org.id, name: org.name, type: org.type || 'company' });
        }
      }
    }
  }
  const groups: GraphGroup[] = Array.from(orgMap.values());

  return { nodes, edges, groups };
}

export async function getEgoGraph(personId: string, depth: number = 1): Promise<GraphData> {
  const allPeopleRaw = await db.select().from(people);
  const allOrgs = await db.select().from(organizations);
  const allConnections = await db.select().from(connections);

  const orgById = new Map(allOrgs.map(o => [o.id, o]));
  const peopleById = new Map(allPeopleRaw.map(p => [p.id, p]));

  // Build adjacency
  const adjacency = new Map<string, Set<string>>();
  for (const c of allConnections) {
    if (!adjacency.has(c.fromPersonId)) adjacency.set(c.fromPersonId, new Set());
    if (!adjacency.has(c.toPersonId)) adjacency.set(c.toPersonId, new Set());
    adjacency.get(c.fromPersonId)!.add(c.toPersonId);
    adjacency.get(c.toPersonId)!.add(c.fromPersonId);
  }

  // BFS to collect nodes within depth
  const visited = new Set<string>();
  let frontier = new Set<string>([personId]);
  visited.add(personId);

  for (let d = 0; d < depth; d++) {
    const nextFrontier = new Set<string>();
    for (const nodeId of frontier) {
      for (const neighbor of adjacency.get(nodeId) || []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          nextFrontier.add(neighbor);
        }
      }
    }
    frontier = nextFrontier;
  }

  // Build nodes from visited set
  const nodes: GraphNode[] = [];
  for (const id of visited) {
    const p = peopleById.get(id);
    if (!p) continue;
    const orgIds = (p.organizationIds as string[]) || [];
    const primaryOrgId = orgIds[0] || p.organizationId || null;
    const primaryOrg = primaryOrgId ? orgById.get(primaryOrgId) : null;

    nodes.push({
      id: p.id,
      name: p.name,
      tier: p.tier as 1 | 2 | 3 | 4 | 5,
      group: primaryOrg?.name || null,
      organizationId: primaryOrgId,
      organizationIds: orgIds,
      tags: p.tags as string[],
    });
  }

  // Edges where both endpoints are in visited
  const edges: GraphEdge[] = allConnections
    .filter((c) => visited.has(c.fromPersonId) && visited.has(c.toPersonId))
    .map((c) => ({
      source: c.fromPersonId,
      target: c.toPersonId,
      strength: c.strength as ConnectionStrength,
      source_type: c.source as ConnectionSource,
      context: c.context,
    }));

  // Groups
  const orgMap = new Map<string, GraphGroup>();
  for (const n of nodes) {
    const orgIds = n.organizationIds || [];
    const allOrgIds = n.organizationId ? Array.from(new Set([...orgIds, n.organizationId])) : orgIds;
    for (const oid of allOrgIds) {
      if (!orgMap.has(oid)) {
        const org = orgById.get(oid);
        if (org) {
          orgMap.set(oid, { id: org.id, name: org.name, type: org.type || 'company' });
        }
      }
    }
  }

  return { nodes, edges, groups: Array.from(orgMap.values()) };
}

export async function findConnectionPath(
  fromId: string,
  toId: string,
  maxDepth = 4
): Promise<string[][]> {
  // BFS-based path finding through the connection graph
  const allConnections = await db.select().from(connections);

  const adjacency = new Map<string, string[]>();
  for (const c of allConnections) {
    if (!adjacency.has(c.fromPersonId)) adjacency.set(c.fromPersonId, []);
    if (!adjacency.has(c.toPersonId)) adjacency.set(c.toPersonId, []);
    adjacency.get(c.fromPersonId)!.push(c.toPersonId);
    adjacency.get(c.toPersonId)!.push(c.fromPersonId);
  }

  const paths: string[][] = [];
  const queue: string[][] = [[fromId]];
  // Track shortest distance to each node to allow alternative paths
  // but prune clearly suboptimal explorations
  const bestDistance = new Map<string, number>();

  while (queue.length > 0) {
    const path = queue.shift()!;
    const current = path[path.length - 1];

    if (current === toId) {
      paths.push(path);
      if (paths.length >= 3) break;
      continue;
    }

    if (path.length > maxDepth) continue;

    // Allow revisiting if we arrive at same depth (alternative paths)
    // but skip if we've already found a shorter route here
    const prevBest = bestDistance.get(current);
    if (prevBest !== undefined && path.length > prevBest + 1) continue;
    if (prevBest === undefined || path.length < prevBest) {
      bestDistance.set(current, path.length);
    }

    for (const neighbor of adjacency.get(current) || []) {
      if (!path.includes(neighbor)) {
        queue.push([...path, neighbor]);
      }
    }
  }

  return paths;
}
