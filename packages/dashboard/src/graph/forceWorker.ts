/**
 * Web Worker for d3-force simulation.
 * Runs the force layout off the main thread, posting position updates back.
 */

import * as d3 from 'd3';

interface WorkerNode {
  id: string;
  tier: number;
  organizationId: string | null;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

interface WorkerLink {
  source: string;
  target: string;
  strength: string;
}

interface SimParams {
  linkDistance: number;
  charge: number;
  clusterTightness: number;
  collisionRadius: number;
}

type InMessage =
  | { type: 'init'; nodes: WorkerNode[]; links: WorkerLink[]; connectionCounts: Record<string, number>; params: SimParams }
  | { type: 'updateParams'; params: SimParams }
  | { type: 'freeze' }
  | { type: 'unfreeze' }
  | { type: 'reheat' }
  | { type: 'dragStart'; nodeId: string; x: number; y: number }
  | { type: 'dragMove'; nodeId: string; x: number; y: number }
  | { type: 'dragEnd'; nodeId: string }
  | { type: 'stop' };

interface PositionUpdate {
  id: string;
  x: number;
  y: number;
}

let simulation: d3.Simulation<WorkerNode, d3.SimulationLinkDatum<WorkerNode>> | null = null;
let nodes: WorkerNode[] = [];
let connectionCounts: Record<string, number> = {};
let frozen = false;

function buildSimulation(simNodes: WorkerNode[], simLinks: WorkerLink[], params: SimParams, connCounts: Record<string, number>) {
  const nodeLookup = new Map<string, WorkerNode>();
  for (const n of simNodes) nodeLookup.set(n.id, n);

  const links = simLinks.map(l => ({
    source: l.source,
    target: l.target,
    strength: l.strength,
  }));

  const chargeScale = params.charge / -80;

  const sim = d3.forceSimulation<WorkerNode>(simNodes)
    .force('charge', d3.forceManyBody<WorkerNode>().strength((d) => {
      const conns = connCounts[d.id] || 0;
      return (conns <= 2 ? -120 : -40) * chargeScale;
    }))
    .force('link', d3.forceLink(links)
      .id((d: any) => d.id)
      .distance((l: any) => {
        const srcId = typeof l.source === 'string' ? l.source : l.source.id;
        const tgtId = typeof l.target === 'string' ? l.target : l.target.id;
        const srcNode = nodeLookup.get(srcId);
        const tgtNode = nodeLookup.get(tgtId);
        if (srcNode?.organizationId && srcNode.organizationId === tgtNode?.organizationId) {
          return params.clusterTightness;
        }
        const minConns = Math.min(connCounts[srcId] || 0, connCounts[tgtId] || 0);
        return minConns <= 2 ? params.linkDistance * 2.5 : params.linkDistance;
      }))
    .force('collide', d3.forceCollide<WorkerNode>(params.collisionRadius))
    .force('center', d3.forceCenter(0, 0))
    .alphaDecay(0.04)
    .velocityDecay(0.4)
    .alphaMin(0.001);

  // Warm up
  sim.alpha(1);

  return sim;
}

function sendPositions() {
  const positions: PositionUpdate[] = [];
  for (const n of nodes) {
    if (n.x != null && n.y != null) {
      positions.push({ id: n.id, x: n.x, y: n.y });
    }
  }
  self.postMessage({ type: 'positions', positions });
}

function sendStabilized() {
  self.postMessage({ type: 'stabilized' });
}

self.onmessage = (e: MessageEvent<InMessage>) => {
  const msg = e.data;

  switch (msg.type) {
    case 'init': {
      if (simulation) {
        simulation.stop();
        simulation = null;
      }

      nodes = msg.nodes.map(n => ({ ...n }));
      connectionCounts = msg.connectionCounts;
      frozen = false;

      simulation = buildSimulation(nodes, msg.links, msg.params, connectionCounts);
      
      simulation.on('tick', () => {
        if (!frozen) sendPositions();
      });
      
      simulation.on('end', () => {
        sendPositions();
        sendStabilized();
      });

      // Warm up ticks
      for (let i = 0; i < 80; i++) simulation.tick();
      sendPositions();
      break;
    }

    case 'updateParams': {
      if (!simulation) break;
      const params = msg.params;
      const chargeScale = params.charge / -80;

      const charge = simulation.force('charge') as d3.ForceManyBody<WorkerNode> | undefined;
      if (charge) {
        charge.strength((d: WorkerNode) => {
          const conns = connectionCounts[d.id] || 0;
          return (conns <= 2 ? -120 : -40) * chargeScale;
        });
      }

      const link = simulation.force('link') as d3.ForceLink<WorkerNode, d3.SimulationLinkDatum<WorkerNode>> | undefined;
      if (link) {
        const nodeLookup = new Map<string, WorkerNode>();
        for (const n of nodes) nodeLookup.set(n.id, n);
        
        link.distance((l: any) => {
          const srcId = typeof l.source === 'string' ? l.source : l.source.id;
          const tgtId = typeof l.target === 'string' ? l.target : l.target.id;
          const srcNode = nodeLookup.get(srcId);
          const tgtNode = nodeLookup.get(tgtId);
          if (srcNode?.organizationId && srcNode.organizationId === tgtNode?.organizationId) {
            return params.clusterTightness;
          }
          const minConns = Math.min(connectionCounts[srcId] || 0, connectionCounts[tgtId] || 0);
          return minConns <= 2 ? params.linkDistance * 2.5 : params.linkDistance;
        });
      }

      const collide = simulation.force('collide') as d3.ForceCollide<WorkerNode> | undefined;
      if (collide) {
        collide.radius(params.collisionRadius);
      }

      simulation.alpha(0.5).restart();
      break;
    }

    case 'freeze': {
      frozen = true;
      if (simulation) {
        for (const n of nodes) {
          n.fx = n.x;
          n.fy = n.y;
          n.vx = 0;
          n.vy = 0;
        }
        simulation.stop();
      }
      break;
    }

    case 'unfreeze': {
      frozen = false;
      if (simulation) {
        for (const n of nodes) {
          n.fx = null;
          n.fy = null;
        }
        simulation.alpha(0.5).restart();
      }
      break;
    }

    case 'reheat': {
      if (simulation && !frozen) {
        simulation.alpha(0.5).restart();
      }
      break;
    }

    case 'dragStart': {
      const node = nodes.find(n => n.id === msg.nodeId);
      if (node) {
        node.fx = msg.x;
        node.fy = msg.y;
      }
      if (simulation && !frozen) simulation.alphaTarget(0.3).restart();
      break;
    }

    case 'dragMove': {
      const node = nodes.find(n => n.id === msg.nodeId);
      if (node) {
        node.fx = msg.x;
        node.fy = msg.y;
      }
      break;
    }

    case 'dragEnd': {
      const node = nodes.find(n => n.id === msg.nodeId);
      if (node && !frozen) {
        node.fx = null;
        node.fy = null;
      }
      if (simulation) simulation.alphaTarget(0);
      break;
    }

    case 'stop': {
      if (simulation) {
        simulation.stop();
        simulation = null;
      }
      break;
    }
  }
};
