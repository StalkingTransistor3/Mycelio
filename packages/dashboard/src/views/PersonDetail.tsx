import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePerson, useInteractions } from '../hooks/usePeople.js';
import { useOrganization } from '../hooks/useOrganizations.js';
import AddInteractionForm from '../components/AddInteractionForm.js';
import { Button } from '../components/FormField.js';
import type { Interaction } from '@mycelio/shared';

const tierLabels: Record<number, string> = {
  1: 'Inner Circle',
  2: 'Key Relationship',
  3: 'Active Network',
  4: 'Extended Network',
  5: 'Acquaintance',
};

const tierGlow: Record<number, string> = {
  1: 'neon-text-magenta',
  2: 'neon-text',
  3: 'neon-text-green',
  4: 'text-neon-yellow',
  5: 'text-white/40',
};

export default function PersonDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: person, isLoading } = usePerson(id!);
  const { data: interactions } = useInteractions(id);
  const { data: org } = useOrganization(person?.organizationId || '');
  const [showLogInteraction, setShowLogInteraction] = useState(false);

  if (isLoading) return <p className="text-white/30 animate-pulse">Loading...</p>;
  if (!person) return <p className="text-red-400">Person not found</p>;

  return (
    <div>
      <Link to="/" className="text-neon-cyan/60 hover:text-neon-cyan text-sm mb-4 inline-block transition-colors">
        &larr; Back to People
      </Link>

      <div className="glass rounded-xl p-6 mb-6 neon-border">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-wide text-white">{person.name}</h2>
            {person.title && <p className="text-white/40 mt-1">{person.title}</p>}
            {org && (
              <Link to={`/organisations/${org.id}`} className="text-sm text-neon-purple/60 hover:text-neon-purple transition-colors mt-0.5 inline-block">
                {org.name}
              </Link>
            )}
            {person.email && <p className="text-sm text-white/20">{person.email}</p>}
            {person.phone && <p className="text-sm text-white/20">{person.phone}</p>}
          </div>
          <span className={`text-sm font-mono tracking-wider ${tierGlow[person.tier]}`}>
            T{person.tier} — {tierLabels[person.tier]}
          </span>
        </div>

        {person.tags.length > 0 && (
          <div className="mt-4 flex gap-2 flex-wrap">
            {person.tags.map((tag: string) => (
              <span key={tag} className="px-2 py-1 text-xs bg-neon-cyan/10 text-neon-cyan/60 rounded border border-neon-cyan/20">
                {tag}
              </span>
            ))}
          </div>
        )}

        {person.notes && (
          <div className="mt-4 p-3 bg-white/5 rounded-lg text-sm text-white/50 border border-white/5">
            {person.notes}
          </div>
        )}

        <div className="glow-line my-4" />

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-white/20 text-xs uppercase tracking-wider">Last Contact</span>
            <p className="text-white/60 mt-1">
              {person.lastContactAt ? new Date(person.lastContactAt).toLocaleDateString() : 'Never'}
            </p>
          </div>
          <div>
            <span className="text-white/20 text-xs uppercase tracking-wider">Next Follow-up</span>
            <p className="text-white/60 mt-1">
              {person.nextFollowUpAt ? new Date(person.nextFollowUpAt).toLocaleDateString() : 'Not set'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-white/30 uppercase tracking-wider">Interaction History</h3>
        <Button onClick={() => setShowLogInteraction(true)}>+ Log Interaction</Button>
      </div>
      <div className="space-y-2">
        {(interactions as Interaction[] | undefined)?.map((interaction) => (
          <div key={interaction.id} className="glass rounded-lg p-4 hover:bg-white/[0.07] transition-colors">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-mono text-neon-green/70 uppercase tracking-wider">{interaction.type}</span>
              <span className="text-[10px] text-white/20 font-mono">
                {new Date(interaction.occurredAt).toLocaleDateString()}
              </span>
            </div>
            <p className="text-sm text-white/60">{interaction.summary}</p>
            {interaction.details && (
              <p className="text-xs text-white/30 mt-1">{interaction.details}</p>
            )}
          </div>
        ))}
        {(!interactions || (interactions as unknown[]).length === 0) && (
          <p className="text-white/20 text-sm py-4">No interactions recorded yet. Click "+ Log Interaction" to add one.</p>
        )}
      </div>

      <AddInteractionForm
        open={showLogInteraction}
        onClose={() => setShowLogInteraction(false)}
        personId={person.id}
        personName={person.name}
      />
    </div>
  );
}
