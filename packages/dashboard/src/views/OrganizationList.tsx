import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useOrganizations, useOrganizationHealth } from '../hooks/useOrganizations.js';
import AddOrganizationForm from '../components/AddOrganizationForm.js';
import { Button } from '../components/FormField.js';
import type { Organization } from '@mycelio/shared';

const TYPE_TABS = [
  { value: undefined, label: 'All' },
  { value: 'company', label: 'Companies' },
  { value: 'community', label: 'Communities' },
  { value: 'other', label: 'Other' },
] as const;

function OrganizationCard({ org }: { org: Organization }) {
  const showHealth = org.type === 'community' || (org.memberIds && org.memberIds.length > 0);
  const { data: health } = useOrganizationHealth(showHealth ? org.id : '');

  const typeStyles: Record<string, string> = {
    company: 'text-neon-cyan/60 border-neon-cyan/20 bg-neon-cyan/10',
    community: 'text-neon-green/60 border-neon-green/20 bg-neon-green/10',
    other: 'text-neon-purple/60 border-neon-purple/20 bg-neon-purple/10',
  };

  return (
    <Link
      to={`/organisations/${org.id}`}
      className="glass rounded-xl p-5 hover:bg-white/[0.07] transition-all duration-200 block group"
    >
      <div className="flex items-start justify-between">
        <h3 className="font-semibold text-white group-hover:text-neon-cyan transition-colors">{org.name}</h3>
        <span className={`px-2 py-0.5 text-[10px] rounded border ${typeStyles[org.type] || typeStyles.other}`}>
          {org.type}
        </span>
      </div>

      {org.domain && (
        <p className="text-xs text-white/30 mt-1 truncate">{org.domain}</p>
      )}
      {org.industry && (
        <p className="text-xs text-white/20 mt-0.5">{org.industry}</p>
      )}
      {org.description && (
        <p className="text-sm text-white/30 mt-1 line-clamp-2">{org.description}</p>
      )}

      {health && (
        <>
          <div className="glow-line my-3" />
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Members" value={health.memberCount} />
            <Stat label="Avg Tier" value={health.avgTier} />
            <Stat label="Activity" value={health.recentInteractions} />
            <Stat label="Stale" value={health.staleMemberCount} warn={health.staleMemberCount > 0} />
          </div>
        </>
      )}

      <div className="mt-3 flex gap-1 flex-wrap">
        {org.tags.map((tag: string) => {
          const isSpecial = tag === 'sponsor' || tag === 'host';
          return (
            <span
              key={tag}
              className={`px-2 py-0.5 text-[10px] rounded border ${
                isSpecial
                  ? 'bg-neon-magenta/10 text-neon-magenta/60 border-neon-magenta/20'
                  : 'bg-neon-purple/10 text-neon-purple/60 border-neon-purple/20'
              }`}
            >
              {tag}
            </span>
          );
        })}
      </div>
    </Link>
  );
}

function Stat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div>
      <p className="text-[10px] text-white/20 uppercase tracking-wider">{label}</p>
      <p className={`text-lg font-mono font-bold ${warn ? 'text-neon-magenta' : 'neon-text'}`}>
        {value}
      </p>
    </div>
  );
}

export default function OrganizationList() {
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const { data: organizations, isLoading, error } = useOrganizations(typeFilter);
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold tracking-wide neon-text">Organisations</h2>
        <Button onClick={() => setShowAdd(true)}>+ Add Organisation</Button>
      </div>

      {/* Type filter tabs */}
      <div className="flex gap-2 mb-6">
        {TYPE_TABS.map((tab) => (
          <button
            key={tab.label}
            onClick={() => setTypeFilter(tab.value)}
            className={`px-4 py-1.5 text-xs font-mono rounded-lg border transition-all ${
              typeFilter === tab.value
                ? 'border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan'
                : 'border-white/10 bg-white/5 text-white/40 hover:text-white/60 hover:bg-white/[0.07]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-white/30 animate-pulse">Loading...</p>}
      {error && <p className="text-red-400">Error: {(error as Error).message}</p>}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {organizations?.map((org) => (
          <OrganizationCard key={org.id} org={org} />
        ))}
        {organizations?.length === 0 && (
          <p className="text-white/20 col-span-full text-center py-12">
            No organisations found. Click "+ Add Organisation" to create one.
          </p>
        )}
      </div>

      <AddOrganizationForm open={showAdd} onClose={() => setShowAdd(false)} />
    </div>
  );
}
