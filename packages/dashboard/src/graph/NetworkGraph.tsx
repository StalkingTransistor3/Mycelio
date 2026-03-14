import { useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import type { GraphNode, GraphEdge, GraphGroup } from '@mycelio/shared';
import type { SimParams } from './GraphSimControls.js';

export interface GraphAPI {
  panToNode: (nodeId: string) => void;
  panToOrg: (orgId: string) => void;
}

interface Props {
  nodes: GraphNode[];
  edges: GraphEdge[];
  groups: GraphGroup[];
  width: number;
  height: number;
  onNodeClick?: (node: GraphNode) => void;
  simParams: SimParams;
  highlightNodeId?: string | null;
  highlightOrgId?: string | null;
  onReady?: (api: GraphAPI) => void;
}

const tierRadius: Record<number, number> = {
  1: 16,
  2: 13,
  3: 10,
  4: 8,
  5: 6,
};

const tierColor: Record<number, string> = {
  1: '#ff00e5',
  2: '#00f0ff',
  3: '#39ff14',
  4: '#f0ff00',
  5: '#555566',
};

const strengthWidth: Record<string, number> = {
  strong: 3,
  medium: 2,
  weak: 1,
};

const ORG_COLORS = [
  '#ff00e5', '#00f0ff', '#39ff14', '#f0ff00', '#ff6600',
  '#aa44ff', '#00ff99', '#ff4466', '#44aaff', '#ffaa00',
  '#66ffcc', '#ff66aa', '#88ff44', '#ff8844', '#44ffdd',
  '#dd44ff', '#ffdd44', '#44ddff', '#ff4488', '#88ddff',
];

type SimNode = d3.SimulationNodeDatum & GraphNode;
type SimLink = d3.SimulationLinkDatum<SimNode> & GraphEdge;

export default function NetworkGraph({
  nodes, edges, groups, width, height, onNodeClick,
  simParams, highlightNodeId, highlightOrgId, onReady,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const simRef = useRef<d3.Simulation<SimNode, SimLink> | null>(null);
  const simNodesRef = useRef<SimNode[]>([]);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const gRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);
  const orgCentersRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const nodeSelectionsRef = useRef<d3.Selection<SVGGElement, SimNode, SVGGElement, unknown> | null>(null);
  const linkSelectionRef = useRef<d3.Selection<SVGLineElement, SimLink, SVGGElement, unknown> | null>(null);

  // Pan to a specific node
  const panToNode = useCallback((nodeId: string) => {
    const svg = svgRef.current;
    const zoom = zoomRef.current;
    if (!svg || !zoom) return;

    const node = simNodesRef.current.find((n) => n.id === nodeId);
    if (!node || node.x == null || node.y == null) return;

    const svgSel = d3.select(svg);
    const scale = 1.5;
    const transform = d3.zoomIdentity
      .translate(width / 2 - node.x * scale, height / 2 - node.y * scale)
      .scale(scale);

    svgSel.transition().duration(600).call(zoom.transform as any, transform);
  }, [width, height]);

  // Pan to an org cluster centroid
  const panToOrg = useCallback((orgId: string) => {
    const svg = svgRef.current;
    const zoom = zoomRef.current;
    if (!svg || !zoom) return;

    // Compute centroid from current node positions
    const orgNodes = simNodesRef.current.filter((n) => n.organizationId === orgId);
    if (orgNodes.length === 0) return;

    const cx = orgNodes.reduce((s, n) => s + (n.x ?? 0), 0) / orgNodes.length;
    const cy = orgNodes.reduce((s, n) => s + (n.y ?? 0), 0) / orgNodes.length;

    const svgSel = d3.select(svg);
    const scale = 1.2;
    const transform = d3.zoomIdentity
      .translate(width / 2 - cx * scale, height / 2 - cy * scale)
      .scale(scale);

    svgSel.transition().duration(600).call(zoom.transform as any, transform);
  }, [width, height]);

  // Build the SVG structure and simulation when data changes
  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const simNodes: SimNode[] = nodes.map((n) => ({ ...n }));
    const simLinks: SimLink[] = edges.map((e) => ({
      ...e,
      source: e.source,
      target: e.target,
    }));

    simNodesRef.current = simNodes;

    // Compute cluster center positions
    const orgIds = groups.map((g) => g.id);
    const orgCenters = new Map<string, { x: number; y: number }>();
    const centerX = width / 2;
    const centerY = height / 2;
    const clusterRadius = Math.min(width, height) * 0.32;

    orgIds.forEach((id, i) => {
      const angle = (2 * Math.PI * i) / orgIds.length - Math.PI / 2;
      orgCenters.set(id, {
        x: centerX + clusterRadius * Math.cos(angle),
        y: centerY + clusterRadius * Math.sin(angle),
      });
    });
    orgCentersRef.current = orgCenters;

    // Assign color per org
    const orgColorMap = new Map<string, string>();
    orgIds.forEach((id, i) => {
      orgColorMap.set(id, ORG_COLORS[i % ORG_COLORS.length]);
    });

    const simulation = d3
      .forceSimulation(simNodes)
      .force(
        'link',
        d3.forceLink<SimNode, SimLink>(simLinks).id((d) => d.id).distance(simParams.linkDistance),
      )
      .force('charge', d3.forceManyBody().strength(simParams.repulsion))
      .force('collision', d3.forceCollide().radius(simParams.collisionRadius))
      .force(
        'x',
        d3.forceX<SimNode>((d) => {
          const center = d.organizationId ? orgCenters.get(d.organizationId) : null;
          return center ? center.x : centerX;
        }).strength((d) => (d.organizationId ? simParams.clusterStrength : 0.05)),
      )
      .force(
        'y',
        d3.forceY<SimNode>((d) => {
          const center = d.organizationId ? orgCenters.get(d.organizationId) : null;
          return center ? center.y : centerY;
        }).strength((d) => (d.organizationId ? simParams.clusterStrength : 0.05)),
      );

    simRef.current = simulation;

    // Glow filter
    const defs = svg.append('defs');
    const filter = defs.append('filter').attr('id', 'glow');
    filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    const g = svg.append('g');
    gRef.current = g;

    const zoom = d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.2, 4]).on('zoom', (event) => {
      g.attr('transform', event.transform);
    });
    zoomRef.current = zoom;

    svg.call(
      zoom as unknown as (selection: d3.Selection<SVGSVGElement, unknown, null, undefined>) => void,
    );

    // Hull layer
    const hullGroup = g.append('g').attr('class', 'hulls');

    // Links
    const linkGroup = g.append('g');
    const linkSel = linkGroup
      .selectAll<SVGLineElement, SimLink>('line')
      .data(simLinks)
      .join('line')
      .attr('stroke', 'rgba(0, 240, 255, 0.15)')
      .attr('stroke-width', (d) => strengthWidth[d.strength] || 1);
    linkSelectionRef.current = linkSel;

    // Nodes
    const node = g
      .append('g')
      .selectAll<SVGGElement, SimNode>('g')
      .data(simNodes)
      .join('g')
      .attr('cursor', 'pointer')
      .call(
        d3
          .drag<SVGGElement, SimNode>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }),
      );
    nodeSelectionsRef.current = node;

    node
      .append('circle')
      .attr('r', (d) => tierRadius[d.tier] || 10)
      .attr('fill', (d) => tierColor[d.tier] || '#555566')
      .attr('fill-opacity', 0.6)
      .attr('stroke', (d) => tierColor[d.tier] || '#555566')
      .attr('stroke-width', 1.5)
      .attr('filter', 'url(#glow)');

    node
      .append('text')
      .text((d) => d.name)
      .attr('font-size', '10px')
      .attr('dx', (d) => (tierRadius[d.tier] || 10) + 4)
      .attr('dy', 4)
      .attr('fill', 'rgba(255, 255, 255, 0.5)')
      .attr('font-family', 'monospace');

    node.on('click', (_event, d) => {
      onNodeClick?.(d);
    });

    // Build a lookup for org name by id
    const orgNameMap = new Map<string, string>();
    for (const grp of groups) {
      orgNameMap.set(grp.id, grp.name);
    }

    simulation.on('tick', () => {
      linkSel
        .attr('x1', (d) => ((d.source as SimNode).x!))
        .attr('y1', (d) => ((d.source as SimNode).y!))
        .attr('x2', (d) => ((d.target as SimNode).x!))
        .attr('y2', (d) => ((d.target as SimNode).y!));

      node.attr('transform', (d) => `translate(${d.x},${d.y})`);

      // Update convex hulls
      const orgNodePositions = new Map<string, [number, number][]>();
      for (const n of simNodes) {
        if (n.organizationId && n.x != null && n.y != null) {
          if (!orgNodePositions.has(n.organizationId)) {
            orgNodePositions.set(n.organizationId, []);
          }
          orgNodePositions.get(n.organizationId)!.push([n.x, n.y]);
        }
      }

      const hullData: { orgId: string; hull: [number, number][] }[] = [];
      for (const [orgId, points] of orgNodePositions) {
        if (points.length < 3) {
          if (points.length === 1) {
            const [px, py] = points[0];
            const pad = 30;
            hullData.push({
              orgId,
              hull: [
                [px - pad, py - pad],
                [px + pad, py - pad],
                [px + pad, py + pad],
                [px - pad, py + pad],
              ],
            });
          } else if (points.length === 2) {
            const [[x1, y1], [x2, y2]] = points;
            const dx = x2 - x1;
            const dy = y2 - y1;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            const nx = (-dy / len) * 20;
            const ny = (dx / len) * 20;
            hullData.push({
              orgId,
              hull: [
                [x1 + nx, y1 + ny],
                [x1 - nx, y1 - ny],
                [x2 - nx, y2 - ny],
                [x2 + nx, y2 + ny],
              ],
            });
          }
          continue;
        }

        const pad = 25;
        const centroidX = points.reduce((s, p) => s + p[0], 0) / points.length;
        const centroidY = points.reduce((s, p) => s + p[1], 0) / points.length;
        const expanded: [number, number][] = points.map(([px, py]) => {
          const dx = px - centroidX;
          const dy = py - centroidY;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          return [px + (dx / dist) * pad, py + (dy / dist) * pad];
        });

        const hull = d3.polygonHull(expanded);
        if (hull) {
          hullData.push({ orgId, hull });
        }
      }

      const hullPaths = hullGroup.selectAll<SVGPathElement, typeof hullData[0]>('path').data(hullData, (d) => d.orgId);

      hullPaths
        .enter()
        .append('path')
        .merge(hullPaths)
        .attr('d', (d) => `M${d.hull.map((p) => p.join(',')).join('L')}Z`)
        .attr('fill', (d) => {
          const color = orgColorMap.get(d.orgId) || '#ffffff';
          return color + '0a';
        })
        .attr('stroke', (d) => {
          const color = orgColorMap.get(d.orgId) || '#ffffff';
          return color + '30';
        })
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '4,4');

      hullPaths.exit().remove();

      // Org labels
      const labelData: { orgId: string; x: number; y: number; name: string }[] = [];
      for (const { orgId, hull } of hullData) {
        const name = orgNameMap.get(orgId);
        if (!name) continue;
        const centroid = d3.polygonCentroid(hull);
        const minY = Math.min(...hull.map((p) => p[1]));
        labelData.push({ orgId, x: centroid[0], y: minY - 10, name });
      }

      const labels = hullGroup.selectAll<SVGTextElement, typeof labelData[0]>('text').data(labelData, (d) => d.orgId);

      labels
        .enter()
        .append('text')
        .merge(labels)
        .attr('x', (d) => d.x)
        .attr('y', (d) => d.y)
        .attr('text-anchor', 'middle')
        .attr('font-size', '9px')
        .attr('font-family', 'monospace')
        .attr('fill', (d) => {
          const color = orgColorMap.get(d.orgId) || '#ffffff';
          return color + '60';
        })
        .attr('font-weight', '600')
        .text((d) => d.name);

      labels.exit().remove();
    });

    // Expose API
    onReady?.({ panToNode, panToOrg });

    return () => {
      simulation.stop();
      simRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, groups, width, height, onNodeClick]);

  // Update forces when simParams change (without rebuilding SVG)
  useEffect(() => {
    const sim = simRef.current;
    if (!sim) return;

    const centerX = width / 2;
    const orgCenters = orgCentersRef.current;

    const linkForce = sim.force('link') as d3.ForceLink<SimNode, SimLink> | undefined;
    if (linkForce) linkForce.distance(simParams.linkDistance);

    const chargeForce = sim.force('charge') as d3.ForceManyBody<SimNode> | undefined;
    if (chargeForce) chargeForce.strength(simParams.repulsion);

    const collisionForce = sim.force('collision') as d3.ForceCollide<SimNode> | undefined;
    if (collisionForce) collisionForce.radius(simParams.collisionRadius);

    const xForce = sim.force('x') as d3.ForceX<SimNode> | undefined;
    if (xForce) xForce.strength((d) => (d.organizationId ? simParams.clusterStrength : 0.05));

    const yForce = sim.force('y') as d3.ForceY<SimNode> | undefined;
    if (yForce) yForce.strength((d) => (d.organizationId ? simParams.clusterStrength : 0.05));

    sim.alpha(0.3).restart();
  }, [simParams, width]);

  // Update highlight styling
  useEffect(() => {
    const nodeSel = nodeSelectionsRef.current;
    const linkSel = linkSelectionRef.current;
    if (!nodeSel || !linkSel) return;

    const hasHighlight = highlightNodeId || highlightOrgId;

    nodeSel.select('circle')
      .transition().duration(300)
      .attr('fill-opacity', (d) => {
        if (!hasHighlight) return 0.6;
        if (highlightNodeId && d.id === highlightNodeId) return 1;
        if (highlightOrgId && d.organizationId === highlightOrgId) return 0.9;
        return 0.15;
      })
      .attr('stroke-width', (d) => {
        if (highlightNodeId && d.id === highlightNodeId) return 3;
        if (highlightOrgId && d.organizationId === highlightOrgId) return 2.5;
        return 1.5;
      })
      .attr('r', (d) => {
        const base = tierRadius[d.tier] || 10;
        if (highlightNodeId && d.id === highlightNodeId) return base * 1.5;
        return base;
      });

    nodeSel.select('text')
      .transition().duration(300)
      .attr('fill', (d) => {
        if (!hasHighlight) return 'rgba(255, 255, 255, 0.5)';
        if (highlightNodeId && d.id === highlightNodeId) return 'rgba(255, 255, 255, 0.95)';
        if (highlightOrgId && d.organizationId === highlightOrgId) return 'rgba(255, 255, 255, 0.8)';
        return 'rgba(255, 255, 255, 0.12)';
      });

    linkSel
      .transition().duration(300)
      .attr('stroke-opacity', () => hasHighlight ? 0.05 : 1);
  }, [highlightNodeId, highlightOrgId]);

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      className="bg-transparent"
    />
  );
}
