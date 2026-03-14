import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import EntityMap from '../components/EntityMap.js';
import type { FollowUp } from '@mycelio/shared';
import { Link } from 'react-router-dom';

export default function Overview() {
  const { data: peopleRes } = useQuery({ queryKey: ['people'], queryFn: () => api.getPeople() });
  const { data: eventsRes } = useQuery({ queryKey: ['events'], queryFn: api.getEvents });
  const { data: orgsRes } = useQuery({ queryKey: ['organizations'], queryFn: () => api.getOrganizations() });
  const { data: followUpsRes } = useQuery({ queryKey: ['follow-ups'], queryFn: api.getFollowUps });

  const people = peopleRes?.data || [];
  const events = eventsRes?.data || [];
  const orgs = orgsRes?.data || [];
  const followUps = (followUpsRes?.data || []) as FollowUp[];
  const overdueCount = followUps.filter((f: FollowUp) => f.overdue).length;

  return (
    <div>
      <h2 className="text-2xl font-bold tracking-wide neon-text mb-6">Overview</h2>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="People" value={people.length} href="/people" color="cyan" />
        <StatCard label="Events" value={events.length} href="/events" color="magenta" />
        <StatCard label="Organisations" value={orgs.length} href="/organisations" color="green" />
        <StatCard label="Overdue" value={overdueCount} href="/follow-ups" color={overdueCount > 0 ? 'magenta' : 'cyan'} />
      </div>

      {/* Entity Relationship Map */}
      <EntityMap />
    </div>
  );
}

function StatCard({ label, value, href, color }: { label: string; value: number; href: string; color: string }) {
  const colorMap: Record<string, string> = {
    cyan: 'neon-text',
    magenta: 'neon-text-magenta',
    green: 'neon-text-green',
  };

  return (
    <Link to={href} className="glass rounded-xl p-4 hover:bg-white/[0.07] transition-all group">
      <p className="text-[10px] text-white/30 uppercase tracking-wider">{label}</p>
      <p className={`text-3xl font-mono font-bold mt-1 ${colorMap[color] || 'neon-text'}`}>{value}</p>
    </Link>
  );
}
