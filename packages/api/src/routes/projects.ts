import { FastifyInstance } from 'fastify';
import {
  listProjects,
  listProjectsWithStats,
  getProjectWithTasks,
  createProject,
  updateProject,
  deleteProject,
  listTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  getAllProjectsWithTasks,
} from '../services/projects.js';

export async function projectsRoutes(app: FastifyInstance) {
  // GET /api/projects
  app.get('/projects', async (request) => {
    const query = request.query as Record<string, string>;
    const data = await listProjectsWithStats({
      query: query.q,
      status: query.status,
      tags: query.tags ? query.tags.split(',') : undefined,
      limit: query.limit ? parseInt(query.limit) : undefined,
      offset: query.offset ? parseInt(query.offset) : undefined,
    });
    return { data };
  });

  // GET /api/projects/gantt — all projects with tasks for holistic Gantt
  app.get('/projects/gantt', async () => {
    const data = await getAllProjectsWithTasks();
    return { data };
  });

  // GET /api/projects/:id
  app.get('/projects/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const project = await getProjectWithTasks(id);
    if (!project) {
      return reply.code(404).send({ error: 'Not found', message: 'Project not found', statusCode: 404 });
    }
    return { data: project };
  });

  // POST /api/projects
  app.post('/projects', async (request, reply) => {
    const body = request.body as {
      name: string;
      description?: string;
      status?: string;
      eventId?: string;
      startDate?: string;
      endDate?: string;
      tags?: string[];
      color?: string;
    };
    if (!body.name) {
      return reply.code(400).send({ error: 'Bad request', message: 'name is required', statusCode: 400 });
    }
    const project = await createProject({
      ...body,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
    });
    return reply.code(201).send({ data: project });
  });

  // PUT /api/projects/:id
  app.put('/projects/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;
    if (body.startDate) body.startDate = new Date(body.startDate as string);
    if (body.endDate) body.endDate = new Date(body.endDate as string);
    const project = await updateProject(id, body);
    if (!project) {
      return reply.code(404).send({ error: 'Not found', message: 'Project not found', statusCode: 404 });
    }
    return { data: project };
  });

  // DELETE /api/projects/:id
  app.delete('/projects/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const project = await deleteProject(id);
    if (!project) {
      return reply.code(404).send({ error: 'Not found', message: 'Project not found', statusCode: 404 });
    }
    return { data: project };
  });

  // ── Task routes ──

  // GET /api/projects/:id/tasks
  app.get('/projects/:id/tasks', async (request) => {
    const { id } = request.params as { id: string };
    const query = request.query as Record<string, string>;
    const data = await listTasks({
      projectId: id,
      status: query.status,
      assignee: query.assignee,
      tags: query.tags ? query.tags.split(',') : undefined,
      limit: query.limit ? parseInt(query.limit) : undefined,
      offset: query.offset ? parseInt(query.offset) : undefined,
    });
    return { data };
  });

  // GET /api/tasks — all tasks across projects
  app.get('/tasks', async (request) => {
    const query = request.query as Record<string, string>;
    const data = await listTasks({
      projectId: query.projectId,
      status: query.status,
      assignee: query.assignee,
      tags: query.tags ? query.tags.split(',') : undefined,
      limit: query.limit ? parseInt(query.limit) : undefined,
      offset: query.offset ? parseInt(query.offset) : undefined,
    });
    return { data };
  });

  // GET /api/tasks/:taskId
  app.get('/tasks/:taskId', async (request, reply) => {
    const { taskId } = request.params as { taskId: string };
    const task = await getTaskById(taskId);
    if (!task) {
      return reply.code(404).send({ error: 'Not found', message: 'Task not found', statusCode: 404 });
    }
    return { data: task };
  });

  // POST /api/projects/:id/tasks
  app.post('/projects/:id/tasks', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      title: string;
      description?: string;
      status?: string;
      priority?: number;
      assignee?: string;
      startDate?: string;
      dueDate?: string;
      dependencies?: string[];
      tags?: string[];
    };
    if (!body.title) {
      return reply.code(400).send({ error: 'Bad request', message: 'title is required', statusCode: 400 });
    }
    const task = await createTask({
      ...body,
      projectId: id,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
    });
    return reply.code(201).send({ data: task });
  });

  // PUT /api/tasks/:taskId
  app.put('/tasks/:taskId', async (request, reply) => {
    const { taskId } = request.params as { taskId: string };
    const body = request.body as Record<string, unknown>;
    if (body.startDate) body.startDate = new Date(body.startDate as string);
    if (body.dueDate) body.dueDate = new Date(body.dueDate as string);
    const task = await updateTask(taskId, body);
    if (!task) {
      return reply.code(404).send({ error: 'Not found', message: 'Task not found', statusCode: 404 });
    }
    return { data: task };
  });

  // DELETE /api/tasks/:taskId
  app.delete('/tasks/:taskId', async (request, reply) => {
    const { taskId } = request.params as { taskId: string };
    const task = await deleteTask(taskId);
    if (!task) {
      return reply.code(404).send({ error: 'Not found', message: 'Task not found', statusCode: 404 });
    }
    return { data: task };
  });
}
