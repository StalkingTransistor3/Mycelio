import { useState, useRef, useEffect, useMemo } from 'react';
import type { GraphNode, GraphGroup } from '@mycelio/shared';

interface Props {
  nodes: GraphNode[];
  groups: GraphGroup[];
  onHighlight: (nodeId: string | null, orgId: string | null) => void;
  onPanToNode?: (nodeId: string) => void;
  onPanToOrg?: (orgId: string) => void;
}

export default function GraphSearch({ nodes, groups, onHighlight, onPanToNode, onPanToOrg }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    if (!query.trim()) return { people: [], orgs: [] };
    const q = query.toLowerCase();
    return {
      people: nodes.filter((n) => n.name.toLowerCase().includes(q)).slice(0, 8),
      orgs: groups.filter((g) => g.name.toLowerCase().includes(q)).slice(0, 5),
    };
  }, [query, nodes, groups]);

  const hasResults = results.people.length > 0 || results.orgs.length > 0;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setQuery('');
        setOpen(false);
        onHighlight(null, null);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onHighlight]);

  function selectPerson(node: GraphNode) {
    setQuery(node.name);
    setOpen(false);
    onHighlight(node.id, null);
    onPanToNode?.(node.id);
  }

  function selectOrg(group: GraphGroup) {
    setQuery(group.name);
    setOpen(false);
    onHighlight(null, group.id);
    onPanToOrg?.(group.id);
  }

  return (
    <div ref={containerRef} className="relative w-64">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (!e.target.value.trim()) onHighlight(null, null);
        }}
        onFocus={() => { if (query.trim()) setOpen(true); }}
        placeholder="Search graph..."
        className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white/90 placeholder-white/20 outline-none focus:border-neon-cyan/50 focus:shadow-neon transition-all duration-200 backdrop-blur-sm font-mono"
      />
      {query && (
        <button
          onClick={() => {
            setQuery('');
            setOpen(false);
            onHighlight(null, null);
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 text-xs"
        >
          ✕
        </button>
      )}

      {open && query.trim() && (
        <div className="absolute top-full left-0 mt-1 w-full z-50 glass rounded-lg neon-border overflow-hidden max-h-72 overflow-y-auto">
          {!hasResults && (
            <div className="px-3 py-2 text-xs text-white/30 font-mono">No matches</div>
          )}

          {results.people.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-[10px] font-medium text-white/30 uppercase tracking-wider border-b border-white/5">
                People
              </div>
              {results.people.map((n) => (
                <button
                  key={n.id}
                  onClick={() => selectPerson(n)}
                  className="w-full px-3 py-2 text-left text-sm text-white/70 hover:bg-white/5 hover:text-white/90 transition-colors flex items-center gap-2"
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: tierColorMap[n.tier] || '#555566' }}
                  />
                  <span className="font-mono text-xs truncate">{n.name}</span>
                  {n.group && (
                    <span className="text-[10px] text-white/20 ml-auto truncate">{n.group}</span>
                  )}
                </button>
              ))}
            </>
          )}

          {results.orgs.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-[10px] font-medium text-white/30 uppercase tracking-wider border-b border-white/5">
                Organizations
              </div>
              {results.orgs.map((g) => (
                <button
                  key={g.id}
                  onClick={() => selectOrg(g)}
                  className="w-full px-3 py-2 text-left text-sm text-white/70 hover:bg-white/5 hover:text-white/90 transition-colors flex items-center gap-2"
                >
                  <span className="w-2 h-2 rounded-sm bg-neon-cyan/50 flex-shrink-0" />
                  <span className="font-mono text-xs truncate">{g.name}</span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

const tierColorMap: Record<number, string> = {
  1: '#ff00e5',
  2: '#00f0ff',
  3: '#39ff14',
  4: '#f0ff00',
  5: '#555566',
};
