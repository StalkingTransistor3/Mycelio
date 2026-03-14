import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import type { Venue } from '@mycelio/shared';

export default function VenueList() {
  const { data: venues, isLoading, error } = useQuery({
    queryKey: ['venues'],
    queryFn: () => api.getVenues(),
    select: (res) => res.data as Venue[],
  });

  return (
    <div>
      <h2 className="text-2xl font-bold tracking-wide neon-text mb-6">Venues</h2>

      {isLoading && <p className="text-white/30 animate-pulse">Loading...</p>}
      {error && <p className="text-red-400">Error: {(error as Error).message}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {venues?.map((venue) => (
          <div key={venue.id} className="glass rounded-xl p-5 neon-border hover:bg-white/[0.07] transition-colors">
            <h3 className="text-lg font-medium text-white/80">{venue.name}</h3>
            {venue.address && <p className="text-sm text-white/30 mt-1">{venue.address}</p>}

            <div className="flex flex-wrap gap-2 mt-3">
              {venue.capacity && (
                <span className="px-2 py-1 text-xs bg-neon-cyan/10 text-neon-cyan/60 rounded border border-neon-cyan/20">
                  Cap: {venue.capacity}
                </span>
              )}
              {venue.vibe?.map((v: string) => (
                <span key={v} className="px-2 py-1 text-xs bg-neon-purple/10 text-neon-purple/60 rounded border border-neon-purple/20">
                  {v}
                </span>
              ))}
              {venue.tags?.map((t: string) => (
                <span key={t} className="px-2 py-1 text-xs bg-white/5 text-white/30 rounded border border-white/10">
                  {t}
                </span>
              ))}
            </div>

            {venue.availability && (() => {
              const av = venue.availability as { days?: string[]; hours?: string; bookingNotes?: string };
              return (av.days || av.hours) ? (
                <div className="mt-3 text-xs text-white/20">
                  {av.days && <span>{av.days.join(', ')}</span>}
                  {av.hours && <span> | {av.hours}</span>}
                </div>
              ) : null;
            })()}

            {venue.notes && (
              <p className="text-xs text-white/20 mt-2 line-clamp-2">{venue.notes}</p>
            )}
          </div>
        ))}
      </div>

      {venues?.length === 0 && (
        <p className="text-white/20 text-sm py-8 text-center">No venues added yet.</p>
      )}
    </div>
  );
}
