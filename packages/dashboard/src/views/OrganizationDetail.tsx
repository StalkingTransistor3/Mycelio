import { useParams, Link } from 'react-router-dom';
import { useOrganization, useOrganizationMembers } from '../hooks/useOrganizations.js';
import { api } from '../api/client.js';
import { useQuery } from '@tanstack/react-query';
import type { Person } from '@mycelio/shared';

const typeStyles: Record<string, string> = {
  company: 'text-neon-cyan/60 border-neon-cyan/20 bg-neon-cyan/10',
  community: 'text-neon-green/60 border-neon-green/20 bg-neon-green/10',
  other: 'text-neon-purple/60 border-neon-purple/20 bg-neon-purple/10',
};

export default function OrganizationDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: org, isLoading } = useOrganization(id!);
  const { data: members } = useOrganizationMembers(id!);

  // People with organizationId === this org (employees/affiliates)
  const { data: affiliatedPeople } = useQuery({
    queryKey: ['org-people', id],
    queryFn: async () => {
      const res = await api.getPeople({ organizationId: id! });
      return res.data as Person[];
    },
    enabled: !!id,
  });

  if (isLoading) return <p className="text-white/30 animate-pulse">Loading...</p>;
  if (!org) return <p className="text-red-400">Organisation not found</p>;

  return (
    <div>
      <Link to="/organisations" className="text-neon-cyan/60 hover:text-neon-cyan text-sm mb-4 inline-block transition-colors">
        &larr; Back to Organisations
      </Link>

      <div className="glass rounded-xl p-6 mb-6 neon-border">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-wide text-white">{org.name}</h2>
            {org.industry && <p className="text-white/40 mt-1">{org.industry}</p>}
          </div>
          <span className={`px-3 py-1 text-xs font-mono rounded border ${typeStyles[org.type] || typeStyles.other}`}>
            {org.type}
          </span>
        </div>

        {org.domain && (
          <a
            href={org.domain.startsWith('http') ? org.domain : `https://${org.domain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 text-sm font-mono text-neon-cyan border border-neon-cyan/30 rounded-lg bg-neon-cyan/5 hover:bg-neon-cyan/10 transition-colors"
          >
            {org.domain} &rarr;
          </a>
        )}

        {org.description && (
          <div className="mt-4 p-3 bg-white/5 rounded-lg text-sm text-white/50 border border-white/5">
            {org.description}
          </div>
        )}

        {org.notes && (
          <div className="mt-3 p-3 bg-white/5 rounded-lg text-sm text-white/40 border border-white/5">
            {org.notes}
          </div>
        )}

        {org.tags.length > 0 && (
          <div className="mt-4 flex gap-2 flex-wrap">
            {org.tags.map((tag: string) => {
              const isSpecial = tag === 'sponsor' || tag === 'host';
              return (
                <span
                  key={tag}
                  className={`px-2 py-1 text-xs rounded border ${
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
        )}
      </div>

      {/* Members section (community membership via memberIds) */}
      {members && members.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-white/30 uppercase tracking-wider mb-3">
            Members ({members.length})
          </h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((person) => (
              <Link
                key={person.id}
                to={`/people/${person.id}`}
                className="glass rounded-lg p-3 hover:bg-white/[0.07] transition-colors group"
              >
                <p className="text-sm text-white group-hover:text-neon-cyan transition-colors">{person.name}</p>
                {person.title && <p className="text-xs text-white/30 mt-0.5">{person.title}</p>}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* People section (people with organizationId FK) */}
      {affiliatedPeople && affiliatedPeople.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-white/30 uppercase tracking-wider mb-3">
            People ({affiliatedPeople.length})
          </h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {affiliatedPeople.map((person) => (
              <Link
                key={person.id}
                to={`/people/${person.id}`}
                className="glass rounded-lg p-3 hover:bg-white/[0.07] transition-colors group"
              >
                <p className="text-sm text-white group-hover:text-neon-cyan transition-colors">{person.name}</p>
                {person.title && <p className="text-xs text-white/30 mt-0.5">{person.title}</p>}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
