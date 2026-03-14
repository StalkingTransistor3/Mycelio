import { useCommunities, useCommunityHealth } from '../hooks/useCommunities.js';
import type { Community } from '@mycelio/shared';

function CommunityCard({ community }: { community: Community }) {
  const { data: health } = useCommunityHealth(community.id);

  return (
    <div className="glass rounded-xl p-5 hover:bg-white/[0.07] transition-all duration-200">
      <h3 className="font-semibold text-white">{community.name}</h3>
      {community.description && (
        <p className="text-sm text-white/30 mt-1">{community.description}</p>
      )}

      {health && (
        <>
          <div className="glow-line my-3" />
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Members" value={health.memberCount} />
            <Stat label="Avg Tier" value={health.avgTier} />
            <Stat label="Activity" value={health.recentInteractions} />
            <Stat
              label="Stale"
              value={health.staleMemberCount}
              warn={health.staleMemberCount > 0}
            />
          </div>
        </>
      )}

      <div className="mt-3 flex gap-1 flex-wrap">
        {community.tags.map((tag: string) => (
          <span key={tag} className="px-2 py-0.5 text-[10px] bg-neon-purple/10 text-neon-purple/60 rounded border border-neon-purple/20">
            {tag}
          </span>
        ))}
      </div>
    </div>
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

export default function CommunityDashboard() {
  const { data: communities, isLoading, error } = useCommunities();

  return (
    <div>
      <h2 className="text-2xl font-bold tracking-wide neon-text mb-6">Communities</h2>

      {isLoading && <p className="text-white/30 animate-pulse">Loading...</p>}
      {error && <p className="text-red-400">Error: {(error as Error).message}</p>}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {communities?.map((community) => (
          <CommunityCard key={community.id} community={community} />
        ))}
        {communities?.length === 0 && (
          <p className="text-white/20 col-span-full text-center py-12">
            No communities yet. Create one via the API or Claude Code.
          </p>
        )}
      </div>
    </div>
  );
}
