import { useEvents } from '../hooks/useEvents.js';

export default function EventList() {
  const { data: events, isLoading, error } = useEvents();

  return (
    <div>
      <h2 className="text-2xl font-bold tracking-wide neon-text mb-6">Events</h2>

      {isLoading && <p className="text-white/30 animate-pulse">Loading...</p>}
      {error && <p className="text-red-400">Error: {(error as Error).message}</p>}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {events?.map((event) => (
          <div key={event.id} className="glass rounded-xl p-5 hover:bg-white/[0.07] transition-all duration-200 group">
            <h3 className="font-semibold text-white group-hover:text-neon-cyan transition-colors">{event.name}</h3>
            <p className="text-xs font-mono text-neon-cyan/40 mt-1">
              {new Date(event.date).toLocaleDateString(undefined, {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </p>
            {event.location && (
              <p className="text-xs text-white/20 mt-1">◇ {event.location}</p>
            )}
            {event.description && (
              <p className="text-sm text-white/40 mt-3">{event.description}</p>
            )}
            <div className="glow-line my-3" />
            <div className="flex items-center justify-between">
              <div className="flex gap-1 flex-wrap">
                {event.tags.map((tag) => (
                  <span key={tag} className="px-2 py-0.5 text-[10px] bg-neon-magenta/10 text-neon-magenta/60 rounded border border-neon-magenta/20">
                    {tag}
                  </span>
                ))}
              </div>
              <span className="text-[10px] text-white/20 font-mono">
                {event.attendeeIds.length} attendee{event.attendeeIds.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        ))}
        {events?.length === 0 && (
          <p className="text-white/20 col-span-full text-center py-12">
            No events yet. Create one via the API or Claude Code.
          </p>
        )}
      </div>
    </div>
  );
}
