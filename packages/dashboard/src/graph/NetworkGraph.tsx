import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { GraphNode, GraphEdge } from '@mycelio/shared';

interface Props {
  nodes: GraphNode[];
  edges: GraphEdge[];
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

type SimNode = d3.SimulationNodeDatum & GraphNode;
type SimLink = d3.SimulationLinkDatum<SimNode> & GraphEdge;

export default function NetworkGraph({ nodes, edges, width, height, onNodeClick }: Props) {
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

    const simulation = d3
      .forceSimulation(simNodes)
      .force(
        'link',
        d3
          .forceLink<SimNode, SimLink>(simLinks)
          .id((d) => d.id)
          .distance(100),
      )
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(20));

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

    // Links
    g.append('g')
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

    simulation.on('tick', () => {
      link
        .attr('x1', (d: unknown) => ((d as SimLink).source as SimNode).x!)
        .attr('y1', (d: unknown) => ((d as SimLink).source as SimNode).y!)
        .attr('x2', (d: unknown) => ((d as SimLink).target as SimNode).x!)
        .attr('y2', (d: unknown) => ((d as SimLink).target as SimNode).y!);

      node.attr('transform', (d) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [nodes, edges, width, height, onNodeClick]);

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      className="bg-transparent"
    />
  );
}
