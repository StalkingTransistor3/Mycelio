import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { usePersonRelationships, useCreatePersonRelationship, useDeletePersonRelationship } from '../hooks/useRelationships.js';
import { api } from '../api/client.js';
import { useQuery } from '@tanstack/react-query';
import type { Person, PersonRelationshipEnriched } from '@mycelio/shared';
import Modal from '../components/Modal.js';
import { Button } from '../components/FormField.js';
import RelationshipGraph, { buildPersonGraphData } from '../components/RelationshipGraph.js';

const PERSON_REL_TYPES = [
  'colleague', 'friend', 'mentor', 'investor', 'advisor',
  'introducer', 'partner', 'client', 'co-founder', 'other',
] as const;

const strengthLabels: Record<number, string> = {
  1: 'Very Weak',
  2: 'Weak',
  3: 'Medium',
  4: 'Strong',
  5: 'Very Strong',
};

const strengthColors: Record<number, string> = {
  1: 'text-white/30',
  2: 'text-white/50',
  3: 'text-neon-cyan/60',
  4: 'text-neon-cyan',
  5: 'neon-text',
};

const typeColors: Record<string, string> = {
  colleague: 'text-neon-cyan/60 border-neon-cyan/20 bg-neon-cyan/10',
  friend: 'text-neon-green/60 border-neon-green/20 bg-neon-green/10',
  mentor: 'text-neon-magenta/60 border-neon-magenta/20 bg-neon-magenta/10',
  investor: 'text-neon-yellow/60 border-neon-yellow/20 bg-neon-yellow/10',
  advisor: 'text-neon-purple/60 border-neon-purple/20 bg-neon-purple/10',
  introducer: 'text-neon-cyan/60 border-neon-cyan/20 bg-neon-cyan/10',
  partner: 'text-neon-green/60 border-neon-green/20 bg-neon-green/10',
  client: 'text-neon-yellow/60 border-neon-yellow/20 bg-neon-yellow/10',
  'co-founder': 'text-neon-magenta/60 border-neon-magenta/20 bg-neon-magenta/10',
  other: 'text-white/40 border-white/10 bg-white/5',
};

type ViewMode = 'list' | 'graph';

