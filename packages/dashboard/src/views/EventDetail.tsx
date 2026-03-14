import { useParams, Link } from 'react-router-dom';
import { useEvent } from '../hooks/useEvents.js';
import { api } from '../api/client.js';
import { useQuery } from '@tanstack/react-query';
import type { Person, EventAttendee } from '@mycelio/shared';

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: event, isLoading } = useEvent(id!);

  const { data: attendees } = useQuery({
    queryKey: ['event-attendees', id],
    queryFn: async () => {
      if (!event?.attendeeIds?.length) return [];
      const results: Person[] = [];
      for (const aid of event.attendeeIds) {
        try {
          const res = await api.getPerson(aid);
          results.push(res.data as Person);
        } catch {
          // attendee may have been deleted
        }
      }
      return results;
    },
    enabled: !!event?.attendeeIds?.length,
  });

  if (isLoading) return <p className="text-white/30 animate-pulse">Loading...</p>;
  if (!event) return <p className="text-red-400">Event not found</p>;

  const eventDate = new Date(event.date);
  const isPast = eventDate < new Date();

  return (
    <div>
      <Link to="/events" className="text-neon-cyan/60 hover:text-neon-cyan text-sm mb-4 inline-block transition-colors">
        &larr; Back to Events
      </Link>

      <div className="glass rounded-xl p-6 mb-6 neon-border">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-wide text-white">{event.name}</h2>
            <p className={`text-sm font-mono mt-1 ${isPast ? 'text-white/30' : 'text-neon-cyan'}`}>
              {eventDate.toLocaleDateString(undefined, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
              {' at '}
              {eventDate.toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
            {event.location && (
              <p className="text-sm text-white/40 mt-1">{event.location}</p>
            )}
          </div>
          <span className={`text-xs font-mono tracking-wider px-2 py-1 rounded border ${
            isPast
              ? 'text-white/30 border-white/10 bg-white/5'
              : 'text-neon-green border-neon-green/30 bg-neon-green/10'
          }`}>
            {isPast ? 'Past' : 'Upcoming'}
          </span>
        </div>

        {event.url && (
          <a
            href={event.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 text-sm font-mono text-neon-cyan border border-neon-cyan/30 rounded-lg bg-neon-cyan/5 hover:bg-neon-cyan/10 transition-colors"
          >
            External Link &rarr;
          </a>
        )}

        {event.description && (
          <div className="mt-4 p-3 bg-white/5 rounded-lg text-sm text-white/50 border border-white/5">
            {event.description}
          </div>
        )}

        {event.tags.length > 0 && (
          <div className="mt-4 flex gap-2 flex-wrap">
            {event.tags.map((tag: string) => (
              <span key={tag} className="px-2 py-1 text-xs bg-neon-magenta/10 text-neon-magenta/60 rounded border border-neon-magenta/20">
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="glow-line my-4" />

        <div>
          <h3 className="text-sm font-medium text-white/30 uppercase tracking-wider mb-3">
            Attendees ({event.attendeeIds.length})
          </h3>
          {attendees && attendees.length > 0 ? (
            (() => {
              // Build role map from structured attendees
              const roleMap = new Map<string, string>();
              const structuredAttendees = (event.attendees || []) as EventAttendee[];
              for (const a of structuredAttendees) {
                roleMap.set(a.personId, a.role);
              }

              // Group attendees by role
              const roleOrder = ['speaker', 'organizer', 'host', 'sponsor', 'volunteer', 'attendee'];
              const roleLabels: Record<string, string> = {
                speaker: 'Speakers', organizer: 'Organizers', host: 'Hosts',
                sponsor: 'Sponsors', volunteer: 'Volunteers', attendee: 'Attendees',
              };
              const roleColors: Record<string, string> = {
                speaker: 'text-neon-magenta', organizer: 'text-neon-cyan',
                host: 'text-neon-green', sponsor: 'text-neon-yellow',
                volunteer: 'text-neon-purple', attendee: 'text-white/60',
              };

              const grouped: Record<string, Person[]> = {};
              for (const person of attendees) {
                const role = roleMap.get(person.id) || 'attendee';
                if (!grouped[role]) grouped[role] = [];
                grouped[role].push(person);
              }

              const sortedRoles = roleOrder.filter(r => grouped[r]?.length > 0);
              // If no structured roles, just show all as one flat list
              if (structuredAttendees.length === 0) {
                return (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {attendees.map((person) => (
                      <Link key={person.id} to={`/people/${person.id}`} className="glass rounded-lg p-3 hover:bg-white/[0.07] transition-colors group">
                        <p className="text-sm text-white group-hover:text-neon-cyan transition-colors">{person.name}</p>
                        {person.title && <p className="text-xs text-white/30 mt-0.5">{person.title}</p>}
                      </Link>
                    ))}
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  {sortedRoles.map(role => (
                    <div key={role}>
                      <p className={`text-xs font-mono uppercase tracking-wider mb-2 ${roleColors[role] || 'text-white/40'}`}>
                        {roleLabels[role] || role} ({grouped[role].length})
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {grouped[role].map((person) => (
                          <Link key={person.id} to={`/people/${person.id}`} className="glass rounded-lg p-3 hover:bg-white/[0.07] transition-colors group">
                            <p className="text-sm text-white group-hover:text-neon-cyan transition-colors">{person.name}</p>
                            {person.title && <p className="text-xs text-white/30 mt-0.5">{person.title}</p>}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()
          ) : event.attendeeIds.length === 0 ? (
            <p className="text-white/20 text-sm">No attendees recorded.</p>
          ) : (
            <p className="text-white/30 animate-pulse text-sm">Loading attendees...</p>
          )}
        </div>
      </div>
    </div>
  );
}
