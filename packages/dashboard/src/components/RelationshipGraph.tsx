import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
// ForceGraphMethods type unused due to complex generics; ref typed as any

// ── Color maps for relationship types ──

const ORG_TYPE_COLORS: Record<string, string> = {
  'customer-vendor': '#00f0ff',
  partnership: '#39ff14',
  'investor-portfolio': '#ff00e5',
  competitor: '#f87171',
  subsidiary: '#f0ff00',
  sponsor: '#aa44ff',
  member: '#00f0ff',
  other: '#888899',
};

const PERSON_TYPE_COLORS: Record<string, string> = {
  colleague: '#00f0ff',
  friend: '#39ff14',
  mentor: '#ff00e5',
  investor: '#f0ff00',
  advisor: '#aa44ff',
  introducer: '#00f0ff',
  partner: '#39ff14',
  client: '#f0ff00',
  'co-founder': '#ff00e5',
  other: '#888899',
};

// ── Types ──

// Extends NodeObject so react-force-graph-2d's runtime x/y/vx/vy are typed
export interface GraphNode {
  id: string;
  name: string;
  val: number; // node size
  color: string;
  subtitle?: string;
  // Added by react-force-graph-2d at runtime
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number;
  fy?: number;
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  type: string;
  color: string;
  notes?: string;
}

interface Props {
  nodes: GraphNode[];
  links: GraphLink[];
  width: number;
  height: number;
  typeColorMap: Record<string, string>;
  onNodeSelect?: (nodeId: string) => void;
}

// --- Orbit ---
const ORBIT_SPEED = 0.0003; // radians per tick — very slow

