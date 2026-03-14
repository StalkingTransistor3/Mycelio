import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { GraphNode, GraphEdge, GraphGroup } from '@mycelio/shared';

interface Props {
  nodes: GraphNode[];
  edges: GraphEdge[];
  groups: GraphGroup[];
  width: number;
  height: number;
  onNodeClick?: (node: GraphNode) => void;
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

// Muted palette for org hull backgrounds
const ORG_COLORS = [
  '#ff00e5', '#00f0ff', '#39ff14', '#f0ff00', '#ff6600',
  '#aa44ff', '#00ff99', '#ff4466', '#44aaff', '#ffaa00',
  '#66ffcc', '#ff66aa', '#88ff44', '#ff8844', '#44ffdd',
  '#dd44ff', '#ffdd44', '#44ddff', '#ff4488', '#88ddff',
];

type SimNode = d3.SimulationNodeDatum & GraphNode;
type SimLink = d3.SimulationLinkDatum<SimNode> & GraphEdge;

export default function NetworkGraph({ nodes, edges, groups, width, height, onNodeClick }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

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

    // Compute cluster center positions (radial layout for orgs)
    const orgIds = groups.map((g) => g.id);
    const orgCenters = new Map<string, { x: number; y: number }>();
    const cx = width / 2;
    const cy = height / 2;
    const clusterRadius = Math.min(width, height) * 0.32;

    orgIds.forEach((id, i) => {
      const angle = (2 * Math.PI * i) / orgIds.length - Math.PI / 2;
      orgCenters.set(id, {
        x: cx + clusterRadius * Math.cos(angle),
        y: cy + clusterRadius * Math.sin(angle),
      });
    });

    // Assign color per org
    const orgColorMap = new Map<string, string>();
    orgIds.forEach((id, i) => {
      orgColorMap.set(id, ORG_COLORS[i % ORG_COLORS.length]);
    });

    const simulation = d3
      .forceSimulation(simNodes)
      .force(
        'link',
        d3
          .forceLink<SimNode, SimLink>(simLinks)
          .id((d) => d.id)
          .distance(120),
      )
      .force('charge', d3.forceManyBody().strength(-180))
      .force('collision', d3.forceCollide().radius(22))
      .force(
        'x',
        d3.forceX<SimNode>((d) => {
          const center = d.organizationId ? orgCenters.get(d.organizationId) : null;
          return center ? center.x : cx;
        }).strength((d) => (d.organizationId ? 0.15 : 0.05)),
      )
      .force(
        'y',
        d3.forceY<SimNode>((d) => {
          const center = d.organizationId ? orgCenters.get(d.organizationId) : null;
          return center ? center.y : cy;
        }).strength((d) => (d.organizationId ? 0.15 : 0.05)),
      );

    // Glow filter
    const defs = svg.append('defs');
    const filter = defs.append('filter').attr('id', 'glow');
    filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    const g = svg.append('g');

    svg.call(
      d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.2, 4]).on('zoom', (event) => {
        g.attr('transform', event.transform);
      }) as unknown as (selection: d3.Selection<SVGSVGElement, unknown, null, undefined>) => void,
    );

    // Hull layer (rendered behind everything)
    const hullGroup = g.append('g').attr('class', 'hulls');

    // Links
    const linkGroup = g.append('g');
    linkGroup
      .selectAll('line')
      .data(simLinks)
      .join('line')
      .attr('stroke', 'rgba(0, 240, 255, 0.15)')
      .attr('stroke-width', (d) => strengthWidth[d.strength] || 1);

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

    const link = g.selectAll('line');

    // Build a lookup for org name by id
    const orgNameMap = new Map<string, string>();
    for (const grp of groups) {
      orgNameMap.set(grp.id, grp.name);
    }

    simulation.on('tick', () => {
      link
        .attr('x1', (d: unknown) => ((d as SimLink).source as SimNode).x!)
        .attr('y1', (d: unknown) => ((d as SimLink).source as SimNode).y!)
        .attr('x2', (d: unknown) => ((d as SimLink).target as SimNode).x!)
        .attr('y2', (d: unknown) => ((d as SimLink).target as SimNode).y!);

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
          // For 1-2 nodes, create a synthetic hull around them
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

        // Expand points outward by padding for a roomier hull
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
          return color + '0a'; // very low opacity hex
        })
        .attr('stroke', (d) => {
          const color = orgColorMap.get(d.orgId) || '#ffffff';
          return color + '30';
        })
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '4,4');

      hullPaths.exit().remove();

      // Update org labels at hull centroids
      const labelData: { orgId: string; x: number; y: number; name: string }[] = [];
      for (const { orgId, hull } of hullData) {
        const name = orgNameMap.get(orgId);
        if (!name) continue;
        const centroid = d3.polygonCentroid(hull);
        // Place label above the hull
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

    return () => {
      simulation.stop();
    };
  }, [nodes, edges, groups, width, height, onNodeClick]);

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      className="bg-transparent"
    />
  );
}
