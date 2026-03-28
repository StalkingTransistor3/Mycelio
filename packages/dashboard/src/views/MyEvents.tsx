import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import type { Event, Task, ProjectWithTasks } from '@mycelio/shared';

export default function MyEvents() {
  const qc = useQueryClient();
  const { data: eventsData, isLoading } = useQuery({
    queryKey: ['my-events'],
    queryFn: () => api.getMyEvents(),
  });

  const events = (eventsData?.data || []) as Event[];
  const now = new Date();

  const upcoming = events
    .filter((e) => new Date(e.date) >= now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const past = events
    .filter((e) => new Date(e.date) < now)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (isLoading) return <p className="text-white/30 animate-pulse">Loading...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-wide neon-text">My Events</h2>
          <p className="text-xs text-white/20 mt-1">
            Events you're organizing · {upcoming.length} upcoming · {past.length} past
          </p>
        </div>
        <Link
          to="/events"
          className="text-xs text-white/30 hover:text-white/60 transition-colors"
        >
          View all events →
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="text-center text-white/20 py-12">
          <p>No events marked as yours yet.</p>
          <p className="text-xs mt-2">
            Edit an event and set "isOrganizer" to flag it as your event.
          </p>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-3">
                Upcoming
              </h3>
              <div className="space-y-3">
                {upcoming.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-3">
                Past
              </h3>
              <div className="space-y-3">
                {past.map((event) => (
                  <EventCard key={event.id} event={event} isPast />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EventCard({ event, isPast }: { event: Event; isPast?: boolean }) {
  const qc = useQueryClient();
  const eventDate = new Date(event.date);
  const now = new Date();
  const daysAway = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  const { data: projectData } = useQuery({
    queryKey: ['event-project', event.id],
    queryFn: () => api.getEventProject(event.id),
  });

  const createProject = useMutation({
    mutationFn: () => api.createEventProject(event.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event-project', event.id] });
    },
  });

  const toggleTask = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: string }) =>
      api.updateTask(taskId, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event-project', event.id] });
    },
  });

  const project = projectData?.data as ProjectWithTasks | null;
  const tasks = (project as ProjectWithTasks & { tasks?: Task[] })?.tasks || [];
  const doneTasks = tasks.filter((t) => t.status === 'done').length;
  const totalTasks = tasks.length;
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const urgencyColor = isPast
    ? 'text-white/30'
    : daysAway <= 3
      ? 'text-red-400'
      : daysAway <= 7
        ? 'text-yellow-400'
        : 'text-neon-cyan';

  const statusBadge = event.status || 'upcoming';

  return (
    <div className={`glass rounded-xl p-4 neon-border ${isPast ? 'opacity-50' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <Link
            to={`/events/${event.id}`}
            className="text-lg font-semibold text-white hover:text-neon-cyan transition-colors"
          >
            {event.name}
          </Link>
          <div className="flex items-center gap-3 mt-1">
            <span className={`text-sm font-mono ${urgencyColor}`}>
              {eventDate.toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
              {!isPast && (
                <span className="ml-2 text-xs">
                  {daysAway === 0
                    ? 'TODAY'
                    : daysAway === 1
                      ? 'TOMORROW'
                      : `${daysAway}d away`}
                </span>
              )}
            </span>
            {event.location && (
              <span className="text-xs text-white/30">{event.location}</span>
            )}
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/30 uppercase tracking-wider">
              {statusBadge}
            </span>
          </div>
        </div>

        {totalTasks > 0 && (
          <div className="text-right">
            <span className="text-sm font-mono text-white/50">
              {doneTasks}/{totalTasks}
            </span>
            <div className="w-20 h-1.5 bg-white/5 rounded-full mt-1 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${progress}%`,
                  backgroundColor: progress === 100 ? '#00ff88' : '#00f0ff',
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Task checklist */}
      {project && tasks.length > 0 ? (
        <div className="space-y-1 mt-3">
          {tasks
            .sort((a, b) => {
              if (!a.dueDate || !b.dueDate) return 0;
              return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
            })
            .map((task) => {
              const isDone = task.status === 'done';
              const taskDue = task.dueDate ? new Date(task.dueDate) : null;
              const isOverdue = taskDue && taskDue < now && !isDone;

              return (
                <div
                  key={task.id}
                  className="flex items-center gap-2 py-1 px-2 rounded hover:bg-white/5 cursor-pointer transition-colors group"
                  onClick={() =>
                    toggleTask.mutate({
                      taskId: task.id,
                      status: isDone ? 'todo' : 'done',
                    })
                  }
                >
                  <div
                    className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                      isDone
                        ? 'bg-neon-cyan/20 border-neon-cyan/50'
                        : 'border-white/20 group-hover:border-white/40'
                    }`}
                  >
                    {isDone && (
                      <span className="text-neon-cyan text-[10px] font-bold">✓</span>
                    )}
                  </div>
                  <span
                    className={`text-sm flex-1 ${
                      isDone
                        ? 'text-white/20 line-through'
                        : isOverdue
                          ? 'text-red-400'
                          : 'text-white/60'
                    }`}
                  >
                    {task.title}
                  </span>
                  {taskDue && (
                    <span
                      className={`text-[10px] font-mono ${
                        isDone
                          ? 'text-white/10'
                          : isOverdue
                            ? 'text-red-400/60'
                            : 'text-white/20'
                      }`}
                    >
                      {taskDue.toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  )}
                </div>
              );
            })}
        </div>
      ) : !project ? (
        <button
          onClick={(e) => {
            e.preventDefault();
            createProject.mutate();
          }}
          disabled={createProject.isPending}
          className="mt-2 text-xs text-neon-cyan/60 hover:text-neon-cyan border border-neon-cyan/20 hover:border-neon-cyan/40 rounded px-3 py-1.5 transition-colors"
        >
          {createProject.isPending ? 'Creating...' : '+ Create Event Checklist'}
        </button>
      ) : null}
    </div>
  );
}
