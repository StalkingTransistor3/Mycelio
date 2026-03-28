import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useEvent } from '../hooks/useEvents.js';
import { api } from '../api/client.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Person, EventAttendee, Task, ProjectWithTasks } from '@mycelio/shared';

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { data: event, isLoading } = useEvent(id!);
  const [togglingTaskId, setTogglingTaskId] = useState<string | null>(null);

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

  const { data: eventProject, isLoading: isLoadingProject } = useQuery({
    queryKey: ['event-project', id],
    queryFn: async () => {
      const res = await api.getEventProject(id!);
      return res.data as ProjectWithTasks | null;
    },
    enabled: !!id,
  });

  const createChecklistMutation = useMutation({
    mutationFn: () => api.createEventProject(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-project', id] });
    },
  });

  const toggleTaskMutation = useMutation({
    mutationFn: async ({ taskId, currentStatus }: { taskId: string; currentStatus: string }) => {
      const newStatus = currentStatus === 'done' ? 'todo' : 'done';
      return api.updateTask(taskId, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-project', id] });
    },
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

      {/* Tasks / Checklist Section */}
      <div className="glass rounded-xl p-6 neon-border">
        <h3 className="text-sm font-medium text-white/30 uppercase tracking-wider mb-4">
          Event Checklist
        </h3>

        {isLoadingProject ? (
          <p className="text-white/30 animate-pulse text-sm">Loading checklist...</p>
        ) : !eventProject ? (
          <div className="text-center py-6">
            <p className="text-white/20 text-sm mb-4">No checklist created for this event yet.</p>
            <button
              onClick={() => createChecklistMutation.mutate()}
              disabled={createChecklistMutation.isPending}
              className="px-6 py-2 text-sm font-mono text-neon-cyan border border-neon-cyan/30 rounded-lg bg-neon-cyan/5 hover:bg-neon-cyan/15 transition-colors disabled:opacity-50"
            >
              {createChecklistMutation.isPending ? 'Creating...' : 'Create Event Checklist'}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {eventProject.tasks && eventProject.tasks.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-white/30 font-mono">
                    {eventProject.tasks.filter((t: Task) => t.status === 'done').length} / {eventProject.tasks.length} completed
                  </p>
                  <Link
                    to={`/projects/${eventProject.id}`}
                    className="text-xs text-neon-cyan/50 hover:text-neon-cyan transition-colors"
                  >
                    View Project &rarr;
                  </Link>
                </div>
                {/* Progress bar */}
                <div className="w-full h-1.5 bg-white/5 rounded-full mb-4 overflow-hidden">
                  <div
                    className="h-full bg-neon-cyan/60 rounded-full transition-all duration-500"
                    style={{
                      width: `${eventProject.tasks.length > 0 ? Math.round((eventProject.tasks.filter((t: Task) => t.status === 'done').length / eventProject.tasks.length) * 100) : 0}%`,
                    }}
                  />
                </div>
                {eventProject.tasks.map((task: Task) => {
                  const isDone = task.status === 'done';
                  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
                  const isOverdue = dueDate && dueDate < new Date() && !isDone;
                  const isToggling = togglingTaskId === task.id;

                  return (
                    <button
                      key={task.id}
                      onClick={() => {
                        setTogglingTaskId(task.id);
                        toggleTaskMutation.mutate(
                          { taskId: task.id, currentStatus: task.status },
                          { onSettled: () => setTogglingTaskId(null) }
                        );
                      }}
                      disabled={isToggling}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                        isDone
                          ? 'bg-white/[0.02] border-white/5'
                          : isOverdue
                            ? 'bg-red-500/5 border-red-500/20 hover:bg-red-500/10'
                            : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06]'
                      } ${isToggling ? 'opacity-50' : ''}`}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        isDone
                          ? 'bg-neon-green/20 border-neon-green/50'
                          : 'border-white/20'
                      }`}>
                        {isDone && (
                          <svg className="w-3 h-3 text-neon-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${isDone ? 'text-white/30 line-through' : 'text-white/80'}`}>
                          {task.title}
                        </p>
                      </div>
                      {dueDate && (
                        <span className={`text-xs font-mono flex-shrink-0 ${
                          isDone
                            ? 'text-white/20'
                            : isOverdue
                              ? 'text-red-400'
                              : 'text-white/30'
                        }`}>
                          {dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </button>
                  );
                })}
              </>
            ) : (
              <p className="text-white/20 text-sm">No tasks in checklist.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
