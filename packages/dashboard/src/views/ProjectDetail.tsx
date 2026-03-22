import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useProject, useCreateTask, useUpdateTask } from '../hooks/useProjects.js';
import GanttChart from '../components/GanttChart.js';
import { Button } from '../components/FormField.js';
import type { Task, ProjectWithTasks } from '@mycelio/shared';

const statusStyles: Record<string, string> = {
  todo: 'text-white/40 border-white/10 bg-white/5',
  in_progress: 'text-neon-cyan border-neon-cyan/30 bg-neon-cyan/10',
  done: 'text-neon-green border-neon-green/30 bg-neon-green/10',
  blocked: 'text-red-400 border-red-400/30 bg-red-400/10',
};

const priorityLabels: Record<number, string> = {
  0: 'None',
  1: 'Low',
  2: 'Medium',
  3: 'High',
  4: 'Critical',
};

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: project, isLoading, error } = useProject(id!);
  const createTask = useCreateTask(id!);
  const updateTask = useUpdateTask(id!);

  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState(0);
  const [newAssignee, setNewAssignee] = useState('');
  const [newStart, setNewStart] = useState('');
  const [newDue, setNewDue] = useState('');
  const [view, setView] = useState<'list' | 'gantt'>('list');

  if (isLoading) return <p className="text-white/30 animate-pulse">Loading...</p>;
  if (error) return <p className="text-red-400">Error: {(error as Error).message}</p>;
  if (!project) return <p className="text-white/30">Project not found</p>;

  const tasks = (project as ProjectWithTasks).tasks || [];
  const todoCount = tasks.filter((t) => t.status === 'todo').length;
  const inProgressCount = tasks.filter((t) => t.status === 'in_progress').length;
  const doneCount = tasks.filter((t) => t.status === 'done').length;
  const blockedCount = tasks.filter((t) => t.status === 'blocked').length;

  const handleCreateTask = () => {
    if (!newTitle.trim()) return;
    createTask.mutate(
      {
        title: newTitle,
        description: newDesc || undefined,
        priority: newPriority,
        assignee: newAssignee || undefined,
        startDate: newStart || undefined,
        dueDate: newDue || undefined,
      },
      {
        onSuccess: () => {
          setShowAdd(false);
          setNewTitle('');
          setNewDesc('');
          setNewPriority(0);
          setNewAssignee('');
          setNewStart('');
          setNewDue('');
        },
      }
    );
  };

  const handleStatusChange = (taskId: string, status: string) => {
    updateTask.mutate({ taskId, data: { status } });
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <Link to="/projects" className="text-white/30 hover:text-white/50 text-sm">Projects</Link>
        <span className="text-white/20">/</span>
      </div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: project.color }} />
          <h2 className="text-2xl font-bold tracking-wide text-white/80">{project.name}</h2>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setView(view === 'list' ? 'gantt' : 'list')}>
            {view === 'list' ? 'Gantt' : 'List'}
          </Button>
          <Button onClick={() => setShowAdd(true)}>+ Add Task</Button>
        </div>
      </div>

      {project.description && (
        <p className="text-sm text-white/30 mb-4">{project.description}</p>
      )}

      {/* Stats */}
      <div className="flex gap-4 mb-6">
        <div className="glass rounded-lg px-4 py-2 text-center">
          <div className="text-lg font-bold text-white/40">{todoCount}</div>
          <div className="text-[10px] text-white/20 uppercase">Todo</div>
        </div>
        <div className="glass rounded-lg px-4 py-2 text-center">
          <div className="text-lg font-bold text-neon-cyan">{inProgressCount}</div>
          <div className="text-[10px] text-white/20 uppercase">In Progress</div>
        </div>
        <div className="glass rounded-lg px-4 py-2 text-center">
          <div className="text-lg font-bold text-neon-green">{doneCount}</div>
          <div className="text-[10px] text-white/20 uppercase">Done</div>
        </div>
        {blockedCount > 0 && (
          <div className="glass rounded-lg px-4 py-2 text-center">
            <div className="text-lg font-bold text-red-400">{blockedCount}</div>
            <div className="text-[10px] text-white/20 uppercase">Blocked</div>
          </div>
        )}
      </div>

      {/* Gantt View */}
      {view === 'gantt' && (
        <GanttChart projects={[project as ProjectWithTasks]} />
      )}

      {/* List View */}
      {view === 'list' && (
        <div className="glass rounded-xl overflow-hidden">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-6 py-3 text-left text-[10px] font-medium text-white/30 uppercase tracking-wider">Task</th>
                <th className="px-6 py-3 text-left text-[10px] font-medium text-white/30 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-[10px] font-medium text-white/30 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-3 text-left text-[10px] font-medium text-white/30 uppercase tracking-wider">Assignee</th>
                <th className="px-6 py-3 text-left text-[10px] font-medium text-white/30 uppercase tracking-wider">Due Date</th>
                <th className="px-6 py-3 text-left text-[10px] font-medium text-white/30 uppercase tracking-wider">Tags</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task: Task) => (
                <tr key={task.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <span className="text-white/70 font-medium">{task.title}</span>
                    {task.description && (
                      <p className="text-xs text-white/20 mt-0.5 truncate max-w-xs">{task.description}</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={task.status}
                      onChange={(e) => handleStatusChange(task.id, e.target.value)}
                      className={`px-2 py-0.5 text-[10px] uppercase tracking-wider rounded border bg-transparent cursor-pointer ${statusStyles[task.status]}`}
                    >
                      <option value="todo">Todo</option>
                      <option value="in_progress">In Progress</option>
                      <option value="done">Done</option>
                      <option value="blocked">Blocked</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-sm text-white/40">
                    {priorityLabels[task.priority] || task.priority}
                  </td>
                  <td className="px-6 py-4 text-sm text-white/40">
                    {task.assignee || '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-white/30">
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1 flex-wrap">
                      {task.tags.map((tag: string) => (
                        <span key={tag} className="px-2 py-0.5 text-[10px] bg-white/5 text-white/30 rounded border border-white/5">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              {tasks.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-white/20">
                    No tasks yet. Click "+ Add Task" to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Task Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowAdd(false)}>
          <div className="glass-heavy rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white/80 mb-4">Add Task</h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Task title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-neon-cyan/50"
                autoFocus
              />
              <textarea
                placeholder="Description (optional)"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-neon-cyan/50 h-16 resize-none"
              />
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[10px] text-white/30 uppercase">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(parseInt(e.target.value))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-neon-cyan/50"
                  >
                    <option value={0}>None</option>
                    <option value={1}>Low</option>
                    <option value={2}>Medium</option>
                    <option value={3}>High</option>
                    <option value={4}>Critical</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-white/30 uppercase">Assignee</label>
                  <input
                    type="text"
                    placeholder="Name"
                    value={newAssignee}
                    onChange={(e) => setNewAssignee(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-neon-cyan/50"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[10px] text-white/30 uppercase">Start Date</label>
                  <input
                    type="date"
                    value={newStart}
                    onChange={(e) => setNewStart(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-neon-cyan/50"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-white/30 uppercase">Due Date</label>
                  <input
                    type="date"
                    value={newDue}
                    onChange={(e) => setNewDue(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-neon-cyan/50"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button onClick={handleCreateTask}>Create</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
