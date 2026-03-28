import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useProjectsGantt } from '../hooks/useProjects.js';
import { api } from '../api/client.js';
import GanttChart from '../components/GanttChart.js';
import type { ProjectWithTasks } from '@mycelio/shared';

export default function GanttView() {
  const { data: projects, isLoading, error } = useProjectsGantt();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const updateTaskDates = useMutation({
    mutationFn: ({ taskId, startDate, dueDate }: { taskId: string; projectId: string; startDate: string; dueDate: string }) =>
      api.updateTask(taskId, { startDate, dueDate }),
    onSuccess: (_data, { projectId }) => {
      qc.invalidateQueries({ queryKey: ['projects-gantt'] });
      qc.invalidateQueries({ queryKey: ['project', projectId] });
      qc.invalidateQueries({ queryKey: ['project-tasks', projectId] });
    },
  });

  const handleTaskDateChange = useCallback(
    (taskId: string, projectId: string, startDate: string, dueDate: string) => {
      updateTaskDates.mutate({ taskId, projectId, startDate, dueDate });
    },
    [updateTaskDates],
  );

  const updateTaskStatus = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; projectId: string; status: string }) =>
      api.updateTask(taskId, { status }),
    onSuccess: (_data, { projectId }) => {
      qc.invalidateQueries({ queryKey: ['projects-gantt'] });
      qc.invalidateQueries({ queryKey: ['project', projectId] });
      qc.invalidateQueries({ queryKey: ['project-tasks', projectId] });
    },
  });

  const handleTaskStatusToggle = useCallback(
    (taskId: string, projectId: string, newStatus: string) => {
      updateTaskStatus.mutate({ taskId, projectId, status: newStatus });
    },
    [updateTaskStatus],
  );

  if (isLoading) return <p className="text-white/30 animate-pulse">Loading...</p>;
  if (error) return <p className="text-red-400">Error: {(error as Error).message}</p>;

  const allProjects = (projects || []) as ProjectWithTasks[];
  const totalTasks = allProjects.reduce((sum, p) => sum + (p.tasks?.length || 0), 0);
  const doneTasks = allProjects.reduce(
    (sum, p) => sum + (p.tasks?.filter((t) => t.status === 'done').length || 0),
    0
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-wide neon-text">Gantt Chart</h2>
          <p className="text-xs text-white/20 mt-1">
            {allProjects.length} project{allProjects.length !== 1 ? 's' : ''} · {totalTasks} task{totalTasks !== 1 ? 's' : ''} · {doneTasks} completed
          </p>
        </div>
      </div>

      {allProjects.length === 0 ? (
        <div className="text-center text-white/20 py-12">
          No projects yet. Create a project to see it on the timeline.
        </div>
      ) : (
        <GanttChart
          projects={allProjects}
          onProjectClick={(id) => navigate(`/projects/${id}`)}
          onTaskDateChange={handleTaskDateChange}
          onTaskStatusToggle={handleTaskStatusToggle}
        />
      )}

      {/* Legend */}
      <div className="flex gap-6 mt-4 text-[10px] text-white/30">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-1.5 rounded bg-neon-cyan" />
          Active
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-1.5 rounded bg-neon-cyan opacity-40" />
          Completed
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-px h-3 border-l border-dashed border-neon-magenta" />
          Today
        </div>
        <div className="flex items-center gap-1.5">
          <span>✓</span> Done
        </div>
        <div className="flex items-center gap-1.5">
          <span>✕</span> Blocked
        </div>
      </div>
    </div>
  );
}
