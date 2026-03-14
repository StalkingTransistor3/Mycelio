import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { Link } from 'react-router-dom';

interface PipelinePerson {
  id: string;
  name: string;
  tier: number;
  lastContactAt: string | null;
  daysSinceContact: number | null;
}

const STAGES = ['prospect', 'warm', 'active', 'collaborator', 'inner_circle'] as const;

const stageColors: Record<string, { bg: string; border: string; text: string; header: string }> = {
  prospect: { bg: 'bg-white/5', border: 'border-white/10', text: 'text-white/40', header: 'text-white/50' },
  warm: { bg: 'bg-neon-yellow/5', border: 'border-neon-yellow/20', text: 'text-neon-yellow/70', header: 'text-neon-yellow' },
  active: { bg: 'bg-neon-green/5', border: 'border-neon-green/20', text: 'text-neon-green/70', header: 'text-neon-green' },
  collaborator: { bg: 'bg-neon-cyan/5', border: 'border-neon-cyan/20', text: 'text-neon-cyan/70', header: 'text-neon-cyan' },
  inner_circle: { bg: 'bg-neon-magenta/5', border: 'border-neon-magenta/20', text: 'text-neon-magenta/70', header: 'text-neon-magenta' },
};

const stageLabels: Record<string, string> = {
  prospect: 'Prospect',
  warm: 'Warm',
  active: 'Active',
  collaborator: 'Collaborator',
  inner_circle: 'Inner Circle',
};

const tierGlow: Record<number, string> = {
  1: 'text-neon-magenta/60',
  2: 'text-neon-cyan/60',
  3: 'text-neon-green/60',
  4: 'text-neon-yellow/60',
  5: 'text-white/30',
};

export default function PipelineView() {
  const { data: pipelineData, isLoading, error } = useQuery({
    queryKey: ['pipeline'],
    queryFn: api.getPipeline,
    select: (res) => (res as any).data as Record<string, PipelinePerson[]>,
  });

  return (
    <div>
      <h2 className="text-2xl font-bold tracking-wide neon-text mb-6">Relationship Pipeline</h2>

      {isLoading && <p className="text-white/30 animate-pulse">Loading...</p>}
      {error && <p className="text-red-400">Error: {(error as Error).message}</p>}

      {pipelineData && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map((stage) => {
            const people = pipelineData[stage] || [];
            const colors = stageColors[stage];
            return (
              <div key={stage} className="flex-shrink-0 w-64">
                <div className={`rounded-t-lg px-4 py-3 ${colors.bg} border ${colors.border} border-b-0`}>
                  <div className="flex items-center justify-between">
                    <h3 className={`text-sm font-medium uppercase tracking-wider ${colors.header}`}>
                      {stageLabels[stage]}
                    </h3>
                    <span className={`text-xs font-mono ${colors.text}`}>{people.length}</span>
                  </div>
                </div>
                <div className={`rounded-b-lg border ${colors.border} border-t-0 min-h-[200px] max-h-[600px] overflow-y-auto`}>
                  {people.map((p) => (
                    <Link
                      key={p.id}
                      to={`/people/${p.id}`}
                      className={`block px-4 py-3 border-b border-white/5 hover:${colors.bg} transition-colors`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white/70 truncate">{p.name}</span>
                        <span className={`text-[10px] font-mono ${tierGlow[p.tier]}`}>T{p.tier}</span>
                      </div>
                      <div className="text-[10px] text-white/20 mt-0.5">
                        {p.daysSinceContact !== null ? `${p.daysSinceContact}d ago` : 'No contact'}
                      </div>
                    </Link>
                  ))}
                  {people.length === 0 && (
                    <div className="px-4 py-8 text-center text-white/10 text-xs">Empty</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
