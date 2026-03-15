import { useEffect, useRef, useCallback, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import type { GraphNode, GraphEdge, GraphGroup } from '@mycelio/shared';

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
  onNodeHover?: (node: GraphNode | null) => void;
  highlightNodeId?: string | null;
  highlightOrgId?: string | null;
  egoNodeId?: string | null;
  onReady?: (api: GraphAPI) => void;
}

const tierRadius: Record<number, number> = {
  1: 8,
  2: 6.5,
  3: 5,
  4: 4,
  5: 3,
};

const tierColor: Record<number, string> = {
  1: '#ff00e5',
  2: '#00f0ff',
  3: '#39ff14',
  4: '#f0ff00',
  5: '#555566',
};

interface FGNode extends GraphNode {
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  __connections?: Set<string>;
}

interface FGLink {
  source: string | FGNode;
  target: string | FGNode;
  strength: string;
  context: string | null;
}

export default function NetworkGraph({
  nodes, edges, groups, width, height, onNodeClick, onNodeHover,
  highlightNodeId, highlightOrgId, egoNodeId, onReady,
}: Props) {
  const fgRef = useRef<any>(null);
  const hoveredNodeRef = useRef<string | null>(null);
  const nodesRef = useRef<FGNode[]>([]);

  // Build connection lookup for highlighting
  const connectionMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const e of edges) {
      if (!map.has(e.source)) map.set(e.source, new Set());
      if (!map.has(e.target)) map.set(e.target, new Set());
      map.get(e.source)!.add(e.target);
      map.get(e.target)!.add(e.source);
    }
    return map;
  }, [edges]);

  // Prepare graph data for force-graph
  const graphData = useMemo(() => {
    const fgNodes: FGNode[] = nodes.map((n) => ({
      ...n,
      __connections: connectionMap.get(n.id) || new Set(),
    }));
    nodesRef.current = fgNodes;

    const fgLinks: FGLink[] = edges.map((e) => ({
      source: e.source,
      target: e.target,
      strength: e.strength,
      context: e.context,
    }));

    return { nodes: fgNodes, links: fgLinks };
  }, [nodes, edges, connectionMap]);

  // Pan to node
  const panToNode = useCallback((nodeId: string) => {
    const fg = fgRef.current;
    if (!fg) return;
    const node = nodesRef.current.find((n) => n.id === nodeId);
    if (node && node.x != null && node.y != null) {
      fg.centerAt(node.x, node.y, 600);
      fg.zoom(2, 600);
    }
  }, []);

  // Pan to org cluster centroid
  const panToOrg = useCallback((orgId: string) => {
    const fg = fgRef.current;
    if (!fg) return;
    const orgNodes = nodesRef.current.filter((n) => n.organizationId === orgId);
    if (orgNodes.length === 0) return;
    const cx = orgNodes.reduce((s, n) => s + (n.x ?? 0), 0) / orgNodes.length;
    const cy = orgNodes.reduce((s, n) => s + (n.y ?? 0), 0) / orgNodes.length;
    fg.centerAt(cx, cy, 600);
    fg.zoom(1.5, 600);
  }, []);

  // Expose API
  useEffect(() => {
    onReady?.({ panToNode, panToOrg });
  }, [onReady, panToNode, panToOrg]);

  // Custom node rendering
  const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const n = node as FGNode;
    const r = tierRadius[n.tier] || 5;
    const color = tierColor[n.tier] || '#555566';
    const x = n.x ?? 0;
    const y = n.y ?? 0;

    const isHovered = hoveredNodeRef.current === n.id;
    const isHighlighted = highlightNodeId === n.id;
    const isEgoCenter = egoNodeId === n.id;
    const isConnectedToHovered = hoveredNodeRef.current && n.__connections?.has(hoveredNodeRef.current);
    const isConnectedToHighlight = highlightNodeId && n.__connections?.has(highlightNodeId);
    const isOrgHighlighted = highlightOrgId && n.organizationId === highlightOrgId;

    const hasAnyHighlight = highlightNodeId || highlightOrgId || hoveredNodeRef.current;

    let alpha = 0.7;
    let nodeR = r;

    if (hasAnyHighlight) {
      if (isHovered || isHighlighted || isEgoCenter) {
        alpha = 1;
        nodeR = r * 1.4;
      } else if (isConnectedToHovered || isConnectedToHighlight || isOrgHighlighted) {
        alpha = 0.85;
      } else {
        alpha = 0.12;
      }
    }

    // Glow effect for important nodes
    if (alpha > 0.5) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, nodeR + 3, 0, 2 * Math.PI);
      ctx.fillStyle = color + '30';
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.restore();
    }

    // Node circle
    ctx.beginPath();
    ctx.arc(x, y, nodeR, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    ctx.fill();

    // Stroke
    ctx.strokeStyle = color;
    ctx.lineWidth = isHighlighted || isEgoCenter ? 2 : 0.8;
    ctx.stroke();

    // Label — only show at reasonable zoom or for highlighted/hovered nodes
    const showLabel = globalScale > 1.2 || isHovered || isHighlighted || isEgoCenter || isConnectedToHovered || isConnectedToHighlight;
    if (showLabel) {
      const fontSize = Math.max(10 / globalScale, 2.5);
      ctx.font = `${fontSize}px 'JetBrains Mono', 'Fira Code', monospace`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.9})`;
      ctx.fillText(n.name, x + nodeR + 3, y);
    }

    ctx.globalAlpha = 1;
  }, [highlightNodeId, highlightOrgId, egoNodeId]);

  // Custom node pointer area (for hit detection)
  const nodePointerAreaPaint = useCallback((node: any, color: string, ctx: CanvasRenderingContext2D) => {
    const n = node as FGNode;
    const r = (tierRadius[n.tier] || 5) + 3;
    ctx.beginPath();
    ctx.arc(n.x ?? 0, n.y ?? 0, r, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
  }, []);

  // Custom link rendering
  const linkCanvasObject = useCallback((link: any, ctx: CanvasRenderingContext2D, _globalScale: number) => {
    const src = link.source as FGNode;
    const tgt = link.target as FGNode;
    if (src.x == null || src.y == null || tgt.x == null || tgt.y == null) return;

    const hovered = hoveredNodeRef.current;
    const highlighted = highlightNodeId;

    const isConnectedToActive =
      (hovered && (src.id === hovered || tgt.id === hovered)) ||
      (highlighted && (src.id === highlighted || tgt.id === highlighted));

    let alpha = 0.08;
    let lineWidth = 0.5;

    if (isConnectedToActive) {
      alpha = 0.6;
      lineWidth = link.strength === 'strong' ? 2 : link.strength === 'medium' ? 1.2 : 0.8;
    } else if (hovered || highlighted) {
      alpha = 0.03;
    }

    ctx.beginPath();
    ctx.moveTo(src.x, src.y);
    ctx.lineTo(tgt.x, tgt.y);
    ctx.strokeStyle = `rgba(0, 240, 255, ${alpha})`;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }, [highlightNodeId]);

  const handleNodeHover = useCallback((node: any) => {
    hoveredNodeRef.current = node ? (node as FGNode).id : null;
    onNodeHover?.(node as GraphNode | null);
  }, [onNodeHover]);

  const handleNodeClick = useCallback((node: any) => {
    onNodeClick?.(node as GraphNode);
  }, [onNodeClick]);

  return (
    <ForceGraph2D
      ref={fgRef}
      graphData={graphData}
      width={width}
      height={height}
      backgroundColor="#0a0a0f"
      nodeId="id"
      linkSource="source"
      linkTarget="target"
      nodeCanvasObject={nodeCanvasObject}
      nodePointerAreaPaint={nodePointerAreaPaint}
      linkCanvasObject={linkCanvasObject}
      onNodeClick={handleNodeClick}
      onNodeHover={handleNodeHover}
      nodeLabel={() => ''}
      cooldownTicks={150}
      d3AlphaDecay={0.02}
      d3VelocityDecay={0.3}
      warmupTicks={50}
      enableNodeDrag={true}
      enableZoomInteraction={true}
      enablePanInteraction={true}
    />
  );
}
