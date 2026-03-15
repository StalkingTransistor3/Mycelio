import { useState, useMemo, useRef, useEffect } from 'react';
import type { GraphGroup, GraphNode } from '@mycelio/shared';

interface Props {
  tierFilter: number | null;
  onTierChange: (tier: number | null) => void;
  groups: GraphGroup[];
  orgFilter: string | null;
  onOrgChange: (orgId: string | null) => void;
  connectedOnly: boolean;
  onConnectedOnlyChange: (value: boolean) => void;
  // New filter props
  nodes: GraphNode[];
  selectedTags: string[];
  onSelectedTagsChange: (tags: string[]) => void;
  minConnections: number;
  onMinConnectionsChange: (min: number) => void;
  showLabels: boolean;
  onShowLabelsChange: (show: boolean) => void;
  showEdges: boolean;
  onShowEdgesChange: (show: boolean) => void;
  showHulls: boolean;
  onShowHullsChange: (show: boolean) => void;
}

const tiers = [
  { value: null, label: 'All Tiers' },
  { value: 1, label: 'T1 — Inner Circle' },
  { value: 2, label: 'T2 — Key' },
  { value: 3, label: 'T3 — Active' },
  { value: 4, label: 'T4 — Extended' },
  { value: 5, label: 'T5 — Acquaintance' },
];

