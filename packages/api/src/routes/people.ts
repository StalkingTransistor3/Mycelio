import { FastifyInstance } from 'fastify';
import { searchPeople, getPersonById, createPerson, updatePerson } from '../services/people.js';
import type { PeopleSearchParams, RelationshipTier } from '@mycelio/shared';

export async function peopleRoutes(app: FastifyInstance) {
  // GET /api/people
  app.get('/people', async (request) => {
    const query = request.query as Record<string, string>;
    const params: PeopleSearchParams = {
      query: query.q,
      tier: query.tier ? (parseInt(query.tier) as RelationshipTier) : undefined,
      tags: query.tags ? query.tags.split(',') : undefined,
      organizationId: query.organizationId,
      limit: query.limit ? parseInt(query.limit) : undefined,
      offset: query.offset ? parseInt(query.offset) : undefined,
    };
    const data = await searchPeople(params);
    return { data };
  });

  // GET /api/people/:id
  app.get('/people/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const person = await getPersonById(id);
    if (!person) {
      return reply.code(404).send({ error: 'Not found', message: 'Person not found', statusCode: 404 });
    }
    return { data: person };
  });

  // POST /api/people
  app.post('/people', async (request, reply) => {
    const body = request.body as {
      name: string;
      email?: string;
      phone?: string;
      title?: string;
      organizationId?: string;
      tier?: number;
      tags?: string[];
      notes?: string;
    };
    if (!body.name) {
      return reply.code(400).send({ error: 'Bad request', message: 'Name is required', statusCode: 400 });
    }
    const person = await createPerson(body);
    return reply.code(201).send({ data: person });
  });

  // PUT /api/people/:id
  app.put('/people/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;
    const person = await updatePerson(id, body);
    if (!person) {
      return reply.code(404).send({ error: 'Not found', message: 'Person not found', statusCode: 404 });
    }
    return { data: person };
  });
}
