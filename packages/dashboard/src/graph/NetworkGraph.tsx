import { useEffect, useRef, useCallback, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
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
  onNodeHover?: (node: GraphNode | null) => void;
  highlightNodeId?: string | null;
  highlightOrgId?: string | null;
  egoNodeId?: string | null;
  onReady?: (api: GraphAPI) => void;
  simParams?: SimParams;
  frozen?: boolean;
  showLabels?: boolean;
  showEdges?: boolean;
  showHulls?: boolean;
  onFrozenChange?: (frozen: boolean) => void;
}

const tierRadius: Record<number, number> = { 1: 8, 2: 6.5, 3: 5, 4: 4, 5: 3 };
const tierColor: Record<number, string> = { 1: '#ff00e5', 2: '#00f0ff', 3: '#39ff14', 4: '#f0ff00', 5: '#555566' };

const ORG_COLORS = [
  '#ff00e5', '#00f0ff', '#39ff14', '#f0ff00', '#ff6600',
  '#aa44ff', '#00ff99', '#ff4466', '#44aaff', '#ffaa00',
  '#66ffcc', '#ff66aa', '#88ff44', '#ff8844', '#44ffdd',
  '#dd44ff', '#ffdd44', '#44ddff', '#ff4488', '#88ddff',
];

// Pre-parse hex color to rgba for fast string building
function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

interface FGNode extends GraphNode {
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  __connections?: Set<string>;
  __orgColorRgb?: [number, number, number];
  __color?: string;
}

interface FGLink {
  source: string | FGNode;
  target: string | FGNode;
  strength: string;
  context: string | null;
}

// Cached hull data to avoid recomputing every frame
interface OrgHullCache {
  orgId: string;
  hull: [number, number][] | null;
  cx: number;
  cy: number;
  minY: number;
  color: string;
  colorRgb: [number, number, number];
  name: string;
  count: number;
  // For 2-node orgs
  isEllipse?: boolean;
  mx?: number;
  my?: number;
  rx?: number;
  ry?: number;
  angle?: number;
}

