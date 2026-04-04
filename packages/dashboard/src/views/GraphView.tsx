import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useGraph, useEgoGraph } from '../hooks/useGraph.js';
import NetworkGraph from '../graph/NetworkGraph.js';
import type { GraphAPI } from '../graph/NetworkGraph.js';
import GraphControls from '../graph/GraphControls.js';
import GraphSearch from '../graph/GraphSearch.js';
import GraphSimControls from '../graph/GraphSimControls.js';
import { DEFAULT_SIM_PARAMS } from '../graph/GraphSimControls.js';
import type { SimParams } from '../graph/GraphSimControls.js';
import type { GraphNode } from '@mycelio/shared';

const tierColor: Record<number, string> = {
  1: '#ff00e5',
  2: '#00f0ff',
  3: '#39ff14',
  4: '#f0ff00',
  5: '#555566',
};

const tierLabel: Record<number, string> = {
  1: 'Inner Circle',
  2: 'Key',
  3: 'Active',
  4: 'Extended',
  5: 'Acquaintance',
};

export default function GraphView() {
  // Tier filter drives server-side fetch
  const [tierFilter, setTierFilter] = useState<number | null>(3);
  const graphTier = tierFilter || 5; // null = all tiers = tier 5
  const graphLimit = graphTier <= 2 ? 200 : graphTier <= 3 ? 500 : graphTier <= 4 ? 1000 : 2000;
  const { data: overviewGraph, isLoading, error } = useGraph({ tier: graphTier, limit: graphLimit });
  const [orgFilter, setOrgFilter] = useState<string | null>(null);
  const [connectedOnly, setConnectedOnly] = useState(false);
  const [highlightNodeId, setHighlightNodeId] = useState<string | null>(null);
  const [highlightOrgId, setHighlightOrgId] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);

  // Ego mode state
  const [egoNodeId, setEgoNodeId] = useState<string | null>(null);
  const [egoDepth, setEgoDepth] = useState(1);
  const { data: egoGraph } = useEgoGraph(egoNodeId, egoDepth);

  // Sim controls state
  const [simParams, setSimParams] = useState<SimParams>({ ...DEFAULT_SIM_PARAMS });
  const [frozen, setFrozen] = useState(false);

  // Display toggles
  const [showLabels, setShowLabels] = useState(false);
  const [showEdges, setShowEdges] = useState(true);
  const [showHulls, setShowHulls] = useState(true);

  // New filter states
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [minConnections, setMinConnections] = useState(0);

  const graphApiRef = useRef<GraphAPI | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width: Math.floor(width), height: Math.floor(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const isEgoMode = egoNodeId !== null;
  const activeGraph = isEgoMode && egoGraph ? egoGraph : overviewGraph;

  const handleNodeClick = useCallback((node: GraphNode) => {
    setEgoNodeId(node.id);
    setEgoDepth(1);
  }, []);

  const exitEgoMode = useCallback(() => {
    setEgoNodeId(null);
  }, []);

  const handleGraphReady = useCallback((api: GraphAPI) => {
    graphApiRef.current = api;
  }, []);

  const handleHighlight = useCallback((nodeId: string | null, orgId: string | null) => {
    setHighlightNodeId(nodeId);
    setHighlightOrgId(orgId);
  }, []);

  const handlePanToNode = useCallback((nodeId: string) => {
    graphApiRef.current?.panToNode(nodeId);
  }, []);

  const handlePanToOrg = useCallback((orgId: string) => {
    graphApiRef.current?.panToOrg(orgId);
  }, []);

  const handleNodeHover = useCallback((node: GraphNode | null) => {
    setHoveredNode(node);
  }, []);

  // Ego side panel data
  const egoNode = useMemo(() => {
    if (!egoNodeId || !activeGraph) return null;
    return activeGraph.nodes.find((n) => n.id === egoNodeId) || null;
  }, [egoNodeId, activeGraph]);

  const egoConnections = useMemo(() => {
    if (!egoNodeId || !activeGraph) return [];
    const connected = new Set<string>();
    for (const e of activeGraph.edges) {
      if (e.source === egoNodeId) connected.add(e.target);
      if (e.target === egoNodeId) connected.add(e.source);
    }
    return activeGraph.nodes
      .filter((n) => connected.has(n.id))
      .sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));
  }, [egoNodeId, activeGraph]);

  // Build connection count map for filtering
  const connectionCountMap = useMemo(() => {
    const map = new Map<string, number>();
    if (!activeGraph) return map;
    for (const e of activeGraph.edges) {
      map.set(e.source, (map.get(e.source) || 0) + 1);
      map.set(e.target, (map.get(e.target) || 0) + 1);
    }
    return map;
  }, [activeGraph]);

  // Apply client-side filters to active graph (tier is now server-side)
  let filteredNodes = activeGraph ? [...activeGraph.nodes] : [];

  if (orgFilter === '__none__') {
    filteredNodes = filteredNodes.filter((n) => !n.organizationId);
  } else if (orgFilter) {
    filteredNodes = filteredNodes.filter((n) => n.organizationId === orgFilter);
  }

  // Tag filter: show nodes that have ANY of the selected tags
  if (selectedTags.length > 0) {
    const tagSet = new Set(selectedTags);
    filteredNodes = filteredNodes.filter((n) => n.tags.some((t) => tagSet.has(t)));
  }

  // Min connections filter
  if (minConnections > 0) {
    filteredNodes = filteredNodes.filter((n) => (connectionCountMap.get(n.id) || 0) >= minConnections);
  }

  let nodeIds = new Set(filteredNodes.map((n) => n.id));
  const filteredEdges = activeGraph
    ? activeGraph.edges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
    : [];

  if (connectedOnly) {
    const connectedIds = new Set<string>();
    for (const e of filteredEdges) {
      connectedIds.add(e.source);
      connectedIds.add(e.target);
    }
    filteredNodes = filteredNodes.filter((n) => connectedIds.has(n.id));
    nodeIds = new Set(filteredNodes.map((n) => n.id));
  }

  const groups = activeGraph?.groups ?? [];

  // All nodes for tag extraction (before filters)
  const allNodes = activeGraph?.nodes ?? [];

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold tracking-wide neon-text">Network Graph</h2>
          {isEgoMode && egoNode && (
            <span className="px-2 py-0.5 text-xs font-mono rounded-md bg-white/5 border border-white/10 text-white/60">
              Ego: {egoNode.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <GraphSimControls
            params={simParams}
            onChange={setSimParams}
            frozen={frozen}
            onFrozenChange={setFrozen}
          />
          {isEgoMode && (
            <button
              onClick={exitEgoMode}
              className="px-3 py-1.5 text-xs font-mono bg-white/5 border border-white/10 rounded-lg text-white/60 hover:text-white/90 hover:border-[#00f0ff]/40 transition-all"
            >
              Back to Overview
            </button>
          )}
          {activeGraph && (
            <span className="text-xs font-mono text-white/20">
              {filteredNodes.length} nodes · {filteredEdges.length} edges
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <GraphControls
          tierFilter={tierFilter}
          onTierChange={setTierFilter}
          groups={groups}
          orgFilter={orgFilter}
          onOrgChange={setOrgFilter}
          connectedOnly={connectedOnly}
          onConnectedOnlyChange={setConnectedOnly}
          nodes={allNodes}
          selectedTags={selectedTags}
          onSelectedTagsChange={setSelectedTags}
          minConnections={minConnections}
          onMinConnectionsChange={setMinConnections}
          showLabels={showLabels}
          onShowLabelsChange={setShowLabels}
          showEdges={showEdges}
          onShowEdgesChange={setShowEdges}
          showHulls={showHulls}
          onShowHullsChange={setShowHulls}
        />
        {isEgoMode && (
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-medium text-white/30 uppercase tracking-wider">Depth</label>
            <select
              value={egoDepth}
              onChange={(e) => setEgoDepth(parseInt(e.target.value))}
              className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white/70 outline-none focus:border-[#00f0ff]/50 transition-all appearance-none cursor-pointer"
            >
              <option value={1} className="bg-[#0a0a0f]">1 hop</option>
              <option value={2} className="bg-[#0a0a0f]">2 hops</option>
              <option value={3} className="bg-[#0a0a0f]">3 hops</option>
            </select>
          </div>
        )}
        <div className="ml-auto">
          <GraphSearch
            nodes={filteredNodes}
            groups={groups}
            onHighlight={handleHighlight}
            onPanToNode={handlePanToNode}
            onPanToOrg={handlePanToOrg}
          />
        </div>
      </div>

      {isLoading && <p className="text-white/30 animate-pulse">Loading graph...</p>}
      {error && <p className="text-red-400">Error: {(error as Error).message}</p>}

      <div className="flex-1 flex gap-0 overflow-hidden">
        {/* Graph container */}
        <div
          ref={containerRef}
          className={`flex-1 glass rounded-xl overflow-hidden neon-border relative ${isEgoMode ? 'rounded-r-none border-r-0' : ''}`}
        >
          {activeGraph && filteredNodes.length > 0 && dimensions.width > 0 && dimensions.height > 0 ? (
            <NetworkGraph
              nodes={filteredNodes}
              edges={filteredEdges}
              groups={groups}
              width={isEgoMode ? dimensions.width : dimensions.width}
              height={dimensions.height}
              onNodeClick={handleNodeClick}
              onNodeHover={handleNodeHover}
              highlightNodeId={highlightNodeId}
              highlightOrgId={highlightOrgId}
              egoNodeId={egoNodeId}
              onReady={handleGraphReady}
              simParams={simParams}
              frozen={frozen}
              showLabels={showLabels}
              showEdges={showEdges}
              showHulls={showHulls}
              onFrozenChange={setFrozen}
            />
          ) : (
            !isLoading && (
              <div className="h-full flex flex-col items-center justify-center gap-3 px-8">
                <div className="text-white/30 text-4xl">&#x1f310;</div>
                <p className="text-white/40 text-sm font-mono text-center max-w-md">
                  Connections are built through logged interactions, not assumptions.
                </p>
                <p className="text-white/20 text-xs font-mono text-center max-w-md">
                  Log meetings, confirm event interactions, or add connections manually to grow this graph. Sparse is intentional — every edge means something real.
                </p>
              </div>
            )
          )}

          {/* Hover tooltip */}
          {hoveredNode && (
            <div
              className="absolute pointer-events-none z-50 px-3 py-2 glass rounded-lg neon-border text-xs font-mono"
              style={{ top: 12, right: 12 }}
            >
              <div className="text-white/90 font-semibold">{hoveredNode.name}</div>
              {hoveredNode.group && (
                <div className="text-white/40 mt-0.5">{hoveredNode.group}</div>
              )}
              <div className="flex items-center gap-1.5 mt-1">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: tierColor[hoveredNode.tier] }}
                />
                <span className="text-white/50">
                  T{hoveredNode.tier} — {tierLabel[hoveredNode.tier]}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Ego side panel */}
        {isEgoMode && egoNode && (
          <div className="w-80 flex-shrink-0 glass rounded-r-xl neon-border border-l-0 overflow-y-auto">
            <div className="p-4 border-b border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ background: tierColor[egoNode.tier] }}
                />
                <h3 className="text-lg font-bold text-white/90 font-mono">{egoNode.name}</h3>
              </div>
              <div className="space-y-1.5 text-xs font-mono">
                {egoNode.group && (
                  <div className="text-white/40">{egoNode.group}</div>
                )}
                <div className="text-white/50">
                  T{egoNode.tier} — {tierLabel[egoNode.tier]}
                </div>
                {egoNode.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {egoNode.tags.slice(0, 8).map((tag) => (
                      <span
                        key={tag}
                        className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-[10px] text-white/40"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <Link
                to={`/people/${egoNode.id}`}
                className="mt-3 block w-full px-3 py-1.5 text-center text-xs font-mono bg-white/5 border border-white/10 rounded-lg text-[#00f0ff]/80 hover:text-[#00f0ff] hover:border-[#00f0ff]/40 transition-all"
              >
                View Full Profile
              </Link>
            </div>

            <div className="p-4">
              <div className="text-[10px] font-medium text-white/30 uppercase tracking-wider mb-2">
                Connections ({egoConnections.length})
              </div>
              <div className="space-y-0.5">
                {egoConnections.map((conn) => (
                  <button
                    key={conn.id}
                    onClick={() => {
                      setEgoNodeId(conn.id);
                      setEgoDepth(1);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-white/5 transition-colors group"
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: tierColor[conn.tier] }}
                    />
                    <span className="text-xs font-mono text-white/60 group-hover:text-white/90 truncate">
                      {conn.name}
                    </span>
                    {conn.group && (
                      <span className="text-[10px] text-white/20 ml-auto truncate max-w-[80px]">
                        {conn.group}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
