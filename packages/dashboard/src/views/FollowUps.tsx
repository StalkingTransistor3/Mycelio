import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { Link } from 'react-router-dom';
import type { FollowUp } from '@mycelio/shared';

const tierLabels: Record<number, string> = {
  1: 'Inner Circle',
  2: 'Key',
  3: 'Active',
  4: 'Extended',
  5: 'Acquaintance',
};

export default function FollowUps() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['follow-ups'],
    queryFn: api.getFollowUps,
    select: (res) => res.data as FollowUp[],
  });

  return (
    <div>
      <h2 className="text-2xl font-bold tracking-wide neon-text mb-6">Follow-ups</h2>

      {isLoading && <p className="text-white/30 animate-pulse">Loading...</p>}
      {error && <p className="text-red-400">Error: {(error as Error).message}</p>}

      {/* Summary stats */}
      {data && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="glass rounded-lg p-4 text-center">
            <div className="text-2xl font-mono neon-text-magenta">{data.filter(f => f.overdue).length}</div>
            <div className="text-[10px] uppercase tracking-wider text-white/30 mt-1">Overdue</div>
          </div>
          <div className="glass rounded-lg p-4 text-center">
            <div className="text-2xl font-mono text-red-400">{data.filter(f => f.coolingAlert).length}</div>
            <div className="text-[10px] uppercase tracking-wider text-white/30 mt-1">Cooling</div>
          </div>
          <div className="glass rounded-lg p-4 text-center">
            <div className="text-2xl font-mono text-neon-yellow">{data.filter(f => f.upcomingMilestone).length}</div>
            <div className="text-[10px] uppercase tracking-wider text-white/30 mt-1">Milestones</div>
          </div>
          <div className="glass rounded-lg p-4 text-center">
            <div className="text-2xl font-mono text-neon-cyan">{data.length}</div>
            <div className="text-[10px] uppercase tracking-wider text-white/30 mt-1">Total</div>
          </div>
        </div>
      )}

      <div className="glass rounded-xl overflow-hidden">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="px-6 py-3 text-left text-[10px] font-medium text-white/30 uppercase tracking-wider">Person</th>
              <th className="px-6 py-3 text-left text-[10px] font-medium text-white/30 uppercase tracking-wider">Tier</th>
              <th className="px-6 py-3 text-left text-[10px] font-medium text-white/30 uppercase tracking-wider">Last Contact</th>
              <th className="px-6 py-3 text-left text-[10px] font-medium text-white/30 uppercase tracking-wider">Days Since</th>
              <th className="px-6 py-3 text-left text-[10px] font-medium text-white/30 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-[10px] font-medium text-white/30 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((fu) => (
              <tr key={fu.personId} className={`border-b border-white/5 transition-colors ${
                fu.coolingAlert ? 'bg-red-400/5 hover:bg-red-400/10' :
                fu.overdue ? 'bg-neon-magenta/5 hover:bg-neon-magenta/10' :
                'hover:bg-white/5'
              }`}>
                <td className="px-6 py-4">
                  <Link to={`/people/${fu.personId}`} className="text-neon-cyan hover:text-neon-cyan/80 font-medium transition-colors">
                    {fu.personName}
                  </Link>
                </td>
                <td className="px-6 py-4 text-sm text-white/30 font-mono">
                  T{fu.tier} {tierLabels[fu.tier]}
                </td>
                <td className="px-6 py-4 text-sm text-white/30 font-mono">
                  {fu.lastContactAt ? new Date(fu.lastContactAt).toLocaleDateString() : 'Never'}
                </td>
                <td className="px-6 py-4 text-sm font-mono">
                  <span className={fu.overdue ? 'text-neon-magenta' : 'text-white/30'}>
                    {fu.daysSinceContact !== null ? `${fu.daysSinceContact}d` : '--'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {fu.coolingAlert && (
                      <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider bg-red-400/10 text-red-400 rounded border border-red-400/20">
                        Cooling
                      </span>
                    )}
                    {fu.overdue && (
                      <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider bg-neon-magenta/10 text-neon-magenta rounded border border-neon-magenta/20">
                        Overdue
                      </span>
                    )}
                    {fu.upcomingMilestone && (
                      <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider bg-neon-yellow/10 text-neon-yellow rounded border border-neon-yellow/20">
                        {fu.upcomingMilestone.type.replace('_', ' ')} in {fu.upcomingMilestone.daysUntil}d
                      </span>
                    )}
                    {fu.snoozedUntil && new Date(fu.snoozedUntil) > new Date() && (
                      <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider bg-white/5 text-white/30 rounded border border-white/10">
                        Snoozed
                      </span>
                    )}
                    {!fu.overdue && !fu.coolingAlert && !fu.upcomingMilestone && (
                      <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider bg-neon-green/10 text-neon-green/60 rounded border border-neon-green/20">
                        Upcoming
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-xs text-white/40 max-w-[200px]">
                  {fu.suggestedAction || '--'}
                </td>
              </tr>
            ))}
            {data?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-white/20">
                  No follow-ups needed. You're all caught up.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
