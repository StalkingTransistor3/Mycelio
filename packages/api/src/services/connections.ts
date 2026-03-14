import { eq, or } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import type { GraphData, GraphNode, GraphEdge, ConnectionStrength } from '@mycelio/shared';

const { connections, people } = schema;

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
  const allPeople = await db.select().from(people);
  const allConnections = await db.select().from(connections);

  const nodes: GraphNode[] = allPeople.map((p) => ({
    id: p.id,
    name: p.name,
    tier: p.tier as 1 | 2 | 3 | 4 | 5,
    group: null,
    tags: p.tags as string[],
  }));

  const edges: GraphEdge[] = allConnections.map((c) => ({
    source: c.fromPersonId,
    target: c.toPersonId,
    strength: c.strength as ConnectionStrength,
    context: c.context,
  }));

  return { nodes, edges };
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
