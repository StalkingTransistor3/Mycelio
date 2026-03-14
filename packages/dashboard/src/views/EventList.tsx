import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useEvents } from '../hooks/useEvents.js';
import AddEventForm from '../components/AddEventForm.js';
import { Button } from '../components/FormField.js';
import type { Event } from '@mycelio/shared';

export default function EventList() {
  const { data: events, isLoading, error } = useEvents();
  const [showAdd, setShowAdd] = useState(false);

  const { upcoming, past } = useMemo(() => {
    if (!events) return { upcoming: [], past: [] };
    const now = new Date();
    const upcoming: Event[] = [];
    const past: Event[] = [];
    for (const e of events) {
      if (new Date(e.date) >= now) upcoming.push(e);
      else past.push(e);
    }
    // upcoming: soonest first; past: most recent first
    upcoming.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    past.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return { upcoming, past };
  }, [events]);

  const renderCard = (event: Event, dimmed: boolean) => (
    <Link
      key={event.id}
      to={`/events/${event.id}`}
      className={`glass rounded-xl p-5 hover:bg-white/[0.07] transition-all duration-200 group block ${dimmed ? 'opacity-60' : ''}`}
    >
      <h3 className="font-semibold text-white group-hover:text-neon-cyan transition-colors">{event.name}</h3>
      <p className={`text-xs font-mono mt-1 ${dimmed ? 'text-white/30' : 'text-neon-cyan/70'}`}>
        {new Date(event.date).toLocaleDateString(undefined, {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })}
      </p>
      {event.location && (
        <p className="text-xs text-white/20 mt-1">{event.location}</p>
      )}
      {event.description && (
        <p className="text-sm text-white/40 mt-3 line-clamp-2">{event.description}</p>
      )}
      <div className="glow-line my-3" />
      <div className="flex items-center justify-between">
        <div className="flex gap-1 flex-wrap">
          {event.tags.map((tag: string) => (
            <span key={tag} className="px-2 py-0.5 text-[10px] bg-neon-magenta/10 text-neon-magenta/60 rounded border border-neon-magenta/20">
              {tag}
            </span>
          ))}
        </div>
        <span className="text-[10px] text-white/20 font-mono">
          {event.attendeeIds.length} attendee{event.attendeeIds.length !== 1 ? 's' : ''}
        </span>
      </div>
    </Link>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold tracking-wide neon-text">Events</h2>
        <Button onClick={() => setShowAdd(true)}>+ Add Event</Button>
      </div>

      {isLoading && <p className="text-white/30 animate-pulse">Loading...</p>}
      {error && <p className="text-red-400">Error: {(error as Error).message}</p>}

      {upcoming.length > 0 && (
        <>
          <h3 className="text-sm font-medium text-neon-green/70 uppercase tracking-wider mb-3">Upcoming</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
            {upcoming.map((e) => renderCard(e, false))}
          </div>
        </>
      )}

      {past.length > 0 && (
        <>
          <h3 className="text-sm font-medium text-white/30 uppercase tracking-wider mb-3">Past</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {past.map((e) => renderCard(e, true))}
          </div>
        </>
      )}

      {events?.length === 0 && (
        <p className="text-white/20 text-center py-12">
          No events yet. Click "+ Add Event" to create one.
        </p>
      )}

      <AddEventForm open={showAdd} onClose={() => setShowAdd(false)} />
    </div>
  );
}
