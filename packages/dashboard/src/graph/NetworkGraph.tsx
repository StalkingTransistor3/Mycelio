import { useEffect, useRef, useCallback, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import * as d3 from 'd3';
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

const ORG_COLORS = [
  '#ff00e5', '#00f0ff', '#39ff14', '#f0ff00', '#ff6600',
  '#aa44ff', '#00ff99', '#ff4466', '#44aaff', '#ffaa00',
  '#66ffcc', '#ff66aa', '#88ff44', '#ff8844', '#44ffdd',
  '#dd44ff', '#ffdd44', '#44ddff', '#ff4488', '#88ddff',
];

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

  // Build org color map
  const orgColorMap = useMemo(() => {
    const map = new Map<string, string>();
    groups.forEach((g, i) => {
      map.set(g.id, ORG_COLORS[i % ORG_COLORS.length]);
    });
    return map;
  }, [groups]);

  // Build org name map
  const orgNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of groups) {
      map.set(g.id, g.name);
    }
    return map;
  }, [groups]);

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

  // Stable graph data — only rebuild when the actual node/edge arrays change identity
  const graphDataRef = useRef<{ nodes: FGNode[]; links: FGLink[] }>({ nodes: [], links: [] });
  const prevNodesRef = useRef<GraphNode[]>([]);
  const prevEdgesRef = useRef<GraphEdge[]>([]);

  if (nodes !== prevNodesRef.current || edges !== prevEdgesRef.current) {
    prevNodesRef.current = nodes;
    prevEdgesRef.current = edges;

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

    graphDataRef.current = { nodes: fgNodes, links: fgLinks };
  }

  // Update __connections on existing nodes without replacing them
  useEffect(() => {
    for (const n of nodesRef.current) {
      n.__connections = connectionMap.get(n.id) || new Set();
    }
  }, [connectionMap]);

  const graphData = graphDataRef.current;

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

  // Draw org cluster backgrounds and labels BEFORE nodes
  const onRenderFramePre = useCallback((ctx: CanvasRenderingContext2D, globalScale: number) => {
    // Group nodes by org
    const orgPositions = new Map<string, { x: number; y: number }[]>();
    for (const n of nodesRef.current) {
      if (n.organizationId && n.x != null && n.y != null) {
        if (!orgPositions.has(n.organizationId)) {
          orgPositions.set(n.organizationId, []);
        }
        orgPositions.get(n.organizationId)!.push({ x: n.x, y: n.y });
      }
    }

    // Draw hulls for orgs with 2+ members
    for (const [orgId, positions] of orgPositions) {
      if (positions.length < 2) continue;

      const color = orgColorMap.get(orgId) || '#ffffff';
      const orgName = orgNameMap.get(orgId) || '';
      const isHighlighted = highlightOrgId === orgId;

      // Compute centroid
      const cx = positions.reduce((s, p) => s + p.x, 0) / positions.length;
      const cy = positions.reduce((s, p) => s + p.y, 0) / positions.length;

      // Padding around hull
      const pad = 30;

      if (positions.length === 2) {
        // Draw ellipse between two points
        const [p1, p2] = positions;
        const mx = (p1.x + p2.x) / 2;
        const my = (p1.y + p2.y) / 2;
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        ctx.save();
        ctx.translate(mx, my);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.ellipse(0, 0, dist / 2 + pad, pad, 0, 0, 2 * Math.PI);
        ctx.fillStyle = color + (isHighlighted ? '18' : '08');
        ctx.fill();
        ctx.strokeStyle = color + (isHighlighted ? '40' : '18');
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      } else {
        // Expand points outward from centroid for padding
        const expanded: [number, number][] = positions.map((p) => {
          const dx = p.x - cx;
          const dy = p.y - cy;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          return [p.x + (dx / dist) * pad, p.y + (dy / dist) * pad] as [number, number];
        });

        const hull = d3.polygonHull(expanded);
        if (hull) {
          ctx.beginPath();
          ctx.moveTo(hull[0][0], hull[0][1]);
          for (let i = 1; i < hull.length; i++) {
            ctx.lineTo(hull[i][0], hull[i][1]);
          }
          ctx.closePath();
          ctx.fillStyle = color + (isHighlighted ? '18' : '08');
          ctx.fill();
          ctx.strokeStyle = color + (isHighlighted ? '40' : '18');
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // Org label — always visible, scales to remain readable
      // Font size: inversely proportional to zoom so it stays constant on screen
      const baseFontSize = positions.length >= 5 ? 14 : positions.length >= 3 ? 12 : 10;
      const fontSize = baseFontSize / globalScale;
      const minFontSize = 3; // Don't render if too tiny even for canvas
      
      if (fontSize >= minFontSize) {
        // Position label above the cluster
        const minY = Math.min(...positions.map((p) => p.y));
        const labelY = minY - pad - 5;

        ctx.font = `600 ${fontSize}px 'JetBrains Mono', 'Fira Code', monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = color + (isHighlighted ? 'aa' : '70');
        ctx.fillText(orgName, cx, labelY);
      }
    }
  }, [orgColorMap, orgNameMap, highlightOrgId]);

  // Custom node rendering
  const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const n = node as FGNode;
    const r = tierRadius[n.tier] || 5;
    const orgColor = n.organizationId ? orgColorMap.get(n.organizationId) : null;
    const color = orgColor || tierColor[n.tier] || '#555566';
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

    // Label — show at reasonable zoom or for highlighted/hovered nodes
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
  }, [highlightNodeId, highlightOrgId, egoNodeId, orgColorMap]);

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

    // Same-org edges get org color tint
    const sameOrg = src.organizationId && src.organizationId === tgt.organizationId;
    const orgColor = sameOrg ? orgColorMap.get(src.organizationId!) : null;

    let alpha = 0.08;
    let lineWidth = 0.5;
    let strokeColor = orgColor ? orgColor : 'rgb(0, 240, 255)';

    if (isConnectedToActive) {
      alpha = 0.6;
      lineWidth = link.strength === 'strong' ? 2 : link.strength === 'medium' ? 1.2 : 0.8;
    } else if (hovered || highlighted) {
      alpha = 0.03;
    } else if (sameOrg) {
      alpha = 0.15; // Intra-org edges slightly more visible
    }

    ctx.beginPath();
    ctx.moveTo(src.x, src.y);
    ctx.lineTo(tgt.x, tgt.y);
    ctx.strokeStyle = strokeColor;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }, [highlightNodeId, orgColorMap]);

  const handleNodeHover = useCallback((node: any) => {
    hoveredNodeRef.current = node ? (node as FGNode).id : null;
    onNodeHover?.(node as GraphNode | null);
  }, [onNodeHover]);

  const handleNodeClick = useCallback((node: any) => {
    onNodeClick?.(node as GraphNode);
  }, [onNodeClick]);

  // Configure forces after mount to spread leaf nodes and cluster orgs
  const handleEngineInit = useCallback((fg: any) => {
    // Charge: leaf nodes repel more, hub nodes less
    fg.d3Force('charge')?.strength((d: FGNode) => {
      const conns = connectionMap.get(d.id)?.size || 0;
      return conns <= 2 ? -120 : -40;
    });
    // Links: leaf nodes get longer links, intra-org links are shorter (pulls org members together)
    fg.d3Force('link')?.distance((link: any) => {
      const src = typeof link.source === 'string' ? link.source : link.source.id;
      const tgt = typeof link.target === 'string' ? link.target : link.target.id;
      const srcNode = nodesRef.current.find(n => n.id === src);
      const tgtNode = nodesRef.current.find(n => n.id === tgt);
      const srcConns = connectionMap.get(src)?.size || 0;
      const tgtConns = connectionMap.get(tgt)?.size || 0;
      const minConns = Math.min(srcConns, tgtConns);
      // Same org = tight cluster
      if (srcNode?.organizationId && srcNode.organizationId === tgtNode?.organizationId) {
        return 20;
      }
      return minConns <= 2 ? 100 : 40;
    });
  }, [connectionMap]);

  useEffect(() => {
    if (fgRef.current) {
      handleEngineInit(fgRef.current);
    }
  }, [handleEngineInit]);

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
      onRenderFramePre={onRenderFramePre}
      nodeLabel={() => ''}
      cooldownTicks={200}
      d3AlphaDecay={0.015}
      d3VelocityDecay={0.25}
      warmupTicks={100}
      enableNodeDrag={true}
      enableZoomInteraction={true}
      enablePanInteraction={true}
      onEngineStop={() => {}}
    />
  );
}