export default function GraphControls({
  tierFilter, onTierChange, groups, orgFilter, onOrgChange,
  connectedOnly, onConnectedOnlyChange,
  nodes, selectedTags, onSelectedTagsChange,
  minConnections, onMinConnectionsChange,
  showLabels, onShowLabelsChange,
  showEdges, onShowEdgesChange,
  showHulls, onShowHullsChange,
}: Props) {
  const sortedGroups = [...groups].sort((a, b) => a.name.localeCompare(b.name));
  const [tagSearchOpen, setTagSearchOpen] = useState(false);
  const [tagQuery, setTagQuery] = useState('');
  const tagDropdownRef = useRef<HTMLDivElement>(null);

  // Extract all unique tags from nodes
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const n of nodes) {
      for (const t of n.tags) tagSet.add(t);
    }
    return Array.from(tagSet).sort();
  }, [nodes]);

  const filteredTags = useMemo(() => {
    if (!tagQuery) return availableTags;
    const q = tagQuery.toLowerCase();
    return availableTags.filter((t) => t.toLowerCase().includes(q));
  }, [availableTags, tagQuery]);

  // Close tag dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(e.target as Node)) {
        setTagSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onSelectedTagsChange(selectedTags.filter((t) => t !== tag));
    } else {
      onSelectedTagsChange([...selectedTags, tag]);
    }
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <label className="text-[10px] font-medium text-white/30 uppercase tracking-wider">Filter</label>

      {/* Tier filter */}
      <select
        value={tierFilter ?? ''}
        onChange={(e) => onTierChange(e.target.value ? parseInt(e.target.value) : null)}
        className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white/70 outline-none focus:border-[#00f0ff]/50 focus:shadow-[0_0_8px_rgba(0,240,255,0.15)] transition-all appearance-none cursor-pointer"
      >
        {tiers.map((t) => (
          <option key={t.label} value={t.value ?? ''} className="bg-[#0a0a0f] text-white/70">
            {t.label}
          </option>
        ))}
      </select>

      {/* Org filter */}
      <select
        value={orgFilter ?? ''}
        onChange={(e) => onOrgChange(e.target.value || null)}
        className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white/70 outline-none focus:border-[#00f0ff]/50 focus:shadow-[0_0_8px_rgba(0,240,255,0.15)] transition-all appearance-none cursor-pointer"
      >
        <option value="" className="bg-[#0a0a0f] text-white/70">All Organizations</option>
        <option value="__none__" className="bg-[#0a0a0f] text-white/70">No Organization</option>
        {sortedGroups.map((g) => (
          <option key={g.id} value={g.id} className="bg-[#0a0a0f] text-white/70">
            {g.name}
          </option>
        ))}
      </select>

      {/* Tag filter */}
      <div className="relative" ref={tagDropdownRef}>
        <button
          onClick={() => setTagSearchOpen(!tagSearchOpen)}
          className={`px-3 py-1.5 text-xs font-mono border rounded-lg transition-all duration-200 flex items-center gap-1.5 ${
            selectedTags.length > 0
              ? 'bg-[#00f0ff]/10 border-[#00f0ff]/40 text-[#00f0ff]'
              : 'bg-white/5 border-white/10 text-white/50 hover:border-white/20 hover:text-white/70'
          }`}
        >
          Tags{selectedTags.length > 0 ? ` (${selectedTags.length})` : ''} {tagSearchOpen ? '▾' : '▸'}
        </button>

        {tagSearchOpen && (
          <div className="absolute top-full left-0 mt-2 z-50 w-64 bg-[#0a0a0f]/95 backdrop-blur-md rounded-xl border border-white/10 shadow-[0_0_20px_rgba(0,0,0,0.5)] overflow-hidden">
            <div className="p-2 border-b border-white/5">
              <input
                type="text"
                value={tagQuery}
                onChange={(e) => setTagQuery(e.target.value)}
                placeholder="Search tags..."
                className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded text-xs font-mono text-white/70 outline-none focus:border-[#00f0ff]/40 placeholder-white/20"
                autoFocus
              />
            </div>
            {selectedTags.length > 0 && (
              <div className="px-2 pt-2 pb-1 border-b border-white/5">
                <div className="flex flex-wrap gap-1">
                  {selectedTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className="px-1.5 py-0.5 bg-[#00f0ff]/15 border border-[#00f0ff]/30 rounded text-[10px] font-mono text-[#00f0ff] hover:bg-[#ff00e5]/15 hover:border-[#ff00e5]/30 hover:text-[#ff00e5] transition-colors"
                    >
                      {tag} ✕
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => onSelectedTagsChange([])}
                  className="text-[10px] font-mono text-white/30 hover:text-[#ff00e5] mt-1 transition-colors"
                >
                  Clear all
                </button>
              </div>
            )}
            <div className="max-h-48 overflow-y-auto p-1">
              {filteredTags.length === 0 ? (
                <div className="px-2 py-3 text-center text-[10px] text-white/20 font-mono">No tags found</div>
              ) : (
                filteredTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`w-full text-left px-2 py-1 rounded text-xs font-mono transition-colors ${
                      selectedTags.includes(tag)
                        ? 'bg-[#00f0ff]/10 text-[#00f0ff]'
                        : 'text-white/50 hover:bg-white/5 hover:text-white/70'
                    }`}
                  >
                    {tag}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Connection count filter */}
      <div className="flex items-center gap-1.5">
        <label className="text-[10px] font-mono text-white/30">Min Connections</label>
        <input
          type="range"
          min={0}
          max={50}
          step={1}
          value={minConnections}
          onChange={(e) => onMinConnectionsChange(parseInt(e.target.value))}
          className="w-20 h-1 appearance-none bg-white/10 rounded-full outline-none cursor-pointer accent-[#00f0ff] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#00f0ff]"
        />
        <span className="text-[10px] font-mono text-[#00f0ff]/70 w-5 text-right">{minConnections}</span>
      </div>

      {/* Connected only */}
      <label className="flex items-center gap-1.5 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={connectedOnly}
          onChange={(e) => onConnectedOnlyChange(e.target.checked)}
          className="w-3.5 h-3.5 rounded border-white/20 bg-white/5 accent-[#00f0ff] cursor-pointer"
        />
        <span className="text-xs text-white/50 font-mono">Connected only</span>
      </label>

      {/* Display toggles */}
      <div className="flex items-center gap-3 ml-2 pl-2 border-l border-white/5">
        <label className="flex items-center gap-1.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showLabels}
            onChange={(e) => onShowLabelsChange(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-white/20 bg-white/5 accent-[#00f0ff] cursor-pointer"
          />
          <span className="text-xs text-white/50 font-mono">Labels</span>
        </label>

        <label className="flex items-center gap-1.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showEdges}
            onChange={(e) => onShowEdgesChange(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-white/20 bg-white/5 accent-[#00f0ff] cursor-pointer"
          />
          <span className="text-xs text-white/50 font-mono">Edges</span>
        </label>

        <label className="flex items-center gap-1.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showHulls}
            onChange={(e) => onShowHullsChange(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-white/20 bg-white/5 accent-[#00f0ff] cursor-pointer"
          />
          <span className="text-xs text-white/50 font-mono">Hulls</span>
        </label>
      </div>
    </div>
  );
}
