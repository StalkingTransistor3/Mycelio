import { FastifyInstance } from 'fastify';
import {
  getOrganizations,
  getOrganizationById,
  createOrganization,
  updateOrganization,
  getOrganizationHealth,
  getOrganizationMembers,
} from '../services/organizations.js';
import { findDuplicateOrgs, mergeOrgs } from '../services/deduplication.js';

export async function organizationsRoutes(app: FastifyInstance) {
  // GET /api/organizations?type=community
  app.get('/organizations', async (request) => {
    const { type } = request.query as { type?: string };
    const data = await getOrganizations(type ? { type } : undefined);
    return { data };
  });

  // GET /api/organizations/:id
  app.get('/organizations/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const org = await getOrganizationById(id);
    if (!org) {
      return reply.code(404).send({ error: 'Not found', message: 'Organization not found', statusCode: 404 });
    }
    return { data: org };
  });

  // GET /api/organizations/:id/health
  app.get('/organizations/:id/health', async (request, reply) => {
    const { id } = request.params as { id: string };
    const health = await getOrganizationHealth(id);
    if (!health) {
      return reply.code(404).send({ error: 'Not found', message: 'Organization not found', statusCode: 404 });
    }
    return { data: health };
  });

  // GET /api/organizations/:id/members
  app.get('/organizations/:id/members', async (request, reply) => {
    const { id } = request.params as { id: string };
    const members = await getOrganizationMembers(id);
    if (members === null) {
      return reply.code(404).send({ error: 'Not found', message: 'Organization not found', statusCode: 404 });
    }
    return { data: members };
  });

  // POST /api/organizations
  app.post('/organizations', async (request, reply) => {
    const body = request.body as {
      name: string;
      type?: string;
      domain?: string;
      industry?: string;
      description?: string;
      notes?: string;
      memberIds?: string[];
      tags?: string[];
    };
    if (!body.name) {
      return reply.code(400).send({ error: 'Bad request', message: 'name is required', statusCode: 400 });
    }
    const org = await createOrganization(body);
    return reply.code(201).send({ data: org });
  });

  // PUT /api/organizations/:id
  app.put('/organizations/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;
    const org = await updateOrganization(id, body as any);
    if (!org) {
      return reply.code(404).send({ error: 'Not found', message: 'Organization not found', statusCode: 404 });
    }
    return { data: org };
  });

  // GET /api/organizations/duplicates
  app.get('/organizations/duplicates', async () => {
    const duplicates = await findDuplicateOrgs();
    return { data: duplicates };
  });

  // POST /api/organizations/merge
  app.post('/organizations/merge', async (request, reply) => {
    const body = request.body as { keepId: string; removeId: string };
    if (!body.keepId || !body.removeId) {
      return reply.code(400).send({ error: 'Bad request', message: 'keepId and removeId are required', statusCode: 400 });
    }
    const result = await mergeOrgs(body.keepId, body.removeId);
    return { data: result };
  });
}
