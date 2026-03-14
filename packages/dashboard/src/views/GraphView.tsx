import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGraph } from '../hooks/useGraph.js';
import NetworkGraph from '../graph/NetworkGraph.js';
import GraphControls from '../graph/GraphControls.js';
import type { GraphNode } from '@mycelio/shared';

export default function GraphView() {
  const { data: graph, isLoading, error } = useGraph();
  const [tierFilter, setTierFilter] = useState<number | null>(null);
  const navigate = useNavigate();

  const handleNodeClick = useCallback(
    (node: GraphNode) => {
      navigate(`/people/${node.id}`);
    },
    [navigate],
  );

  const filteredNodes = graph
    ? tierFilter
      ? graph.nodes.filter((n) => n.tier <= tierFilter)
      : graph.nodes
    : [];

  const nodeIds = new Set(filteredNodes.map((n) => n.id));
  const filteredEdges = graph
    ? graph.edges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
    : [];

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

      <GraphControls tierFilter={tierFilter} onTierChange={setTierFilter} />

      {isLoading && <p className="text-white/30 animate-pulse">Loading graph...</p>}
      {error && <p className="text-red-400">Error: {(error as Error).message}</p>}

      {graph && filteredNodes.length > 0 ? (
        <div className="flex-1 glass rounded-xl overflow-hidden neon-border">
          <NetworkGraph
            nodes={filteredNodes}
            edges={filteredEdges}
            width={1200}
            height={700}
            onNodeClick={handleNodeClick}
          />
        </div>
      ) : (
        !isLoading && (
          <div className="flex-1 flex items-center justify-center glass rounded-xl">
            <p className="text-white/20">
              No connections yet. Add people and connections to see your network.
            </p>
          </div>
        )
      )}
    </div>
  );
}
