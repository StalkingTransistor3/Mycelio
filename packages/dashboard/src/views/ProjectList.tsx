import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useProjects, useCreateProject } from '../hooks/useProjects.js';
import SearchBar from '../components/SearchBar.js';
import { Button } from '../components/FormField.js';
import type { Project } from '@mycelio/shared';

const statusStyles: Record<string, string> = {
  active: 'text-neon-green border-neon-green/30 bg-neon-green/10',
  completed: 'text-neon-cyan border-neon-cyan/30 bg-neon-cyan/10',
  on_hold: 'text-neon-yellow border-neon-yellow/30 bg-neon-yellow/10',
  archived: 'text-white/20 border-white/5 bg-white/[0.03]',
};

export default function ProjectList() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newColor, setNewColor] = useState('#00f0ff');

  const params: Record<string, string> = {};
  if (search) params.q = search;
  if (statusFilter) params.status = statusFilter;

  const { data: projects, isLoading, error } = useProjects(
    Object.keys(params).length > 0 ? params : undefined
  );

  const createMutation = useCreateProject();

  const handleCreate = () => {
    if (!newName.trim()) return;
    createMutation.mutate(
      { name: newName, description: newDesc || undefined, color: newColor },
      {
        onSuccess: () => {
          setShowAdd(false);
          setNewName('');
          setNewDesc('');
          setNewColor('#00f0ff');
        },
      }
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold tracking-wide neon-text">Projects</h2>
        <div className="flex gap-2">
          <Link to="/gantt">
            <Button>Gantt View</Button>
          </Link>
          <Button onClick={() => setShowAdd(true)}>+ New Project</Button>
        </div>
      </div>

      <div className="flex gap-4 mb-6 items-end flex-wrap">
        <div className="max-w-xs flex-1">
          <SearchBar onSearch={setSearch} placeholder="Search projects..." />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-neon-cyan/50"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="on_hold">On Hold</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {isLoading && <p className="text-white/30 animate-pulse">Loading...</p>}
      {error && <p className="text-red-400">Error: {(error as Error).message}</p>}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(projects as Project[] | undefined)?.map((project) => (
          <Link
            key={project.id}
            to={`/projects/${project.id}`}
            className="glass rounded-xl p-5 hover:bg-white/5 transition-colors border border-white/5 hover:border-white/10 group"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: project.color }} />
                <h3 className="font-semibold text-white/80 group-hover:text-neon-cyan transition-colors">
                  {project.name}
                </h3>
              </div>
              <span className={`inline-block px-2 py-0.5 text-[10px] uppercase tracking-wider rounded border ${statusStyles[project.status]}`}>
                {project.status.replace('_', ' ')}
              </span>
            </div>
            {project.description && (
              <p className="text-xs text-white/20 mb-3 line-clamp-2">{project.description}</p>
            )}
            <div className="flex gap-1 flex-wrap mb-2">
              {project.tags.map((tag: string) => (
                <span key={tag} className="px-2 py-0.5 text-[10px] bg-white/5 text-white/30 rounded border border-white/5">
                  {tag}
                </span>
              ))}
            </div>
            <div className="text-[10px] text-white/20">
              {project.startDate && `${new Date(project.startDate).toLocaleDateString()}`}
              {project.startDate && project.endDate && ' → '}
              {project.endDate && `${new Date(project.endDate).toLocaleDateString()}`}
            </div>
          </Link>
        ))}
        {projects?.length === 0 && (
          <div className="col-span-full text-center text-white/20 py-12">
            No projects found. Click "+ New Project" to get started.
          </div>
        )}
      </div>

      {/* Add Project Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowAdd(false)}>
          <div className="glass-heavy rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white/80 mb-4">New Project</h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Project name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-neon-cyan/50"
                autoFocus
              />
              <textarea
                placeholder="Description (optional)"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-neon-cyan/50 h-20 resize-none"
              />
              <div className="flex items-center gap-2">
                <label className="text-xs text-white/40">Color:</label>
                <input
                  type="color"
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer bg-transparent"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button onClick={handleCreate}>Create</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
