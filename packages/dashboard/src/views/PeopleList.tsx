import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePeople } from '../hooks/usePeople.js';
import SearchBar from '../components/SearchBar.js';

const tierLabels: Record<number, string> = {
  1: 'Inner Circle',
  2: 'Key',
  3: 'Active',
  4: 'Extended',
  5: 'Acquaintance',
};

const tierGlow: Record<number, string> = {
  1: 'text-neon-magenta border-neon-magenta/30 bg-neon-magenta/10',
  2: 'text-neon-cyan border-neon-cyan/30 bg-neon-cyan/10',
  3: 'text-neon-green border-neon-green/30 bg-neon-green/10',
  4: 'text-neon-yellow border-neon-yellow/30 bg-neon-yellow/10',
  5: 'text-white/40 border-white/10 bg-white/5',
};

export default function PeopleList() {
  const [search, setSearch] = useState('');
  const { data: people, isLoading, error } = usePeople(search ? { q: search } : undefined);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold tracking-wide neon-text">People</h2>
      </div>

      <div className="mb-6 max-w-md">
        <SearchBar onSearch={setSearch} placeholder="Search people..." />
      </div>

      {isLoading && <p className="text-white/30 animate-pulse">Loading...</p>}
      {error && <p className="text-red-400">Error: {(error as Error).message}</p>}

      <div className="glass rounded-xl overflow-hidden">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="px-6 py-3 text-left text-[10px] font-medium text-white/30 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-[10px] font-medium text-white/30 uppercase tracking-wider">Title</th>
              <th className="px-6 py-3 text-left text-[10px] font-medium text-white/30 uppercase tracking-wider">Tier</th>
              <th className="px-6 py-3 text-left text-[10px] font-medium text-white/30 uppercase tracking-wider">Tags</th>
              <th className="px-6 py-3 text-left text-[10px] font-medium text-white/30 uppercase tracking-wider">Last Contact</th>
            </tr>
          </thead>
          <tbody>
            {people?.map((person) => (
              <tr key={person.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="px-6 py-4">
                  <Link to={`/people/${person.id}`} className="text-neon-cyan hover:text-neon-cyan/80 font-medium transition-colors">
                    {person.name}
                  </Link>
                  {person.email && <p className="text-xs text-white/20 mt-0.5">{person.email}</p>}
                </td>
                <td className="px-6 py-4 text-sm text-white/40">{person.title || '—'}</td>
                <td className="px-6 py-4">
                  <span className={`inline-block px-2 py-0.5 text-[10px] uppercase tracking-wider rounded border ${tierGlow[person.tier]}`}>
                    {tierLabels[person.tier]}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-1 flex-wrap">
                    {person.tags.map((tag) => (
                      <span key={tag} className="px-2 py-0.5 text-[10px] bg-white/5 text-white/30 rounded border border-white/5">
                        {tag}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-white/30">
                  {person.lastContactAt
                    ? new Date(person.lastContactAt).toLocaleDateString()
                    : '—'}
                </td>
              </tr>
            ))}
            {people?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-white/20">
                  No people found. Add someone via the API or Claude Code.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
