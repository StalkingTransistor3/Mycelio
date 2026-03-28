import { eq, ilike, and, desc, asc, inArray, count } from 'drizzle-orm';
import { db, schema } from '../db/index.js';

const { projects, tasks } = schema;

// ── Project CRUD ──

export async function listProjects(params?: {
  query?: string;
  status?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}) {
  const conditions = [];

  if (params?.query) {
    conditions.push(ilike(projects.name, `%${params.query}%`));
  }
  if (params?.status) {
    conditions.push(eq(projects.status, params.status));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const limit = params?.limit || 500;
  const offset = params?.offset || 0;

  let results = await db
    .select()
    .from(projects)
    .where(where)
    .limit(limit)
    .offset(offset)
    .orderBy(desc(projects.updatedAt));

  if (params?.tags && params.tags.length > 0) {
    results = results.filter((p) =>
      params.tags!.some((tag: string) => (p.tags as string[]).includes(tag))
    );
  }

  return results;
}

export async function listProjectsWithStats(params?: Parameters<typeof listProjects>[0]) {
  const results = await listProjects(params);
  if (results.length === 0) return results;

  const projectIds = results.map((p) => p.id);

  const taskCounts = await db
    .select({
      projectId: tasks.projectId,
      status: tasks.status,
      count: count(),
    })
    .from(tasks)
    .where(inArray(tasks.projectId, projectIds))
    .groupBy(tasks.projectId, tasks.status);

  const statsMap = new Map<string, { total: number; completed: number }>();
  for (const row of taskCounts) {
    const entry = statsMap.get(row.projectId) || { total: 0, completed: 0 };
    entry.total += row.count;
    if (row.status === 'done') entry.completed += row.count;
    statsMap.set(row.projectId, entry);
  }

  return results.map((p) => {
    const stats = statsMap.get(p.id) || { total: 0, completed: 0 };
    return {
      ...p,
      taskStats: {
        total: stats.total,
        completed: stats.completed,
        percentage: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
      },
    };
  });
}

export async function getProjectById(id: string) {
  const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return result[0] || null;
}

export async function getProjectWithTasks(id: string) {
  const project = await getProjectById(id);
  if (!project) return null;

  const projectTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.projectId, id))
    .orderBy(asc(tasks.priority), asc(tasks.createdAt));

  return { ...project, tasks: projectTasks };
}

export async function createProject(data: {
  name: string;
  description?: string;
  status?: string;
  eventId?: string;
  startDate?: Date;
  endDate?: Date;
  tags?: string[];
  color?: string;
}) {
  const result = await db
    .insert(projects)
    .values({
      name: data.name,
      description: data.description || null,
      status: data.status || 'active',
      eventId: data.eventId || null,
      startDate: data.startDate || null,
      endDate: data.endDate || null,
      tags: data.tags || [],
      color: data.color || '#00f0ff',
    })
    .returning();
  return result[0];
}

export async function getProjectByEventId(eventId: string) {
  const result = await db.select().from(projects).where(eq(projects.eventId, eventId)).limit(1);
  return result[0] || null;
}