export default function PersonNetwork() {
  const { data: relationships, isLoading } = usePersonRelationships();
  const createMutation = useCreatePersonRelationship();
  const deleteMutation = useDeletePersonRelationship();
  const [showAdd, setShowAdd] = useState(false);
  const [filterType, setFilterType] = useState<string>('');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // Graph container sizing
  const graphContainerRef = useRef<HTMLDivElement>(null);
  const [graphSize, setGraphSize] = useState({ width: 800, height: 600 });

  useEffect(() => {
    if (viewMode !== 'graph') return;
    const measure = () => {
      if (graphContainerRef.current) {
        const rect = graphContainerRef.current.getBoundingClientRect();
        setGraphSize({
          width: Math.max(rect.width, 400),
          height: Math.max(window.innerHeight - rect.top - 24, 400),
        });
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [viewMode]);

  // Load people for the form
  const { data: allPeople } = useQuery({
    queryKey: ['people-all'],
    queryFn: () => api.getPeople({ limit: '500' }),
    select: (res) => res.data as Person[],
  });

  // Form state
  const [personAId, setPersonAId] = useState('');
  const [personBId, setPersonBId] = useState('');
  const [relType, setRelType] = useState<string>('colleague');
  const [strength, setStrength] = useState(3);
  const [notes, setNotes] = useState('');

  const handleCreate = async () => {
    if (!personAId || !personBId) return;
    await createMutation.mutateAsync({
      personAId,
      personBId,
      type: relType,
      strength,
      notes: notes || undefined,
    });
    setShowAdd(false);
    setPersonAId('');
    setPersonBId('');
    setRelType('colleague');
    setStrength(3);
    setNotes('');
  };

  const filtered = (relationships || []).filter((r: PersonRelationshipEnriched) => {
    if (filterType && r.type !== filterType) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        r.personA.name.toLowerCase().includes(q) ||
        r.personB.name.toLowerCase().includes(q) ||
        (r.notes || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Build graph data from filtered relationships
  const graphData = useMemo(() => buildPersonGraphData(filtered), [filtered]);

  // Sidebar state for node selection
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const handleNodeSelect = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
  }, []);

  const { data: selectedPersonData } = useQuery({
    queryKey: ['person', selectedNodeId],
    queryFn: () => api.getPerson(selectedNodeId!),
    enabled: !!selectedNodeId,
    select: (res) => res.data as Person,
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-wide text-white">Person Network</h2>
          <p className="text-white/30 text-sm mt-1">
            {relationships?.length || 0} relationships
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View mode toggle */}
          <div className="glass rounded-lg border border-white/10 flex overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 text-xs font-mono transition-colors ${
                viewMode === 'list'
                  ? 'bg-neon-cyan/20 text-neon-cyan'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('graph')}
              className={`px-3 py-1.5 text-xs font-mono transition-colors ${
                viewMode === 'graph'
                  ? 'bg-neon-cyan/20 text-neon-cyan'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              Graph
            </button>
          </div>
          <Button onClick={() => setShowAdd(true)}>+ Add Relationship</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <input
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="glass px-3 py-2 rounded-lg text-sm text-white/80 border border-white/10 focus:border-neon-cyan/50 outline-none w-64"
        />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="glass px-3 py-2 rounded-lg text-sm text-white/80 border border-white/10 bg-transparent"
        >
          <option value="">All types</option>
          {PERSON_REL_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {isLoading && <p className="text-white/30 animate-pulse">Loading...</p>}

      {/* Graph view */}
      {viewMode === 'graph' && !isLoading && (
        <div ref={graphContainerRef} className="glass rounded-xl neon-border overflow-hidden relative">
          <RelationshipGraph
            nodes={graphData.nodes}
            links={graphData.links}
            width={graphSize.width}
            height={graphSize.height}
            typeColorMap={graphData.typeColorMap}
            onNodeSelect={handleNodeSelect}
          />

          {/* Node detail sidebar */}
          <div
            className={`absolute top-0 right-0 h-full w-80 glass border-l border-white/10 z-20 transition-transform duration-300 ease-in-out overflow-y-auto ${
              selectedNodeId ? 'translate-x-0' : 'translate-x-full'
            }`}
            style={{ backgroundColor: 'rgba(10, 10, 15, 0.95)' }}
          >
            {selectedNodeId && (
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-mono text-white/40 uppercase tracking-wider">Person Details</h3>
                  <button
                    onClick={() => setSelectedNodeId(null)}
                    className="text-white/30 hover:text-white/70 transition-colors text-lg leading-none"
                  >
                    &times;
                  </button>
                </div>
                {selectedPersonData ? (
                  <div className="space-y-3">
                    <div>
                      <div className="text-lg font-bold text-white/90 font-mono">{selectedPersonData.name}</div>
                      {selectedPersonData.title && (
                        <div className="text-sm text-white/40 mt-0.5">{selectedPersonData.title}</div>
                      )}
                    </div>
                    <div className="space-y-2 text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <span className="text-white/30">Tier</span>
                        <span className="text-[#00f0ff]">T{selectedPersonData.tier}</span>
                      </div>
                      {selectedPersonData.stage && (
                        <div className="flex items-center gap-2">
                          <span className="text-white/30">Stage</span>
                          <span className="text-white/60">{selectedPersonData.stage}</span>
                        </div>
                      )}
                      {selectedPersonData.lastContactAt && (
                        <div className="flex items-center gap-2">
                          <span className="text-white/30">Last Contact</span>
                          <span className="text-white/60">{new Date(selectedPersonData.lastContactAt).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                    {selectedPersonData.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {selectedPersonData.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-[10px] text-white/40 font-mono"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <Link
                      to={`/people/${selectedNodeId}`}
                      className="mt-4 block w-full px-3 py-2 text-center text-xs font-mono bg-white/5 border border-white/10 rounded-lg text-[#00f0ff]/80 hover:text-[#00f0ff] hover:border-[#00f0ff]/40 transition-all"
                    >
                      View Profile &rarr;
                    </Link>
                  </div>
                ) : (
                  <div className="text-white/30 text-sm animate-pulse">Loading...</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* List view */}
      {viewMode === 'list' && (
        <div className="grid gap-3">
          {filtered.map((rel: PersonRelationshipEnriched) => (
            <div key={rel.id} className="glass rounded-xl p-4 neon-border flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <Link
                    to={`/people/${rel.personA.id}`}
                    className="text-neon-cyan hover:text-neon-cyan/80 font-medium truncate transition-colors"
                  >
                    {rel.personA.name}
                  </Link>
                  <span className="text-white/20 text-xs shrink-0">{rel.personA.title || ''}</span>
                </div>

                <div className="flex flex-col items-center shrink-0 px-2">
                  <span className={`px-2 py-0.5 text-xs font-mono rounded border ${typeColors[rel.type] || typeColors.other}`}>
                    {rel.type}
                  </span>
                  <div className="flex items-center gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <span
                        key={s}
                        className={`w-1.5 h-1.5 rounded-full ${
                          s <= rel.strength ? 'bg-neon-cyan' : 'bg-white/10'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 min-w-0">
                  <Link
                    to={`/people/${rel.personB.id}`}
                    className="text-neon-cyan hover:text-neon-cyan/80 font-medium truncate transition-colors"
                  >
                    {rel.personB.name}
                  </Link>
                  <span className="text-white/20 text-xs shrink-0">{rel.personB.title || ''}</span>
                </div>
              </div>

              {rel.notes && (
                <span className="text-white/30 text-xs ml-4 truncate max-w-[200px]">{rel.notes}</span>
              )}

              <button
                onClick={() => deleteMutation.mutate(rel.id)}
                className="ml-4 text-white/20 hover:text-red-400 text-xs transition-colors shrink-0"
                title="Delete"
              >
                x
              </button>
            </div>
          ))}

          {!isLoading && filtered.length === 0 && (
            <p className="text-white/20 text-center py-12">No person relationships yet.</p>
          )}
        </div>
      )}

      {/* Add Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Person Relationship">
          <div className="space-y-4">
            <div>
              <label className="text-white/50 text-sm block mb-1">Person A</label>
              <select
                value={personAId}
                onChange={(e) => setPersonAId(e.target.value)}
                className="w-full glass px-3 py-2 rounded-lg text-sm text-white/80 border border-white/10 bg-transparent"
              >
                <option value="">Select person...</option>
                {(allPeople || []).map((p: Person) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-white/50 text-sm block mb-1">Person B</label>
              <select
                value={personBId}
                onChange={(e) => setPersonBId(e.target.value)}
                className="w-full glass px-3 py-2 rounded-lg text-sm text-white/80 border border-white/10 bg-transparent"
              >
                <option value="">Select person...</option>
                {(allPeople || []).map((p: Person) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-white/50 text-sm block mb-1">Type</label>
              <select
                value={relType}
                onChange={(e) => setRelType(e.target.value)}
                className="w-full glass px-3 py-2 rounded-lg text-sm text-white/80 border border-white/10 bg-transparent"
              >
                {PERSON_REL_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-white/50 text-sm block mb-1">Strength ({strengthLabels[strength]})</label>
              <input
                type="range"
                min={1}
                max={5}
                value={strength}
                onChange={(e) => setStrength(Number(e.target.value))}
                className="w-full accent-neon-cyan"
              />
              <div className="flex justify-between text-[10px] text-white/20">
                <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
              </div>
            </div>
            <div>
              <label className="text-white/50 text-sm block mb-1">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full glass px-3 py-2 rounded-lg text-sm text-white/80 border border-white/10 bg-transparent resize-none"
                rows={3}
              />
            </div>
            <Button onClick={handleCreate} disabled={!personAId || !personBId || createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Relationship'}
            </Button>
          </div>
      </Modal>
    </div>
  );
}