export default function RelationshipGraph({ nodes, links, width, height, typeColorMap, onNodeSelect }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fgRef = useRef<any>(undefined);
  const [highlightNodes, setHighlightNodes] = useState<Set<string>>(new Set());
  const [highlightLinks, setHighlightLinks] = useState<Set<string>>(new Set());
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Build adjacency map for highlight propagation
  const adjacency = useMemo(() => {
    const map = new Map<string, Set<string>>();
    const linkSet = new Map<string, Set<string>>(); // nodeId -> set of link keys
    for (const link of links) {
      const src = typeof link.source === 'object' ? (link.source as GraphNode).id : link.source;
      const tgt = typeof link.target === 'object' ? (link.target as GraphNode).id : link.target;
      if (!map.has(src)) map.set(src, new Set());
      if (!map.has(tgt)) map.set(tgt, new Set());
      map.get(src)!.add(tgt);
      map.get(tgt)!.add(src);

      const linkKey = `${src}->${tgt}`;
      if (!linkSet.has(src)) linkSet.set(src, new Set());
      if (!linkSet.has(tgt)) linkSet.set(tgt, new Set());
      linkSet.get(src)!.add(linkKey);
      linkSet.get(tgt)!.add(linkKey);
    }
    return { neighbors: map, linkKeys: linkSet };
  }, [links]);

  const graphData = useMemo(() => ({ nodes, links }), [nodes, links]);

  const handleNodeHover = useCallback(
    (node: GraphNode | null) => {
      if (!node) {
        setHighlightNodes(new Set());
        setHighlightLinks(new Set());
        setHoveredNode(null);
        return;
      }
      const nodeId = node.id;
      const neighbors = adjacency.neighbors.get(nodeId) || new Set();
      const newHighlightNodes = new Set<string>([nodeId, ...neighbors]);
      const newHighlightLinks = adjacency.linkKeys.get(nodeId) || new Set();
      setHighlightNodes(newHighlightNodes);
      setHighlightLinks(newHighlightLinks);
      setHoveredNode(nodeId);
    },
    [adjacency],
  );

  const handleNodeClick = useCallback(
    (node: GraphNode) => {
      if (onNodeSelect) onNodeSelect(node.id);
      // On click, toggle highlight (if already highlighted, clear; else highlight)
      if (hoveredNode === node.id) {
        setHighlightNodes(new Set());
        setHighlightLinks(new Set());
        setHoveredNode(null);
      } else {
        handleNodeHover(node);
      }
      // Center on node
      if (fgRef.current) {
        fgRef.current.centerAt(node.x, node.y, 400);
        fgRef.current.zoom(2, 400);
      }
    },
    [hoveredNode, handleNodeHover, onNodeSelect],
  );

  const handleBackgroundClick = useCallback(() => {
    setHighlightNodes(new Set());
    setHighlightLinks(new Set());
    setHoveredNode(null);
  }, []);

  // Custom node rendering
  const paintNode = useCallback(
    (node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const nodeId = node.id;
      const isHighlighted = highlightNodes.has(nodeId);
      const isHovered = hoveredNode === nodeId;
      const hasHighlight = highlightNodes.size > 0;
      const radius = Math.sqrt(node.val || 1) * 3;

      // Dimming logic
      const alpha = hasHighlight ? (isHighlighted ? 1.0 : 0.15) : 0.85;

      // Glow effect for hovered node
      if (isHovered) {
        ctx.beginPath();
        ctx.arc(node.x!, node.y!, radius + 4, 0, 2 * Math.PI);
        ctx.fillStyle = `${node.color}30`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(node.x!, node.y!, radius + 2, 0, 2 * Math.PI);
        ctx.strokeStyle = node.color;
        ctx.lineWidth = 1.5 / globalScale;
        ctx.stroke();
      }

      // Main circle
      ctx.beginPath();
      ctx.arc(node.x!, node.y!, radius, 0, 2 * Math.PI);
      ctx.fillStyle = alpha < 1 ? hexWithAlpha(node.color, alpha) : node.color;
      ctx.fill();

      // Label
      const fontSize = Math.max(10 / globalScale, 2);
      if (globalScale > 0.6 || isHighlighted) {
        ctx.font = `${isHovered ? 'bold ' : ''}${fontSize}px 'JetBrains Mono', 'Fira Code', monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = hasHighlight
          ? isHighlighted
            ? 'rgba(255,255,255,0.9)'
            : 'rgba(255,255,255,0.1)'
          : 'rgba(255,255,255,0.7)';
        ctx.fillText(node.name, node.x!, node.y! + radius + 2);

        // Subtitle
        if (node.subtitle && (isHovered || (globalScale > 1.5 && isHighlighted))) {
          ctx.font = `${fontSize * 0.8}px 'JetBrains Mono', 'Fira Code', monospace`;
          ctx.fillStyle = 'rgba(255,255,255,0.4)';
          ctx.fillText(node.subtitle, node.x!, node.y! + radius + 2 + fontSize * 1.1);
        }
      }
    },
    [highlightNodes, hoveredNode],
  );

  // Custom link rendering
  const paintLink = useCallback(
    (link: GraphLink, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const src = typeof link.source === 'object' ? (link.source as GraphNode) : null;
      const tgt = typeof link.target === 'object' ? (link.target as GraphNode) : null;
      if (!src || !tgt || src.x == null || tgt.x == null) return;

      const srcId = src.id;
      const tgtId = tgt.id;
      const linkKey = `${srcId}->${tgtId}`;
      const linkKeyR = `${tgtId}->${srcId}`;
      const isHighlighted = highlightLinks.has(linkKey) || highlightLinks.has(linkKeyR);
      const hasHighlight = highlightNodes.size > 0;

      const alpha = hasHighlight ? (isHighlighted ? 0.7 : 0.04) : 0.2;
      const lineWidth = isHighlighted ? 1.5 / globalScale : 0.5 / globalScale;

      ctx.beginPath();
      ctx.moveTo(src.x!, src.y!);
      ctx.lineTo(tgt.x!, tgt.y!);
      ctx.strokeStyle = hexWithAlpha(link.color, alpha);
      ctx.lineWidth = lineWidth;
      ctx.stroke();

      // Edge label when highlighted and zoomed in enough
      if (isHighlighted && globalScale > 1.2) {
        const mx = (src.x! + tgt.x!) / 2;
        const my = (src.y! + tgt.y!) / 2;
        const fontSize = Math.max(8 / globalScale, 2);
        ctx.font = `${fontSize}px 'JetBrains Mono', 'Fira Code', monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Background pill
        const text = link.type;
        const textW = ctx.measureText(text).width;
        ctx.fillStyle = 'rgba(10, 10, 15, 0.85)';
        const padX = 3 / globalScale;
        const padY = 2 / globalScale;
        ctx.fillRect(mx - textW / 2 - padX, my - fontSize / 2 - padY, textW + padX * 2, fontSize + padY * 2);

        ctx.fillStyle = hexWithAlpha(link.color, 0.8);
        ctx.fillText(text, mx, my);
      }
    },
    [highlightLinks, highlightNodes],
  );

  // Node pointer area for hit detection
  const nodePointerAreaPaint = useCallback(
    (node: GraphNode, color: string, ctx: CanvasRenderingContext2D) => {
      const radius = Math.sqrt(node.val || 1) * 3 + 4;
      ctx.beginPath();
      ctx.arc(node.x!, node.y!, radius, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
    },
    [],
  );

  // --- Orbit: after layout settles, add a gentle tangential velocity force ---
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!fgRef.current) return;

      // Layout is done. Add a weak orbit force alongside existing forces.
      // We keep charge/center/link so the structure holds — orbit is just
      // a gentle tangential nudge on top.
      fgRef.current.d3Force('orbit', () => {
        const gd = fgRef.current?.graphData();
        if (!gd?.nodes?.length) return;
        const ns = gd.nodes as GraphNode[];

        // Center of mass
        let cx = 0, cy = 0, count = 0;
        for (const n of ns) {
          if (n.x != null && n.y != null) { cx += n.x; cy += n.y; count++; }
        }
        if (count === 0) return;
        cx /= count; cy /= count;

        // Add tangential velocity (perpendicular to radius)
        for (const n of ns) {
          if (n.x != null && n.y != null) {
            n.vx! += -ORBIT_SPEED * (n.y! - cy);
            n.vy! += ORBIT_SPEED * (n.x! - cx);
          }
        }
      });
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  if (nodes.length === 0) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ width, height, backgroundColor: '#0a0a0f' }}
      >
        <p className="text-white/20">No relationships to display</p>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width, height }}>
      {/* Legend */}
      <div className="absolute top-3 left-3 z-10 glass rounded-lg px-3 py-2 border border-white/10">
        <div className="text-white/40 text-[10px] font-mono mb-1 uppercase tracking-wider">Type</div>
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {Object.entries(typeColorMap).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1">
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ backgroundColor: color }}
              />
              <span className="text-white/50 text-[10px] font-mono">{type}</span>
            </div>
          ))}
        </div>
      </div>

      <ForceGraph2D
        ref={fgRef}
        graphData={graphData}
        width={width}
        height={height}
        backgroundColor="#0a0a0f"
        nodeCanvasObject={paintNode}
        nodeCanvasObjectMode={() => 'replace'}
        nodePointerAreaPaint={nodePointerAreaPaint}
        linkCanvasObject={paintLink}
        linkCanvasObjectMode={() => 'replace'}
        onNodeHover={handleNodeHover}
        onNodeClick={handleNodeClick}
        onBackgroundClick={handleBackgroundClick}
        enableNodeDrag={true}
        cooldownTicks={Infinity}
        cooldownTime={Infinity}
        d3AlphaDecay={0}
        d3VelocityDecay={0.3}
        warmupTicks={50}
      />
    </div>
  );
}

