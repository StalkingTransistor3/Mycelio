import { eq, ilike, and, desc, asc } from 'drizzle-orm';
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
      startDate: data.startDate || null,
      endDate: data.endDate || null,
      tags: data.tags || [],
      color: data.color || '#00f0ff',
    })
    .returning();
  return result[0];
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
