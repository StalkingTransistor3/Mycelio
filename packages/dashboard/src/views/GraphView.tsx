import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGraph } from '../hooks/useGraph.js';
import NetworkGraph from '../graph/NetworkGraph.js';
import type { GraphAPI } from '../graph/NetworkGraph.js';
import GraphControls from '../graph/GraphControls.js';
import GraphSimControls, { DEFAULT_SIM_PARAMS } from '../graph/GraphSimControls.js';
import type { SimParams } from '../graph/GraphSimControls.js';
import GraphSearch from '../graph/GraphSearch.js';
import type { GraphNode } from '@mycelio/shared';

export default function GraphView() {
  const { data: graph, isLoading, error } = useGraph();
  const [tierFilter, setTierFilter] = useState<number | null>(null);
  const [orgFilter, setOrgFilter] = useState<string | null>(null);
  const [connectedOnly, setConnectedOnly] = useState(false);
  const [simParams, setSimParams] = useState<SimParams>({ ...DEFAULT_SIM_PARAMS });
  const [highlightNodeId, setHighlightNodeId] = useState<string | null>(null);
  const [highlightOrgId, setHighlightOrgId] = useState<string | null>(null);
  const graphApiRef = useRef<GraphAPI | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const navigate = useNavigate();

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

  const handleNodeClick = useCallback(
    (node: GraphNode) => {
      navigate(`/people/${node.id}`);
    },
    [navigate],
  );

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

  let filteredNodes = graph ? [...graph.nodes] : [];

  if (tierFilter) {
    filteredNodes = filteredNodes.filter((n) => n.tier <= tierFilter);
  }

  if (orgFilter === '__none__') {
    filteredNodes = filteredNodes.filter((n) => !n.organizationId);
  } else if (orgFilter) {
    filteredNodes = filteredNodes.filter((n) => n.organizationId === orgFilter);
  }

  let nodeIds = new Set(filteredNodes.map((n) => n.id));
  const filteredEdges = graph
    ? graph.edges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
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

  const groups = graph?.groups ?? [];

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold tracking-wide neon-text">Network Graph</h2>
        {graph && (
          <span className="text-xs font-mono text-white/20">
            {filteredNodes.length} nodes · {filteredEdges.length} edges
          </span>
        )}
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
        />
        <GraphSimControls params={simParams} onChange={setSimParams} />
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

      <div ref={containerRef} className="flex-1 glass rounded-xl overflow-hidden neon-border">
        {graph && filteredNodes.length > 0 && dimensions.width > 0 && dimensions.height > 0 ? (
          <NetworkGraph
            nodes={filteredNodes}
            edges={filteredEdges}
            groups={groups}
            width={dimensions.width}
            height={dimensions.height}
            onNodeClick={handleNodeClick}
            simParams={simParams}
            highlightNodeId={highlightNodeId}
            highlightOrgId={highlightOrgId}
            onReady={handleGraphReady}
          />
        ) : (
          !isLoading && (
            <div className="h-full flex items-center justify-center">
              <p className="text-white/20">
                No connections yet. Add people and connections to see your network.
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
