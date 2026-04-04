import { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import Graph from 'graphology';
import Sigma from 'sigma';
import * as d3 from 'd3';
import type { GraphNode, GraphEdge, GraphGroup } from '@mycelio/shared';
import type { SimParams } from './GraphSimControls.js';
import type { Coordinates } from 'sigma/types';
import { EdgeClampedProgram } from 'sigma/rendering';

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

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

/** Catmull-Rom spline through convex hull points for smooth org boundaries */
function catmullRomSpline(points: [number, number][], tension = 0.5, segments = 8): [number, number][] {
  if (points.length < 3) return points;
  const result: [number, number][] = [];
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];

    for (let t = 0; t < segments; t++) {
      const s = t / segments;
      const s2 = s * s;
      const s3 = s2 * s;

      const x = 0.5 * (
        (2 * p1[0]) +
        (-p0[0] + p2[0]) * s * tension +
        (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * s2 * tension +
        (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * s3 * tension
      );
      const y = 0.5 * (
        (2 * p1[1]) +
        (-p0[1] + p2[1]) * s * tension +
        (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * s2 * tension +
        (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * s3 * tension
      );
      result.push([x, y]);
    }
  }
  return result;
}

interface OrgHullCache {
  orgId: string;
  hull: [number, number][] | null;
  smoothHull: [number, number][] | null;
  cx: number;
  cy: number;
  minY: number;
  color: string;
  colorRgb: [number, number, number];
  name: string;
  count: number;
  isEllipse?: boolean;
  mx?: number;
  my?: number;
  rx?: number;
  ry?: number;
  angle?: number;
}

// Store node data for lookups
interface NodeData {
  graphNode: GraphNode;
  color: string;
  orgColorRgb?: [number, number, number];
  connections: Set<string>;
}

export default function NetworkGraph({
  nodes, edges, groups, width, height, onNodeClick, onNodeHover,
  highlightNodeId, highlightOrgId, egoNodeId, onReady,
  simParams, frozen, showLabels, showEdges, showHulls, onFrozenChange,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sigmaRef = useRef<Sigma | null>(null);
  const graphRef = useRef<Graph | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const hoveredNodeRef = useRef<string | null>(null);
  const hullCacheRef = useRef<OrgHullCache[]>([]);
  const hullFrameCounter = useRef(0);
  const nodeDataMapRef = useRef<Map<string, NodeData>>(new Map());
  const canvasLayerRef = useRef<HTMLCanvasElement | null>(null);
  const draggedNodeRef = useRef<string | null>(null);
  const prevDataKeyRef = useRef<string>('');
  const [minimapVisible] = useState(true);
  const minimapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const minimapFrameRef = useRef(0);

  // --- Orbital rotation state ---
  const orbitAngleRef = useRef(0);
  const orbitAnimFrameRef = useRef<number | null>(null);
  const orbitLastTimeRef = useRef<number>(0);
  const orbitPausedRef = useRef(false);
  const orbitResumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Full rotation period in ms (75 seconds)
  const ORBIT_PERIOD_MS = 75000;
  const ORBIT_RESUME_DELAY_MS = 2500;
  
  // Refs for values used inside sigma reducers (closures won't re-capture on prop changes)
  const highlightNodeIdRef = useRef(highlightNodeId);
  highlightNodeIdRef.current = highlightNodeId;
  const highlightOrgIdRef = useRef(highlightOrgId);
  highlightOrgIdRef.current = highlightOrgId;
  const egoNodeIdRef = useRef(egoNodeId);
  egoNodeIdRef.current = egoNodeId;
  const showLabelsRef = useRef(showLabels);
  showLabelsRef.current = showLabels;
  const showEdgesRef = useRef(showEdges);
  showEdgesRef.current = showEdges;
  const showHullsRef = useRef(showHulls);
  showHullsRef.current = showHulls;

  // Build org color map
  const orgColorMap = useMemo(() => {
    const map = new Map<string, string>();
    groups.forEach((g, i) => map.set(g.id, ORG_COLORS[i % ORG_COLORS.length]));
    return map;
  }, [groups]);

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

  // Pan to node
  const panToNode = useCallback((nodeId: string) => {
    const sigma = sigmaRef.current;
    const graph = graphRef.current;
    if (!sigma || !graph || !graph.hasNode(nodeId)) return;
    const attrs = graph.getNodeAttributes(nodeId);
    const camera = sigma.getCamera();
    camera.animate({ x: attrs.x, y: attrs.y, ratio: 0.5 }, { duration: 600 });
  }, []);

  const panToOrg = useCallback((orgId: string) => {
    const sigma = sigmaRef.current;
    const graph = graphRef.current;
    if (!sigma || !graph) return;
    let cx = 0, cy = 0, count = 0;
    graph.forEachNode((id, attrs) => {
      const nd = nodeDataMapRef.current.get(id);
      if (nd?.graphNode.organizationId === orgId) {
        cx += attrs.x; cy += attrs.y; count++;
      }
    });
    if (count > 0) {
      const camera = sigma.getCamera();
      camera.animate({ x: cx / count, y: cy / count, ratio: 0.7 }, { duration: 600 });
    }
  }, []);

  useEffect(() => { onReady?.({ panToNode, panToOrg }); }, [onReady, panToNode, panToOrg]);

  // Build hull cache
  const rebuildHullCache = useCallback(() => {
    const graph = graphRef.current;
    if (!graph) return;

    const orgPositions = new Map<string, { x: number; y: number }[]>();
    graph.forEachNode((id, attrs) => {
      const nd = nodeDataMapRef.current.get(id);
      if (nd?.graphNode.organizationId && attrs.x != null && attrs.y != null) {
        const orgId = nd.graphNode.organizationId;
        if (!orgPositions.has(orgId)) orgPositions.set(orgId, []);
        orgPositions.get(orgId)!.push({ x: attrs.x, y: attrs.y });
      }
    });

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
          orgId, hull: null, smoothHull: null, cx, cy, minY, color, colorRgb, name, count: 2,
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
        const smoothHull = hull && hull.length >= 3 ? catmullRomSpline(hull, 1.0, 6) : hull;
        hulls.push({ orgId, hull, smoothHull, cx, cy, minY: minY - pad - 5, color, colorRgb, name, count: positions.length });
      }
    }
    hullCacheRef.current = hulls;
  }, [orgColorMap, orgColorRgbMap, orgNameMap]);

  // Draw hulls on canvas overlay
  const drawHulls = useCallback((ctx: CanvasRenderingContext2D, sigmaInstance: Sigma) => {
    if (showHullsRef.current === false) return;

    hullFrameCounter.current++;
    if (hullFrameCounter.current % 30 === 0 || hullCacheRef.current.length === 0) {
      rebuildHullCache();
    }

    const camera = sigmaInstance.getCamera();
    const ratio = camera.ratio;
    const minMembers = ratio > 2 ? 5 : ratio > 1.25 ? 3 : 2;

    for (const h of hullCacheRef.current) {
      if (h.count < minMembers) continue;

      const [r, g, b] = h.colorRgb;
      const isHl = highlightOrgIdRef.current === h.orgId;
      const fillAlpha = isHl ? 0.09 : 0.03;
      const strokeAlpha = isHl ? 0.25 : 0.1;

      if (h.isEllipse) {
        // Convert graph coords to viewport coords
        const center = sigmaInstance.graphToViewport({ x: h.mx!, y: h.my! } as Coordinates);
        const edgePoint = sigmaInstance.graphToViewport({ x: h.mx! + h.rx!, y: h.my! + h.ry! } as Coordinates);
        const rxScreen = Math.abs(edgePoint.x - center.x);
        const ryScreen = Math.abs(edgePoint.y - center.y);

        ctx.save();
        ctx.translate(center.x, center.y);
        ctx.rotate(h.angle!);
        ctx.beginPath();
        ctx.ellipse(0, 0, rxScreen, ryScreen, 0, 0, 2 * Math.PI);
        ctx.fillStyle = `rgba(${r},${g},${b},${fillAlpha})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(${r},${g},${b},${strokeAlpha})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      } else if (h.smoothHull) {
        const points = h.smoothHull;
        ctx.beginPath();
        const first = sigmaInstance.graphToViewport({ x: points[0][0], y: points[0][1] } as Coordinates);
        ctx.moveTo(first.x, first.y);
        for (let i = 1; i < points.length; i++) {
          const p = sigmaInstance.graphToViewport({ x: points[i][0], y: points[i][1] } as Coordinates);
          ctx.lineTo(p.x, p.y);
        }
        ctx.closePath();
        ctx.fillStyle = `rgba(${r},${g},${b},${fillAlpha})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(${r},${g},${b},${strokeAlpha})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Org label
      const baseFontSize = h.count >= 5 ? 14 : h.count >= 3 ? 12 : 10;
      const fontSize = baseFontSize / ratio;
      if (fontSize >= 3 && fontSize < 60) {
        const labelPos = sigmaInstance.graphToViewport({ x: h.cx, y: h.minY } as Coordinates);
        ctx.font = `600 ${Math.max(8, Math.min(fontSize, 24))}px 'JetBrains Mono', 'Fira Code', monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = `rgba(${r},${g},${b},${isHl ? 0.7 : 0.45})`;
        ctx.fillText(h.name, labelPos.x, labelPos.y);
      }
    }
  }, [rebuildHullCache]);

  // Draw minimap
  const drawMinimap = useCallback(() => {
    const sigma = sigmaRef.current;
    const graph = graphRef.current;
    const canvas = minimapCanvasRef.current;
    if (!sigma || !graph || !canvas || !minimapVisible) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const mw = canvas.width;
    const mh = canvas.height;

    ctx.clearRect(0, 0, mw, mh);
    ctx.fillStyle = 'rgba(10, 10, 15, 0.85)';
    ctx.fillRect(0, 0, mw, mh);

    // Border
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, mw, mh);

    // Compute graph bounding box
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    graph.forEachNode((_, attrs) => {
      if (attrs.x < minX) minX = attrs.x;
      if (attrs.x > maxX) maxX = attrs.x;
      if (attrs.y < minY) minY = attrs.y;
      if (attrs.y > maxY) maxY = attrs.y;
    });

    if (!isFinite(minX)) return;

    const padX = (maxX - minX) * 0.1 || 50;
    const padY = (maxY - minY) * 0.1 || 50;
    minX -= padX; maxX += padX; minY -= padY; maxY += padY;
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;

    const toMini = (x: number, y: number): [number, number] => [
      ((x - minX) / rangeX) * mw,
      ((y - minY) / rangeY) * mh,
    ];

    // Draw edges faintly
    graph.forEachEdge((_, attrs, src, tgt, srcAttrs, tgtAttrs) => {
      const [x1, y1] = toMini(srcAttrs.x, srcAttrs.y);
      const [x2, y2] = toMini(tgtAttrs.x, tgtAttrs.y);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.04)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    });

    // Draw nodes
    graph.forEachNode((id, attrs) => {
      const nd = nodeDataMapRef.current.get(id);
      const [mx, my] = toMini(attrs.x, attrs.y);
      ctx.beginPath();
      ctx.arc(mx, my, 1.5, 0, 2 * Math.PI);
      ctx.fillStyle = nd?.color || '#555566';
      ctx.fill();
    });

    // Draw viewport rectangle
    // Get the viewport corners in graph coordinates
    const topLeft = sigma.viewportToGraph({ x: 0, y: 0 });
    const bottomRight = sigma.viewportToGraph({ x: width, y: height });

    const [vx1, vy1] = toMini(topLeft.x, topLeft.y);
    const [vx2, vy2] = toMini(bottomRight.x, bottomRight.y);

    ctx.strokeStyle = 'rgba(0, 240, 255, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(
      Math.min(vx1, vx2),
      Math.min(vy1, vy2),
      Math.abs(vx2 - vx1),
      Math.abs(vy2 - vy1)
    );
  }, [width, height, minimapVisible]);

  // Initialize sigma + worker
  useEffect(() => {
    const container = containerRef.current;
    if (!container || width <= 0 || height <= 0) return;

    // Data key to detect changes
    const dataKey = `${nodes.length}-${edges.length}-${nodes.map(n => n.id).join(',')}`;
    const isNewData = dataKey !== prevDataKeyRef.current;
    prevDataKeyRef.current = dataKey;

    // Create/update graphology graph
    let graph = graphRef.current;
    if (!graph || isNewData) {
      graph = new Graph();
      graphRef.current = graph;

      const nodeDataMap = new Map<string, NodeData>();
      
      for (const n of nodes) {
        const orgHex = n.organizationId ? orgColorMap.get(n.organizationId) : null;
        const color = orgHex || tierColor[n.tier] || '#555566';
        const connections = connectionMap.get(n.id) || new Set();
        
        nodeDataMap.set(n.id, {
          graphNode: n,
          color,
          orgColorRgb: n.organizationId ? orgColorRgbMap.get(n.organizationId) : undefined,
          connections,
        });

        graph.addNode(n.id, {
          x: Math.random() * 1000 - 500,
          y: Math.random() * 1000 - 500,
          size: tierRadius[n.tier] || 5,
          color,
          label: n.name,
        });
      }

      for (const e of edges) {
        if (graph.hasNode(e.source) && graph.hasNode(e.target)) {
          try {
            graph.addEdge(e.source, e.target, {
              strength: e.strength,
              context: e.context,
              color: 'rgba(0, 240, 255, 0.06)',
              size: 0.3,
              type: 'curved',
            });
          } catch {
            // Skip duplicate edges
          }
        }
      }

      nodeDataMapRef.current = nodeDataMap;
    }

    // Create sigma instance if needed
    let sigma = sigmaRef.current;
    if (!sigma) {
      // Create canvas overlay for hulls
      const hullCanvas = document.createElement('canvas');
      hullCanvas.width = width;
      hullCanvas.height = height;
      hullCanvas.style.position = 'absolute';
      hullCanvas.style.top = '0';
      hullCanvas.style.left = '0';
      hullCanvas.style.pointerEvents = 'none';
      hullCanvas.style.zIndex = '5';
      container.style.position = 'relative';
      canvasLayerRef.current = hullCanvas;

      // Create minimap canvas
      const minimapCanvas = document.createElement('canvas');
      minimapCanvas.width = 180;
      minimapCanvas.height = 120;
      minimapCanvas.style.position = 'absolute';
      minimapCanvas.style.bottom = '12px';
      minimapCanvas.style.right = '12px';
      minimapCanvas.style.zIndex = '10';
      minimapCanvas.style.borderRadius = '8px';
      minimapCanvas.style.pointerEvents = 'none';
      minimapCanvasRef.current = minimapCanvas;

      sigma = new Sigma(graph, container, {
        allowInvalidContainer: true,
        defaultEdgeType: 'curved',
        edgeProgramClasses: {
          curved: EdgeClampedProgram,
        },
        renderLabels: true,
        labelFont: "'JetBrains Mono', 'Fira Code', monospace",
        labelSize: 10,
        labelWeight: '400',
        labelColor: { color: 'rgba(255, 255, 255, 0.8)' },
        labelDensity: 0.5,
        labelGridCellSize: 100,
        labelRenderedSizeThreshold: 4,
        defaultNodeColor: '#555566',
        defaultEdgeColor: 'rgba(0, 240, 255, 0.06)',
        minEdgeThickness: 0.3,
        // Custom hover drawing for cyberpunk glow
        defaultDrawNodeHover: (context, data, settings) => {
          const size = data.size || 5;
          // Outer glow ring
          context.beginPath();
          context.arc(data.x, data.y, size + 6, 0, 2 * Math.PI);
          context.fillStyle = data.color + '20';
          context.fill();
          // Inner ring
          context.beginPath();
          context.arc(data.x, data.y, size + 3, 0, 2 * Math.PI);
          context.strokeStyle = data.color;
          context.lineWidth = 1.5;
          context.stroke();
          // Label background
          if (data.label) {
            const fontSize = settings.labelSize || 10;
            context.font = `${fontSize}px ${settings.labelFont}`;
            const textWidth = context.measureText(data.label).width;
            context.fillStyle = 'rgba(10, 10, 15, 0.85)';
            const padding = 4;
            context.fillRect(
              data.x + size + 3 - padding,
              data.y - fontSize / 2 - padding,
              textWidth + padding * 2,
              fontSize + padding * 2
            );
            context.fillStyle = 'rgba(255, 255, 255, 0.9)';
            context.fillText(data.label, data.x + size + 3, data.y + fontSize / 3);
          }
        },
        stagePadding: 30,
        zoomingRatio: 1.5,
        itemSizesReference: 'positions',
        autoRescale: false,
        autoCenter: false,
        // Node reducer for highlighting / LOD
        nodeReducer: (nodeId: string, data: Record<string, unknown>) => {
          const nd = nodeDataMapRef.current.get(nodeId);
          const hovered = hoveredNodeRef.current;
          const highlighted = highlightNodeIdRef.current;
          const highlightOrg = highlightOrgIdRef.current;
          const egoCenter = egoNodeIdRef.current;
          const camera = sigmaRef.current?.getCamera();
          const ratio = camera?.ratio || 1;

          const isHovered = hovered === nodeId;
          const isHighlighted = highlighted === nodeId;
          const isEgoCenter = egoCenter === nodeId;
          const isConnectedToHovered = hovered ? (nd?.connections.has(hovered) || false) : false;
          const isConnectedToHighlight = highlighted ? (nd?.connections.has(highlighted) || false) : false;
          const isOrgHighlighted = highlightOrg ? nd?.graphNode.organizationId === highlightOrg : false;
          const hasAnyHighlight = !!(highlighted || highlightOrg || hovered);

          let alpha = 0.7;
          let size = (data.size as number) || 5;

          if (hasAnyHighlight) {
            if (isHovered || isHighlighted || isEgoCenter) { alpha = 1; size *= 1.4; }
            else if (isConnectedToHovered || isConnectedToHighlight || isOrgHighlighted) { alpha = 0.85; }
            else { alpha = 0.12; }
          }

          // LOD: hide labels when zoomed out
          const tier = nd?.graphNode.tier || 5;
          let showLabel = showLabelsRef.current || isHovered || isHighlighted || isEgoCenter || isConnectedToHovered || isConnectedToHighlight;
          if (!showLabel) {
            if (ratio < 0.5) showLabel = tier <= 1;
            else if (ratio < 1.0) showLabel = tier <= 2;
            else showLabel = true;
          }

          const color = nd?.color || '#555566';
          const [r, g, b] = hexToRgb(color);

          return {
            ...data,
            size,
            color: `rgba(${r}, ${g}, ${b}, ${alpha})`,
            label: showLabel ? (data.label as string) : '',
            forceLabel: isHovered || isHighlighted || isEgoCenter,
            zIndex: isHovered || isHighlighted || isEgoCenter ? 2 : isConnectedToHovered || isConnectedToHighlight ? 1 : 0,
          };
        },
        // Edge reducer for highlighting
        edgeReducer: (edgeId: string, data: Record<string, unknown>) => {
          if (showEdgesRef.current === false) {
            return { ...data, hidden: true };
          }

          const graph = graphRef.current;
          if (!graph) return data;

          const src = graph.source(edgeId);
          const tgt = graph.target(edgeId);
          const hovered = hoveredNodeRef.current;
          const highlighted = highlightNodeIdRef.current;

          const isActive = (hovered && (src === hovered || tgt === hovered)) ||
                          (highlighted && (src === highlighted || tgt === highlighted));

          if (!isActive && (hovered || highlighted)) {
            return { ...data, hidden: true };
          }

          const strength = data.strength as string;
          if (isActive) {
            return {
              ...data,
              color: 'rgba(0, 240, 255, 0.5)',
              size: strength === 'strong' ? 2 : strength === 'medium' ? 1.2 : 0.8,
            };
          }

          return data;
        },
        zIndex: true,
      });

      container.appendChild(hullCanvas);
      container.appendChild(minimapCanvas);
      sigmaRef.current = sigma;

      // Event handlers
      sigma.on('enterNode', ({ node }) => {
        hoveredNodeRef.current = node;
        const nd = nodeDataMapRef.current.get(node);
        onNodeHover?.(nd?.graphNode || null);
        sigma!.refresh();
      });

      sigma.on('leaveNode', () => {
        hoveredNodeRef.current = null;
        onNodeHover?.(null);
        sigma!.refresh();
      });

      sigma.on('clickNode', ({ node }) => {
        const nd = nodeDataMapRef.current.get(node);
        if (nd) onNodeClick?.(nd.graphNode);
      });

      // Drag support
      sigma.on('downNode', ({ node, event }) => {
        draggedNodeRef.current = node;
        workerRef.current?.postMessage({
          type: 'dragStart',
          nodeId: node,
          x: graph!.getNodeAttribute(node, 'x'),
          y: graph!.getNodeAttribute(node, 'y'),
        });
        // Prevent camera from moving during drag
        sigma!.getCamera().disable();
      });

      sigma.getMouseCaptor().on('mousemovebody', (e) => {
        if (!draggedNodeRef.current || !sigma || !graph) return;
        const pos = sigma.viewportToGraph(e);
        graph.setNodeAttribute(draggedNodeRef.current, 'x', pos.x);
        graph.setNodeAttribute(draggedNodeRef.current, 'y', pos.y);
        workerRef.current?.postMessage({
          type: 'dragMove',
          nodeId: draggedNodeRef.current,
          x: pos.x,
          y: pos.y,
        });
      });

      sigma.getMouseCaptor().on('mouseup', () => {
        if (draggedNodeRef.current) {
          workerRef.current?.postMessage({
            type: 'dragEnd',
            nodeId: draggedNodeRef.current,
          });
          draggedNodeRef.current = null;
          sigma!.getCamera().enable();
        }
      });

      // Render hooks for hull overlay + minimap
      sigma.on('afterRender', () => {
        const hullCtx = canvasLayerRef.current?.getContext('2d');
        if (hullCtx && canvasLayerRef.current) {
          hullCtx.clearRect(0, 0, canvasLayerRef.current.width, canvasLayerRef.current.height);
          drawHulls(hullCtx, sigma!);
        }

        minimapFrameRef.current++;
        if (minimapFrameRef.current % 5 === 0) {
          drawMinimap();
        }
      });
    } else if (isNewData) {
      // Update sigma with new graph
      sigma.setGraph(graph);
    }

    // Initialize or restart web worker for force simulation
    if (isNewData) {
      if (workerRef.current) {
        workerRef.current.postMessage({ type: 'stop' });
        workerRef.current.terminate();
      }

      const worker = new Worker(
        new URL('./forceWorker.ts', import.meta.url),
        { type: 'module' }
      );

      worker.onmessage = (e) => {
        const msg = e.data;
        if (msg.type === 'positions') {
          const g = graphRef.current;
          if (!g) return;
          for (const pos of msg.positions) {
            if (g.hasNode(pos.id) && draggedNodeRef.current !== pos.id) {
              g.setNodeAttribute(pos.id, 'x', pos.x);
              g.setNodeAttribute(pos.id, 'y', pos.y);
            }
          }
          // Invalidate hull cache periodically
          hullCacheRef.current = [];
        }
      };

      const connCounts: Record<string, number> = {};
      for (const [id, conns] of connectionMap) {
        connCounts[id] = conns.size;
      }

      worker.postMessage({
        type: 'init',
        nodes: nodes.map(n => ({
          id: n.id,
          tier: n.tier,
          organizationId: n.organizationId,
        })),
        links: edges.filter(e => 
          graph.hasNode(e.source) && graph.hasNode(e.target)
        ).map(e => ({
          source: e.source,
          target: e.target,
          strength: e.strength,
        })),
        connectionCounts: connCounts,
        params: simParams || { linkDistance: 40, charge: -80, clusterTightness: 20, collisionRadius: 12 },
      });

      workerRef.current = worker;
    }

    // Cleanup
    return () => {
      // Don't clean up on every render, only on unmount
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, width, height]);

  // Full cleanup on unmount
  useEffect(() => {
    return () => {
      workerRef.current?.postMessage({ type: 'stop' });
      workerRef.current?.terminate();
      workerRef.current = null;
      sigmaRef.current?.kill();
      sigmaRef.current = null;
      graphRef.current = null;
      canvasLayerRef.current?.remove();
      minimapCanvasRef.current?.remove();
      // Clean up orbit animation
      if (orbitAnimFrameRef.current != null) {
        cancelAnimationFrame(orbitAnimFrameRef.current);
        orbitAnimFrameRef.current = null;
      }
      if (orbitResumeTimerRef.current != null) {
        clearTimeout(orbitResumeTimerRef.current);
        orbitResumeTimerRef.current = null;
      }
    };
  }, []);

  // --- Orbital rotation effect ---
  // Slowly rotates the Sigma camera angle around the graph center like a galaxy.
  // Pauses on user interaction, resumes after ORBIT_RESUME_DELAY_MS of inactivity.
  useEffect(() => {
    const sigma = sigmaRef.current;
    if (!sigma) return;

    // Pause orbit on any user interaction
    const pauseOrbit = () => {
      orbitPausedRef.current = true;
      // Clear any pending resume timer
      if (orbitResumeTimerRef.current != null) {
        clearTimeout(orbitResumeTimerRef.current);
        orbitResumeTimerRef.current = null;
      }
    };

    // Schedule orbit resume after delay
    const scheduleResume = () => {
      if (orbitResumeTimerRef.current != null) {
        clearTimeout(orbitResumeTimerRef.current);
      }
      orbitResumeTimerRef.current = setTimeout(() => {
        orbitPausedRef.current = false;
        orbitLastTimeRef.current = 0; // reset so we don't get a jump
        orbitResumeTimerRef.current = null;
      }, ORBIT_RESUME_DELAY_MS);
    };

    // Interaction handlers that pause orbit (accept any args for sigma event compatibility)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onInteractionStart = (..._args: any[]) => { pauseOrbit(); };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onInteractionEnd = (..._args: any[]) => { scheduleResume(); };

    // Listen to sigma camera events for zoom/pan
    const camera = sigma.getCamera();
    const mouseCaptor = sigma.getMouseCaptor();
    const touchCaptor = sigma.getTouchCaptor();

    // Named handlers for clean removal (accept any args for sigma event compatibility)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onWheel = (..._args: any[]) => { pauseOrbit(); scheduleResume(); };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onLeaveNode = (..._args: any[]) => { scheduleResume(); };

    // Sigma mouse captor events for detecting user interaction
    mouseCaptor.on('mousedown', onInteractionStart);
    mouseCaptor.on('mouseup', onInteractionEnd);
    mouseCaptor.on('wheel', onWheel);
    touchCaptor.on('touchdown', onInteractionStart);
    touchCaptor.on('touchup', onInteractionEnd);

    // Also pause on node hover
    sigma.on('enterNode', onInteractionStart);
    sigma.on('leaveNode', onLeaveNode);

    // The animation loop
    const orbitTick = (timestamp: number) => {
      orbitAnimFrameRef.current = requestAnimationFrame(orbitTick);

      if (orbitPausedRef.current || !sigmaRef.current) return;

      // Initialize timing
      if (orbitLastTimeRef.current === 0) {
        orbitLastTimeRef.current = timestamp;
        return;
      }

      const dt = timestamp - orbitLastTimeRef.current;
      orbitLastTimeRef.current = timestamp;

      // Calculate angular velocity: one full rotation (2*PI) in ORBIT_PERIOD_MS
      const angularVelocity = (2 * Math.PI) / ORBIT_PERIOD_MS;
      orbitAngleRef.current += angularVelocity * dt;

      // Wrap angle to avoid growing indefinitely
      if (orbitAngleRef.current > 2 * Math.PI) {
        orbitAngleRef.current -= 2 * Math.PI;
      }

      // Apply the angle to the camera without triggering user-initiated events
      const cam = sigmaRef.current.getCamera();
      cam.setState({ angle: orbitAngleRef.current });
    };

    // Sync initial angle from camera (in case it has an existing angle)
    orbitAngleRef.current = camera.angle || 0;
    orbitLastTimeRef.current = 0;
    orbitPausedRef.current = false;
    orbitAnimFrameRef.current = requestAnimationFrame(orbitTick);

    return () => {
      if (orbitAnimFrameRef.current != null) {
        cancelAnimationFrame(orbitAnimFrameRef.current);
        orbitAnimFrameRef.current = null;
      }
      if (orbitResumeTimerRef.current != null) {
        clearTimeout(orbitResumeTimerRef.current);
        orbitResumeTimerRef.current = null;
      }
      // Remove orbit-specific event listeners (use removeListener to preserve other handlers)
      mouseCaptor.removeListener('mousedown', onInteractionStart);
      mouseCaptor.removeListener('mouseup', onInteractionEnd);
      mouseCaptor.removeListener('wheel', onWheel);
      touchCaptor.removeListener('touchdown', onInteractionStart);
      touchCaptor.removeListener('touchup', onInteractionEnd);
      sigma.removeListener('enterNode', onInteractionStart);
      sigma.removeListener('leaveNode', onLeaveNode);
    };
  // Re-attach when sigma instance changes (nodes/edges trigger re-init)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, width, height]);

  // Update sigma settings when highlight/display props change
  useEffect(() => {
    const sigma = sigmaRef.current;
    if (!sigma) return;
    sigma.refresh();
  }, [highlightNodeId, highlightOrgId, egoNodeId, showLabels, showEdges, showHulls]);

  // Resize canvas overlays
  useEffect(() => {
    if (canvasLayerRef.current) {
      canvasLayerRef.current.width = width;
      canvasLayerRef.current.height = height;
    }
    const sigma = sigmaRef.current;
    if (sigma) {
      sigma.refresh();
    }
  }, [width, height]);

  // Handle simParams changes
  useEffect(() => {
    if (simParams && workerRef.current) {
      workerRef.current.postMessage({ type: 'updateParams', params: simParams });
    }
  }, [simParams]);

  // Handle freeze/unfreeze
  useEffect(() => {
    if (!workerRef.current) return;
    if (frozen) {
      workerRef.current.postMessage({ type: 'freeze' });
    } else {
      workerRef.current.postMessage({ type: 'unfreeze' });
    }
  }, [frozen]);

  // Hull overlay redraw when showHulls or highlightOrgId changes
  useEffect(() => {
    hullCacheRef.current = []; // force rebuild
    const sigma = sigmaRef.current;
    if (sigma) sigma.refresh();
  }, [showHulls, highlightOrgId, drawHulls]);

  return (
    <div
      ref={containerRef}
      style={{
        width,
        height,
        backgroundColor: '#0a0a0f',
        position: 'relative',
        overflow: 'hidden',
      }}
    />
  );
}