export default function NetworkGraph({
  nodes, edges, groups, width, height, onNodeClick, onNodeHover,
  highlightNodeId, highlightOrgId, egoNodeId, onReady,
  simParams, frozen, showLabels, showEdges, showHulls, onFrozenChange,
}: Props) {
  const fgRef = useRef<any>(null);
  const hoveredNodeRef = useRef<string | null>(null);
  const nodesRef = useRef<FGNode[]>([]);
  const hullCacheRef = useRef<OrgHullCache[]>([]);
  const hullFrameCounter = useRef(0);

  // Build org color map
  const orgColorMap = useMemo(() => {
    const map = new Map<string, string>();
    groups.forEach((g, i) => map.set(g.id, ORG_COLORS[i % ORG_COLORS.length]));
    return map;
  }, [groups]);

  // Pre-compute RGB versions
  const orgColorRgbMap = useMemo(() => {
    const map = new Map<string, [number, number, number]>();
    for (const [id, hex] of orgColorMap) map.set(id, hexToRgb(hex));
    return map;
  }, [orgColorMap]);

  const orgNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of groups) map.set(g.id, g.name);
    return map;
  }, [groups]);

  // Connection lookup
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

  // Stable graph data
  const graphDataRef = useRef<{ nodes: FGNode[]; links: FGLink[] }>({ nodes: [], links: [] });
  const prevNodesRef = useRef<GraphNode[]>([]);
  const prevEdgesRef = useRef<GraphEdge[]>([]);

  if (nodes !== prevNodesRef.current || edges !== prevEdgesRef.current) {
    prevNodesRef.current = nodes;
    prevEdgesRef.current = edges;

    const fgNodes: FGNode[] = nodes.map((n) => {
      const orgHex = n.organizationId ? orgColorMap.get(n.organizationId) : null;
      return {
        ...n,
        __connections: connectionMap.get(n.id) || new Set(),
        __orgColorRgb: n.organizationId ? orgColorRgbMap.get(n.organizationId) : undefined,
        __color: orgHex || tierColor[n.tier] || '#555566',
      };
    });
    nodesRef.current = fgNodes;

    const fgLinks: FGLink[] = edges.map((e) => ({
      source: e.source, target: e.target, strength: e.strength, context: e.context,
    }));

    graphDataRef.current = { nodes: fgNodes, links: fgLinks };
    hullCacheRef.current = []; // invalidate hull cache
  }

  useEffect(() => {
    for (const n of nodesRef.current) {
      n.__connections = connectionMap.get(n.id) || new Set();
    }
  }, [connectionMap]);

  const graphData = graphDataRef.current;

  const panToNode = useCallback((nodeId: string) => {
    const fg = fgRef.current;
    if (!fg) return;
    const node = nodesRef.current.find((n) => n.id === nodeId);
    if (node?.x != null && node?.y != null) { fg.centerAt(node.x, node.y, 600); fg.zoom(2, 600); }
  }, []);

  const panToOrg = useCallback((orgId: string) => {
    const fg = fgRef.current;
    if (!fg) return;
    const orgNodes = nodesRef.current.filter((n) => n.organizationId === orgId);
    if (orgNodes.length === 0) return;
    const cx = orgNodes.reduce((s, n) => s + (n.x ?? 0), 0) / orgNodes.length;
    const cy = orgNodes.reduce((s, n) => s + (n.y ?? 0), 0) / orgNodes.length;
    fg.centerAt(cx, cy, 600); fg.zoom(1.5, 600);
  }, []);

  useEffect(() => { onReady?.({ panToNode, panToOrg }); }, [onReady, panToNode, panToOrg]);

  // Rebuild hull cache every 30 frames instead of every frame
  const rebuildHullCache = useCallback(() => {
    const orgPositions = new Map<string, { x: number; y: number }[]>();
    for (const n of nodesRef.current) {
      if (n.organizationId && n.x != null && n.y != null) {
        if (!orgPositions.has(n.organizationId)) orgPositions.set(n.organizationId, []);
        orgPositions.get(n.organizationId)!.push({ x: n.x, y: n.y });
      }
    }

    const hulls: OrgHullCache[] = [];
    for (const [orgId, positions] of orgPositions) {
      if (positions.length < 2) continue;

      const color = orgColorMap.get(orgId) || '#ffffff';
      const colorRgb = orgColorRgbMap.get(orgId) || [255, 255, 255] as [number, number, number];
      const name = orgNameMap.get(orgId) || '';
      const cx = positions.reduce((s, p) => s + p.x, 0) / positions.length;
      const cy = positions.reduce((s, p) => s + p.y, 0) / positions.length;
      const minY = Math.min(...positions.map(p => p.y));
      const pad = 30;

      if (positions.length === 2) {
        const [p1, p2] = positions;
        const mx = (p1.x + p2.x) / 2;
        const my = (p1.y + p2.y) / 2;
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        hulls.push({
          orgId, hull: null, cx, cy, minY, color, colorRgb, name, count: 2,
          isEllipse: true, mx, my, rx: dist / 2 + pad, ry: pad,
          angle: Math.atan2(dy, dx),
        });
      } else {
        const expanded: [number, number][] = positions.map((p) => {
          const dx = p.x - cx;
          const dy = p.y - cy;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          return [p.x + (dx / dist) * pad, p.y + (dy / dist) * pad];
        });
        const hull = d3.polygonHull(expanded);
        hulls.push({ orgId, hull, cx, cy, minY: minY - pad - 5, color, colorRgb, name, count: positions.length });
      }
    }
    hullCacheRef.current = hulls;
  }, [orgColorMap, orgColorRgbMap, orgNameMap]);

  // Draw org backgrounds from cache
  const onRenderFramePre = useCallback((ctx: CanvasRenderingContext2D, globalScale: number) => {
    // Skip hull drawing if showHulls is false
    if (showHulls === false) return;

    // Rebuild hull cache every 30 frames
    hullFrameCounter.current++;
    if (hullFrameCounter.current % 30 === 0 || hullCacheRef.current.length === 0) {
      rebuildHullCache();
    }

    // Only draw hulls for orgs with 3+ members when zoomed out (perf)
    const minMembers = globalScale < 0.5 ? 5 : globalScale < 0.8 ? 3 : 2;

    for (const h of hullCacheRef.current) {
      if (h.count < minMembers) continue;

      const [r, g, b] = h.colorRgb;
      const isHl = highlightOrgId === h.orgId;
      const fillAlpha = isHl ? 0.09 : 0.03;
      const strokeAlpha = isHl ? 0.25 : 0.1;

      if (h.isEllipse) {
        ctx.save();
        ctx.translate(h.mx!, h.my!);
        ctx.rotate(h.angle!);
        ctx.beginPath();
        ctx.ellipse(0, 0, h.rx!, h.ry!, 0, 0, 2 * Math.PI);
        ctx.fillStyle = `rgba(${r},${g},${b},${fillAlpha})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(${r},${g},${b},${strokeAlpha})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      } else if (h.hull) {
        ctx.beginPath();
        ctx.moveTo(h.hull[0][0], h.hull[0][1]);
        for (let i = 1; i < h.hull.length; i++) ctx.lineTo(h.hull[i][0], h.hull[i][1]);
        ctx.closePath();
        ctx.fillStyle = `rgba(${r},${g},${b},${fillAlpha})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(${r},${g},${b},${strokeAlpha})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Org label — scale inversely with zoom
      const baseFontSize = h.count >= 5 ? 14 : h.count >= 3 ? 12 : 10;
      const fontSize = baseFontSize / globalScale;
      if (fontSize >= 3) {
        ctx.font = `600 ${fontSize}px 'JetBrains Mono', 'Fira Code', monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = `rgba(${r},${g},${b},${isHl ? 0.7 : 0.45})`;
        ctx.fillText(h.name, h.cx, h.minY);
      }
    }
  }, [rebuildHullCache, highlightOrgId, showHulls]);

  // Node rendering — NO shadowBlur (that was the perf killer)
  const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const n = node as FGNode;
    const r = tierRadius[n.tier] || 5;
    const color = n.__color || '#555566';
    const x = n.x ?? 0;
    const y = n.y ?? 0;

    const hovered = hoveredNodeRef.current;
    const isHovered = hovered === n.id;
    const isHighlighted = highlightNodeId === n.id;
    const isEgoCenter = egoNodeId === n.id;
    const isConnectedToHovered = hovered ? (n.__connections?.has(hovered) || false) : false;
    const isConnectedToHighlight = highlightNodeId ? (n.__connections?.has(highlightNodeId) || false) : false;
    const isOrgHighlighted = highlightOrgId ? n.organizationId === highlightOrgId : false;
    const hasAnyHighlight = !!(highlightNodeId || highlightOrgId || hovered);

    let alpha = 0.7;
    let nodeR = r;

    if (hasAnyHighlight) {
      if (isHovered || isHighlighted || isEgoCenter) { alpha = 1; nodeR = r * 1.4; }
      else if (isConnectedToHovered || isConnectedToHighlight || isOrgHighlighted) { alpha = 0.85; }
      else { alpha = 0.12; }
    }

    // Soft glow — just a larger translucent circle, no shadowBlur
    if (alpha > 0.5 && (n.tier <= 2 || isHovered || isHighlighted || isEgoCenter)) {
      ctx.beginPath();
      ctx.arc(x, y, nodeR + 4, 0, 2 * Math.PI);
      ctx.fillStyle = color + '20';
      ctx.fill();
    }

    // Node circle
    ctx.beginPath();
    ctx.arc(x, y, nodeR, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = (isHighlighted || isEgoCenter) ? 2 : 0.8;
    ctx.stroke();

    // Label
    const showLabel = showLabels || globalScale > 1.2 || isHovered || isHighlighted || isEgoCenter || isConnectedToHovered || isConnectedToHighlight;
    if (showLabel) {
      const fontSize = Math.max(10 / globalScale, 2.5);
      ctx.font = `${fontSize}px 'JetBrains Mono', 'Fira Code', monospace`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = `rgba(255,255,255,${alpha * 0.9})`;
      ctx.fillText(n.name, x + nodeR + 3, y);
    }

    ctx.globalAlpha = 1;
  }, [highlightNodeId, highlightOrgId, egoNodeId, showLabels]);

  const nodePointerAreaPaint = useCallback((node: any, color: string, ctx: CanvasRenderingContext2D) => {
    const n = node as FGNode;
    ctx.beginPath();
    ctx.arc(n.x ?? 0, n.y ?? 0, (tierRadius[n.tier] || 5) + 4, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
  }, []);

  // Link rendering — simplified, no per-link Map lookups for org color
  const linkCanvasObject = useCallback((link: any, ctx: CanvasRenderingContext2D) => {
    if (showEdges === false) return;
    const src = link.source as FGNode;
    const tgt = link.target as FGNode;
    if (src.x == null || tgt.x == null) return;

    const hovered = hoveredNodeRef.current;
    const highlighted = highlightNodeId;
    const isActive = (hovered && (src.id === hovered || tgt.id === hovered)) ||
                     (highlighted && (src.id === highlighted || tgt.id === highlighted));

    if (!isActive && (hovered || highlighted)) {
      // Skip drawing dimmed edges entirely for perf — they're barely visible anyway
      return;
    }

    let alpha: number;
    let lw: number;

    if (isActive) {
      alpha = 0.5;
      lw = link.strength === 'strong' ? 2 : link.strength === 'medium' ? 1.2 : 0.8;
    } else {
      // Default: very faint
      alpha = 0.06;
      lw = 0.3;
    }

    ctx.beginPath();
    ctx.moveTo(src.x!, src.y!);
    ctx.lineTo(tgt.x!, tgt.y!);
    ctx.strokeStyle = `rgba(0,240,255,${alpha})`;
    ctx.lineWidth = lw;
    ctx.stroke();
  }, [highlightNodeId, showEdges]);

  // Hover — just update ref and notify parent. No animation pausing needed.
  const handleNodeHover = useCallback((node: any) => {
    const id = node ? (node as FGNode).id : null;
    if (hoveredNodeRef.current !== id) {
      hoveredNodeRef.current = id;
      onNodeHover?.(node as GraphNode | null);
    }
  }, [onNodeHover]);

  const handleNodeClick = useCallback((node: any) => {
    onNodeClick?.(node as GraphNode);
  }, [onNodeClick]);

  // Configure forces — use Map for O(1) lookups instead of .find()
  const nodeIdMap = useMemo(() => {
    const map = new Map<string, FGNode>();
    for (const n of nodesRef.current) map.set(n.id, n);
    return map;
  }, [nodes]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleEngineInit = useCallback((fg: any) => {
    fg.d3Force('charge')?.strength((d: FGNode) => {
      const conns = connectionMap.get(d.id)?.size || 0;
      return conns <= 2 ? -120 : -40;
    });
    fg.d3Force('link')?.distance((link: any) => {
      const srcId = typeof link.source === 'string' ? link.source : link.source.id;
      const tgtId = typeof link.target === 'string' ? link.target : link.target.id;
      const srcNode = nodeIdMap.get(srcId);
      const tgtNode = nodeIdMap.get(tgtId);
      if (srcNode?.organizationId && srcNode.organizationId === tgtNode?.organizationId) return 20;
      const minConns = Math.min(connectionMap.get(srcId)?.size || 0, connectionMap.get(tgtId)?.size || 0);
      return minConns <= 2 ? 100 : 40;
    });
  }, [connectionMap, nodeIdMap]);

  useEffect(() => { if (fgRef.current) handleEngineInit(fgRef.current); }, [handleEngineInit]);

  // Apply simParams to forces when they change
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg || !simParams) return;

    const charge = fg.d3Force('charge');
    if (charge) {
      charge.strength((d: FGNode) => {
        const conns = connectionMap.get(d.id)?.size || 0;
        // Scale base charge by the simParams.charge ratio vs default -80
        const scale = simParams.charge / -80;
        return (conns <= 2 ? -120 : -40) * scale;
      });
    }

    const link = fg.d3Force('link');
    if (link) {
      link.distance((l: any) => {
        const srcId = typeof l.source === 'string' ? l.source : l.source.id;
        const tgtId = typeof l.target === 'string' ? l.target : l.target.id;
        const srcNode = nodeIdMap.get(srcId);
        const tgtNode = nodeIdMap.get(tgtId);
        if (srcNode?.organizationId && srcNode.organizationId === tgtNode?.organizationId) {
          return simParams.clusterTightness;
        }
        const minConns = Math.min(connectionMap.get(srcId)?.size || 0, connectionMap.get(tgtId)?.size || 0);
        return minConns <= 2 ? simParams.linkDistance * 2.5 : simParams.linkDistance;
      });
    }

    const collide = fg.d3Force('collide');
    if (collide) {
      collide.radius(simParams.collisionRadius);
    } else {
      fg.d3Force('collide', d3.forceCollide(simParams.collisionRadius));
    }

    fg.d3ReheatSimulation();
  }, [simParams, connectionMap, nodeIdMap]);

  // Handle freeze/unfreeze — stop simulation forces but keep canvas interactive
  const frozenRef = useRef(false);
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    if (frozen && !frozenRef.current) {
      // Freeze: pin all nodes in place and stop simulation ticks.
      // Do NOT set any d3Force to null — that destroys forces and blacks out the canvas.
      // Instead, pin nodes with fx/fy and set cooldownTicks to 0 so the simulation
      // stops iterating while the canvas render loop stays alive for zoom/pan/click.
      const nodes = fg.graphData()?.nodes || [];
      for (const n of nodes) {
        (n as any).vx = 0;
        (n as any).vy = 0;
        (n as any).fx = (n as any).x;
        (n as any).fy = (n as any).y;
      }
      fg.cooldownTicks(0);
      frozenRef.current = true;
    } else if (!frozen && frozenRef.current) {
      // Unfreeze: unpin all nodes and restore simulation
      const nodes = fg.graphData()?.nodes || [];
      for (const n of nodes) {
        (n as any).fx = undefined;
        (n as any).fy = undefined;
      }
      // Restore cooldown and reheat the simulation
      fg.cooldownTicks(100);
      fg.d3ReheatSimulation();
      frozenRef.current = false;
    }
  }, [frozen, handleEngineInit, simParams]);

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
      cooldownTicks={100}
      d3AlphaDecay={0.04}
      d3VelocityDecay={0.4}
      warmupTicks={80}
      d3AlphaMin={0.001}
      enableNodeDrag={true}
      enableZoomInteraction={true}
      enablePanInteraction={true}
    />
  );
}