// ── Helpers ──

function hexWithAlpha(hex: string, alpha: number): string {
  // Handle already-rgba
  if (hex.startsWith('rgba')) return hex;
  if (hex.startsWith('rgb(')) {
    return hex.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`);
  }
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ── Graph data builders ──

export function buildOrgGraphData(
  relationships: Array<{
    id: string;
    type: string;
    notes: string | null;
    orgA: { id: string; name: string; type: string };
    orgB: { id: string; name: string; type: string };
  }>,
) {
  const nodeMap = new Map<string, { id: string; name: string; type: string; connections: number }>();

  for (const rel of relationships) {
    if (!nodeMap.has(rel.orgA.id)) {
      nodeMap.set(rel.orgA.id, { ...rel.orgA, connections: 0 });
    }
    if (!nodeMap.has(rel.orgB.id)) {
      nodeMap.set(rel.orgB.id, { ...rel.orgB, connections: 0 });
    }
    nodeMap.get(rel.orgA.id)!.connections++;
    nodeMap.get(rel.orgB.id)!.connections++;
  }

  const nodes: GraphNode[] = Array.from(nodeMap.values()).map((n) => ({
    id: n.id,
    name: n.name,
    val: Math.max(1, n.connections),
    color: '#00f0ff',
    subtitle: n.type,
  }));

  const links: GraphLink[] = relationships.map((rel) => ({
    source: rel.orgA.id,
    target: rel.orgB.id,
    type: rel.type,
    color: ORG_TYPE_COLORS[rel.type] || ORG_TYPE_COLORS.other,
    notes: rel.notes || undefined,
  }));

  return { nodes, links, typeColorMap: ORG_TYPE_COLORS };
}

export function buildPersonGraphData(
  relationships: Array<{
    id: string;
    type: string;
    strength: number;
    notes: string | null;
    personA: { id: string; name: string; title: string | null; tier: number };
    personB: { id: string; name: string; title: string | null; tier: number };
  }>,
) {
  const nodeMap = new Map<
    string,
    { id: string; name: string; title: string | null; tier: number; connections: number }
  >();

  for (const rel of relationships) {
    if (!nodeMap.has(rel.personA.id)) {
      nodeMap.set(rel.personA.id, { ...rel.personA, connections: 0 });
    }
    if (!nodeMap.has(rel.personB.id)) {
      nodeMap.set(rel.personB.id, { ...rel.personB, connections: 0 });
    }
    nodeMap.get(rel.personA.id)!.connections++;
    nodeMap.get(rel.personB.id)!.connections++;
  }

  const nodes: GraphNode[] = Array.from(nodeMap.values()).map((n) => ({
    id: n.id,
    name: n.name,
    val: Math.max(1, n.connections),
    color: '#00f0ff',
    subtitle: n.title || undefined,
  }));

  const links: GraphLink[] = relationships.map((rel) => ({
    source: rel.personA.id,
    target: rel.personB.id,
    type: rel.type,
    color: PERSON_TYPE_COLORS[rel.type] || PERSON_TYPE_COLORS.other,
    notes: rel.notes || undefined,
  }));

  return { nodes, links, typeColorMap: PERSON_TYPE_COLORS };
}
