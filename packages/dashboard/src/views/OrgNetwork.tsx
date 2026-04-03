import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useOrgRelationships, useCreateOrgRelationship, useDeleteOrgRelationship } from '../hooks/useRelationships.js';
import { useOrganizations } from '../hooks/useOrganizations.js';
import type { Organization, OrgRelationshipEnriched } from '@mycelio/shared';
import Modal from '../components/Modal.js';
import { Button } from '../components/FormField.js';

const ORG_REL_TYPES = [
  'customer-vendor', 'partnership', 'investor-portfolio',
  'competitor', 'subsidiary', 'sponsor', 'member', 'other',
] as const;

const typeColors: Record<string, string> = {
  'customer-vendor': 'text-neon-cyan/60 border-neon-cyan/20 bg-neon-cyan/10',
  partnership: 'text-neon-green/60 border-neon-green/20 bg-neon-green/10',
  'investor-portfolio': 'text-neon-magenta/60 border-neon-magenta/20 bg-neon-magenta/10',
  competitor: 'text-red-400/60 border-red-400/20 bg-red-400/10',
  subsidiary: 'text-neon-yellow/60 border-neon-yellow/20 bg-neon-yellow/10',
  sponsor: 'text-neon-purple/60 border-neon-purple/20 bg-neon-purple/10',
  member: 'text-neon-cyan/60 border-neon-cyan/20 bg-neon-cyan/10',
  other: 'text-white/40 border-white/10 bg-white/5',
};

export default function OrgNetwork() {
  const { data: relationships, isLoading } = useOrgRelationships();
  const createMutation = useCreateOrgRelationship();
  const deleteMutation = useDeleteOrgRelationship();
  const { data: allOrgs } = useOrganizations();
  const [showAdd, setShowAdd] = useState(false);
  const [filterType, setFilterType] = useState<string>('');
  const [filterOrg, setFilterOrg] = useState<string>('');
  const [search, setSearch] = useState('');

  // Form state
  const [orgAId, setOrgAId] = useState('');
  const [orgBId, setOrgBId] = useState('');
  const [relType, setRelType] = useState<string>('partnership');
  const [notes, setNotes] = useState('');

  const handleCreate = async () => {
    if (!orgAId || !orgBId) return;
    await createMutation.mutateAsync({
      orgAId,
      orgBId,
      type: relType,
      notes: notes || undefined,
    });
    setShowAdd(false);
    setOrgAId('');
    setOrgBId('');
    setRelType('partnership');
    setNotes('');
  };

  // Build org filter options from orgs that appear in relationships
  const orgOptions = (() => {
    const seen = new Map<string, string>();
    for (const r of (relationships || []) as OrgRelationshipEnriched[]) {
      if (!seen.has(r.orgA.id)) seen.set(r.orgA.id, r.orgA.name);
      if (!seen.has(r.orgB.id)) seen.set(r.orgB.id, r.orgB.name);
    }
    return Array.from(seen.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  })();

  const filtered = (relationships || []).filter((r: OrgRelationshipEnriched) => {
    if (filterType && r.type !== filterType) return false;
    if (filterOrg && r.orgA.id !== filterOrg && r.orgB.id !== filterOrg) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        r.orgA.name.toLowerCase().includes(q) ||
        r.orgB.name.toLowerCase().includes(q) ||
        (r.notes || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-wide text-white">Organization Network</h2>
          <p className="text-white/30 text-sm mt-1">
            {relationships?.length || 0} relationships
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)}>+ Add Relationship</Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <input
          type="text"
          placeholder="Search by org name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="glass px-3 py-2 rounded-lg text-sm text-white/80 border border-white/10 focus:border-neon-cyan/50 outline-none w-64"
        />
        <select
          value={filterOrg}
          onChange={(e) => setFilterOrg(e.target.value)}
          className="glass px-3 py-2 rounded-lg text-sm text-white/80 border border-white/10 bg-transparent"
        >
          <option value="">All organizations</option>
          {orgOptions.map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="glass px-3 py-2 rounded-lg text-sm text-white/80 border border-white/10 bg-transparent"
        >
          <option value="">All types</option>
          {ORG_REL_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {isLoading && <p className="text-white/30 animate-pulse">Loading...</p>}

      {/* Relationship list */}
      <div className="grid gap-3">
        {filtered.map((rel: OrgRelationshipEnriched) => (
          <div key={rel.id} className="glass rounded-xl p-4 neon-border flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <Link
                  to={`/organisations/${rel.orgA.id}`}
                  className="text-neon-cyan hover:text-neon-cyan/80 font-medium truncate transition-colors"
                >
                  {rel.orgA.name}
                </Link>
                <span className="text-white/20 text-xs shrink-0">{rel.orgA.type}</span>
              </div>

              <span className={`px-2 py-0.5 text-xs font-mono rounded border shrink-0 ${typeColors[rel.type] || typeColors.other}`}>
                {rel.type}
              </span>

              <div className="flex items-center gap-2 min-w-0">
                <Link
                  to={`/organisations/${rel.orgB.id}`}
                  className="text-neon-cyan hover:text-neon-cyan/80 font-medium truncate transition-colors"
                >
                  {rel.orgB.name}
                </Link>
                <span className="text-white/20 text-xs shrink-0">{rel.orgB.type}</span>
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
          <p className="text-white/20 text-center py-12">No organization relationships yet.</p>
        )}
      </div>

      {/* Add Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Org Relationship">
          <div className="space-y-4">
            <div>
              <label className="text-white/50 text-sm block mb-1">Organization A</label>
              <select
                value={orgAId}
                onChange={(e) => setOrgAId(e.target.value)}
                className="w-full glass px-3 py-2 rounded-lg text-sm text-white/80 border border-white/10 bg-transparent"
              >
                <option value="">Select org...</option>
                {(allOrgs || []).map((o: Organization) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-white/50 text-sm block mb-1">Organization B</label>
              <select
                value={orgBId}
                onChange={(e) => setOrgBId(e.target.value)}
                className="w-full glass px-3 py-2 rounded-lg text-sm text-white/80 border border-white/10 bg-transparent"
              >
                <option value="">Select org...</option>
                {(allOrgs || []).map((o: Organization) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
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
                {ORG_REL_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
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
            <Button onClick={handleCreate} disabled={!orgAId || !orgBId || createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Relationship'}
            </Button>
          </div>
      </Modal>
    </div>
  );
}
