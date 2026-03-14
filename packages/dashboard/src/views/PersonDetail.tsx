import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { usePerson, useInteractions } from '../hooks/usePeople.js';
import { useOrganization, useOrganizations } from '../hooks/useOrganizations.js';
import { api } from '../api/client.js';
import AddInteractionForm from '../components/AddInteractionForm.js';
import { Button } from '../components/FormField.js';
import type { Interaction, Organization, CommProfile, Milestone, TalkingPoint, PersonAvailability, ReciprocityIndex, RelationshipStage, StageTransition } from '@mycelio/shared';

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
  const { data: allOrgs } = useOrganizations();
  const [showLogInteraction, setShowLogInteraction] = useState(false);

  // Co-attendance data
  const { data: coAttendance } = useQuery({
    queryKey: ['co-attendance', id],
    queryFn: () => api.getCoAttendance(id!),
    select: (res) => res.data as Array<{ personId: string; personName?: string; sharedEventCount: number }>,
    enabled: !!id,
  });

  // Reciprocity data
  const { data: reciprocity } = useQuery({
    queryKey: ['reciprocity', id],
    queryFn: () => api.getReciprocity(id!),
    select: (res) => res.data as ReciprocityIndex,
    enabled: !!id,
  });

  // Resolve additional org affiliations beyond the primary
  const additionalOrgIds = (person?.organizationIds || []).filter(
    (oid: string) => oid !== person?.organizationId
  );
  const additionalOrgs = allOrgs?.filter((o: Organization) => additionalOrgIds.includes(o.id)) || [];

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
            {(org || additionalOrgs.length > 0) && (
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                {org && (
                  <Link to={`/organisations/${org.id}`} className="text-sm text-neon-purple/60 hover:text-neon-purple transition-colors inline-block">
                    {org.name}
                  </Link>
                )}
                {additionalOrgs.map((ao: Organization) => (
                  <Link key={ao.id} to={`/organisations/${ao.id}`} className="text-sm text-neon-purple/40 hover:text-neon-purple transition-colors inline-block">
                    {ao.name}
                  </Link>
                ))}
              </div>
            )}
            {person.email && <p className="text-sm text-white/20">{person.email}</p>}
            {person.phone && <p className="text-sm text-white/20">{person.phone}</p>}
            {(person.linkedin || person.twitter || person.instagram) && (
              <div className="flex gap-3 mt-2">
                {person.linkedin && (
                  <a href={person.linkedin.startsWith('http') ? person.linkedin : `https://${person.linkedin}`} target="_blank" rel="noopener noreferrer" className="text-xs text-neon-cyan/50 hover:text-neon-cyan transition-colors">
                    LinkedIn
                  </a>
                )}
                {person.twitter && (
                  <a href={person.twitter.startsWith('http') ? person.twitter : `https://x.com/${person.twitter.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-xs text-neon-cyan/50 hover:text-neon-cyan transition-colors">
                    X
                  </a>
                )}
                {person.instagram && (
                  <a href={person.instagram.startsWith('http') ? person.instagram : `https://instagram.com/${person.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-xs text-neon-cyan/50 hover:text-neon-cyan transition-colors">
                    Instagram
                  </a>
                )}
              </div>
            )}
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

        {/* Archetypes & Values */}
        {((person.archetypes?.length ?? 0) > 0 || (person.values?.length ?? 0) > 0) && (
          <div className="mt-4 flex gap-2 flex-wrap">
            {person.archetypes?.map((a: string) => (
              <span key={a} className="px-2 py-1 text-xs bg-neon-purple/10 text-neon-purple/70 rounded border border-neon-purple/20">
                {a}
              </span>
            ))}
            {person.values?.map((v: string) => (
              <span key={v} className="px-2 py-1 text-xs bg-neon-magenta/10 text-neon-magenta/60 rounded border border-neon-magenta/20">
                {v}
              </span>
            ))}
          </div>
        )}

        {/* Communication Profile */}
        {person.commProfile && Object.keys(person.commProfile).length > 0 && (() => {
          const cp = person.commProfile as CommProfile;
          return (
            <div className="mt-4 p-3 bg-white/5 rounded-lg border border-white/5">
              <p className="text-xs text-white/20 uppercase tracking-wider mb-2">Communication Profile</p>
              <div className="flex flex-wrap gap-3 text-xs">
                {cp.preferredPlatform && (
                  <span className="text-neon-cyan/60">Platform: <span className="text-white/50">{cp.preferredPlatform}</span></span>
                )}
                {cp.responsePattern && (
                  <span className="text-neon-cyan/60">Response: <span className="text-white/50">{cp.responsePattern}</span></span>
                )}
                {cp.communicationStyle && (
                  <span className="text-neon-cyan/60">Style: <span className="text-white/50">{cp.communicationStyle}</span></span>
                )}
                {cp.bestTimes && (
                  <span className="text-neon-cyan/60">Best times: <span className="text-white/50">{cp.bestTimes}</span></span>
                )}
              </div>
              {cp.notes && <p className="text-xs text-white/30 mt-1">{cp.notes}</p>}
            </div>
          );
        })()}

        {/* Availability & Stage */}
        {(person.availability || person.stage) && (
          <div className="mt-4 flex gap-4">
            {person.availability && (() => {
              const av = person.availability as PersonAvailability;
              const statusColors: Record<string, string> = {
                available: 'bg-neon-green/10 text-neon-green border-neon-green/20',
                busy: 'bg-neon-yellow/10 text-neon-yellow border-neon-yellow/20',
                overwhelmed: 'bg-red-400/10 text-red-400 border-red-400/20',
                unknown: 'bg-white/5 text-white/30 border-white/10',
              };
              return (
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs rounded border ${statusColors[av.status] || statusColors.unknown}`}>
                    {av.status}
                  </span>
                  {av.note && <span className="text-xs text-white/30">{av.note}</span>}
                </div>
              );
            })()}
            {person.stage && (
              <span className="px-2 py-1 text-xs bg-neon-cyan/10 text-neon-cyan/70 rounded border border-neon-cyan/20 uppercase tracking-wider">
                {(person.stage as string).replace('_', ' ')}
              </span>
            )}
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

      {/* Milestones */}
      {(person.milestones as Milestone[])?.length > 0 && (
        <div className="glass rounded-xl p-6 mb-6 neon-border">
          <h3 className="text-sm font-medium text-white/30 uppercase tracking-wider mb-3">Milestones</h3>
          <div className="space-y-2">
            {(person.milestones as Milestone[]).map((m) => (
              <div key={m.id} className="flex items-center gap-3 text-sm">
                <span className="text-xs font-mono text-neon-yellow/70 uppercase w-24 shrink-0">{m.type.replace('_', ' ')}</span>
                <span className="text-white/60">{m.description}</span>
                {m.date && (
                  <span className="text-[10px] text-white/20 font-mono ml-auto shrink-0">
                    {new Date(m.date).toLocaleDateString()}
                    {m.recurring && ' (yearly)'}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Talking Points */}
      {((person.talkingPoints as TalkingPoint[])?.filter(tp => tp.active !== false)?.length ?? 0) > 0 && (
        <div className="glass rounded-xl p-6 mb-6 neon-border">
          <h3 className="text-sm font-medium text-white/30 uppercase tracking-wider mb-3">Talking Points</h3>
          <div className="space-y-2">
            {(person.talkingPoints as TalkingPoint[]).filter(tp => tp.active !== false).map((tp) => (
              <div key={tp.id} className="flex items-start gap-2 text-sm">
                <span className="text-neon-green/40 mt-0.5">-</span>
                <div>
                  <p className="text-white/60">{tp.text}</p>
                  {tp.context && <p className="text-xs text-white/20 mt-0.5">{tp.context}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reciprocity Index */}
      {reciprocity && reciprocity.breakdown.totalInteractions > 0 && (
        <div className="glass rounded-xl p-6 mb-6 neon-border">
          <h3 className="text-sm font-medium text-white/30 uppercase tracking-wider mb-3">Reciprocity Index</h3>
          <div className="flex items-center gap-4 mb-3">
            <div className="relative w-16 h-16">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" className="text-white/5" strokeWidth="3" />
                <circle cx="18" cy="18" r="16" fill="none"
                  stroke={reciprocity.score >= 40 && reciprocity.score <= 60 ? '#00ff88' : reciprocity.score >= 25 ? '#ffff00' : '#ff4444'}
                  strokeWidth="3" strokeDasharray={`${reciprocity.score} ${100 - reciprocity.score}`} strokeLinecap="round" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-mono text-white/70">{reciprocity.score}</span>
            </div>
            <div>
              <span className={`text-sm font-mono uppercase tracking-wider ${
                reciprocity.assessment === 'balanced' ? 'text-neon-green' :
                reciprocity.assessment === 'one-sided' ? 'text-red-400' :
                'text-neon-yellow'
              }`}>
                {reciprocity.assessment.replace('-', ' ')}
              </span>
              <div className="text-xs text-white/30 mt-1">
                You initiated: {reciprocity.breakdown.youInitiated} | They initiated: {reciprocity.breakdown.theyInitiated}
                {reciprocity.breakdown.unknownInitiator > 0 && ` | Unknown: ${reciprocity.breakdown.unknownInitiator}`}
              </div>
              {reciprocity.breakdown.interactionFrequencyDays && (
                <div className="text-xs text-white/20 mt-0.5">
                  Avg {reciprocity.breakdown.interactionFrequencyDays}d between interactions
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Co-Attendance */}
      {coAttendance && coAttendance.length > 0 && (
        <div className="glass rounded-xl p-6 mb-6 neon-border">
          <h3 className="text-sm font-medium text-white/30 uppercase tracking-wider mb-3">Frequently Co-Attending</h3>
          <div className="space-y-1">
            {coAttendance.slice(0, 8).map((ca) => (
              <div key={ca.personId} className="flex items-center justify-between text-sm">
                <Link to={`/people/${ca.personId}`} className="text-neon-cyan/70 hover:text-neon-cyan transition-colors">
                  {ca.personName || ca.personId.slice(0, 8)}
                </Link>
                <span className="text-xs text-white/20 font-mono">{ca.sharedEventCount} shared events</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-white/30 uppercase tracking-wider">Interaction History</h3>
        <Button onClick={() => setShowLogInteraction(true)}>+ Log Interaction</Button>
      </div>
      <div className="space-y-2">
        {(interactions as Interaction[] | undefined)?.map((interaction) => (
          <div key={interaction.id} className="glass rounded-lg p-4 hover:bg-white/[0.07] transition-colors">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-neon-green/70 uppercase tracking-wider">{interaction.type}</span>
                {interaction.sentiment && (
                  <span className={`w-2 h-2 rounded-full ${
                    interaction.sentiment === 'positive' ? 'bg-neon-green' :
                    interaction.sentiment === 'negative' ? 'bg-red-400' :
                    'bg-white/30'
                  }`} title={`Sentiment: ${interaction.sentiment}`} />
                )}
                {interaction.energy && (
                  <span className="text-[10px] text-white/20 font-mono" title={`Energy: ${interaction.energy}/5`}>
                    {'|'.repeat(interaction.energy)}{'·'.repeat(5 - interaction.energy)}
                  </span>
                )}
              </div>
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
