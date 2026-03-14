import { eq, or } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import type { GraphData, GraphNode, GraphEdge, GraphGroup, ConnectionStrength } from '@mycelio/shared';

const { connections, people, organizations } = schema;

export async function createConnection(data: {
  fromPersonId: string;
  toPersonId: string;
  strength?: ConnectionStrength;
  context?: string;
}) {
  const result = await db
    .insert(connections)
    .values({
      fromPersonId: data.fromPersonId,
      toPersonId: data.toPersonId,
      strength: data.strength || 'medium',
      context: data.context || null,
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

export async function getGraphData(): Promise<GraphData> {
  const allPeople = await db
    .select({
      id: people.id,
      name: people.name,
      tier: people.tier,
      tags: people.tags,
      organizationId: people.organizationId,
      orgName: organizations.name,
      orgType: organizations.type,
    })
    .from(people)
    .leftJoin(organizations, eq(people.organizationId, organizations.id));

  const allConnections = await db.select().from(connections);

  const nodes: GraphNode[] = allPeople.map((p) => ({
    id: p.id,
    name: p.name,
    tier: p.tier as 1 | 2 | 3 | 4 | 5,
    group: p.orgName || null,
    organizationId: p.organizationId || null,
    tags: p.tags as string[],
  }));

  const edges: GraphEdge[] = allConnections.map((c) => ({
    source: c.fromPersonId,
    target: c.toPersonId,
    strength: c.strength as ConnectionStrength,
    context: c.context,
  }));

  // Build groups from orgs that have people in the graph
  const orgMap = new Map<string, GraphGroup>();
  for (const p of allPeople) {
    if (p.organizationId && p.orgName && !orgMap.has(p.organizationId)) {
      orgMap.set(p.organizationId, {
        id: p.organizationId,
        name: p.orgName,
        type: p.orgType || 'company',
      });
    }
  }
  const groups: GraphGroup[] = Array.from(orgMap.values());

  return { nodes, edges, groups };
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
  const visited = new Set<string>();

  while (queue.length > 0) {
    const path = queue.shift()!;
    const current = path[path.length - 1];

    if (current === toId) {
      paths.push(path);
      if (paths.length >= 3) break; // limit to 3 paths
      continue;
    }

    if (path.length > maxDepth) continue;
    if (visited.has(current)) continue;
    visited.add(current);

    for (const neighbor of adjacency.get(current) || []) {
      if (!path.includes(neighbor)) {
        queue.push([...path, neighbor]);
      }
    }
  }

  return paths;
}