export async function createEventProjectWithTasks(eventId: string, eventName: string, eventDate: Date) {
  // Create the project linked to the event
  const project = await createProject({
    name: `Event: ${eventName}`,
    description: `Checklist for event "${eventName}"`,
    status: 'active',
    eventId,
    startDate: new Date(eventDate.getTime() - 14 * 24 * 60 * 60 * 1000), // 14 days before
    endDate: new Date(eventDate.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days after
    tags: ['event-checklist'],
    color: '#ff6ec7',
  });

  // Template tasks with relative offsets (negative = before event, positive = after)
  const templateTasks = [
    { title: 'Book and confirm venue', dayOffset: -14, priority: 0 },
    { title: 'Create event page and publish', dayOffset: -14, priority: 1 },
    { title: 'Send invitations / promote', dayOffset: -10, priority: 2 },
    { title: 'Confirm catering / food', dayOffset: -7, priority: 3 },
    { title: 'Prepare content / slides / materials', dayOffset: -3, priority: 4 },
    { title: 'Day-of logistics check', dayOffset: 0, priority: 5 },
    { title: 'Send thank you / follow-ups', dayOffset: 2, priority: 6 },
    { title: 'Debrief and log learnings', dayOffset: 3, priority: 7 },
  ];

  const createdTasks = [];
  for (const tmpl of templateTasks) {
    const dueDate = new Date(eventDate.getTime() + tmpl.dayOffset * 24 * 60 * 60 * 1000);
    const task = await createTask({
      projectId: project.id,
      title: tmpl.title,
      priority: tmpl.priority,
      dueDate,
      tags: ['event-checklist'],
    });
    createdTasks.push(task);
  }

  return { ...project, tasks: createdTasks };
}

export async function updateProject(id: string, data: Record<string, unknown>) {
  const updateData: Record<string, unknown> = { ...data, updatedAt: new Date() };
  const result = await db
    .update(projects)
    .set(updateData)
    .where(eq(projects.id, id))
    .returning();
  return result[0] || null;
}

export async function deleteProject(id: string) {
  const result = await db.delete(projects).where(eq(projects.id, id)).returning();
  return result[0] || null;
}

// ── Task CRUD ──

export async function listTasks(params?: {
  projectId?: string;
  status?: string;
  assignee?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}) {
  const conditions = [];

  if (params?.projectId) {
    conditions.push(eq(tasks.projectId, params.projectId));
  }
  if (params?.status) {
    conditions.push(eq(tasks.status, params.status));
  }
  if (params?.assignee) {
    conditions.push(ilike(tasks.assignee, `%${params.assignee}%`));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const limit = params?.limit || 500;
  const offset = params?.offset || 0;

  let results = await db
    .select()
    .from(tasks)
    .where(where)
    .limit(limit)
    .offset(offset)
    .orderBy(asc(tasks.priority), desc(tasks.updatedAt));

  if (params?.tags && params.tags.length > 0) {
    results = results.filter((t) =>
      params.tags!.some((tag: string) => (t.tags as string[]).includes(tag))
    );
  }

  return results;
}

export async function getTaskById(id: string) {
  const result = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  return result[0] || null;
}

export async function createTask(data: {
  projectId: string;
  title: string;
  description?: string;
  status?: string;
  priority?: number;
  assignee?: string;
  startDate?: Date;
  dueDate?: Date;
  dependencies?: string[];
  tags?: string[];
}) {
  const result = await db
    .insert(tasks)
    .values({
      projectId: data.projectId,
      title: data.title,
      description: data.description || null,
      status: data.status || 'todo',
      priority: data.priority ?? 0,
      assignee: data.assignee || null,
      startDate: data.startDate || null,
      dueDate: data.dueDate || null,
      dependencies: data.dependencies || [],
      tags: data.tags || [],
    })
    .returning();
  return result[0];
}

export async function updateTask(id: string, data: Record<string, unknown>) {
  const updateData: Record<string, unknown> = { ...data, updatedAt: new Date() };
  const result = await db
    .update(tasks)
    .set(updateData)
    .where(eq(tasks.id, id))
    .returning();
  return result[0] || null;
}

export async function deleteTask(id: string) {
  const result = await db.delete(tasks).where(eq(tasks.id, id)).returning();
  return result[0] || null;
}

// ── All projects with tasks (for holistic Gantt) ──

export async function getAllProjectsWithTasks() {
  const allProjects = await db
    .select()
    .from(projects)
    .orderBy(asc(projects.startDate), asc(projects.name));

  const allTasks = await db
    .select()
    .from(tasks)
    .orderBy(asc(tasks.startDate), asc(tasks.priority));

  return allProjects.map((p) => ({
    ...p,
    tasks: allTasks.filter((t) => t.projectId === p.id),
  }));
}
