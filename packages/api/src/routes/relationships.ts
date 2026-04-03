import { FastifyInstance } from 'fastify';
import {
  createPersonRelationship,
  getPersonRelationships,
  updatePersonRelationship,
  deletePersonRelationship,
  createOrgRelationship,
  getOrgRelationships,
  updateOrgRelationship,
  deleteOrgRelationship,
} from '../services/relationships.js';

export async function relationshipsRoutes(app: FastifyInstance) {
  // ── Person Relationships ──

  // GET /api/person-relationships?personId=X
  app.get('/person-relationships', async (request) => {
    const { personId } = request.query as { personId?: string };
    const data = await getPersonRelationships(personId);
    return { data };
  });

  // POST /api/person-relationships
  app.post('/person-relationships', async (request, reply) => {
    const body = request.body as {
      personAId: string;
      personBId: string;
      type: string;
      strength?: number;
      notes?: string;
    };
    if (!body.personAId || !body.personBId || !body.type) {
      return reply.code(400).send({
        error: 'Bad request',
        message: 'personAId, personBId, and type are required',
        statusCode: 400,
      });
    }
    if (body.strength !== undefined && (body.strength < 1 || body.strength > 5)) {
      return reply.code(400).send({
        error: 'Bad request',
        message: 'strength must be between 1 and 5',
        statusCode: 400,
      });
    }
    const rel = await createPersonRelationship(body as any);
    return reply.code(201).send({ data: rel });
  });

  // PUT /api/person-relationships/:id
  app.put('/person-relationships/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { type?: string; strength?: number; notes?: string };
    if (body.strength !== undefined && (body.strength < 1 || body.strength > 5)) {
      return reply.code(400).send({
        error: 'Bad request',
        message: 'strength must be between 1 and 5',
        statusCode: 400,
      });
    }
    const rel = await updatePersonRelationship(id, body);
    if (!rel) {
      return reply.code(404).send({ error: 'Not found', message: 'Person relationship not found', statusCode: 404 });
    }
    return { data: rel };
  });

  // DELETE /api/person-relationships/:id
  app.delete('/person-relationships/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const rel = await deletePersonRelationship(id);
    if (!rel) {
      return reply.code(404).send({ error: 'Not found', message: 'Person relationship not found', statusCode: 404 });
    }
    return { data: rel };
  });

  // ── Organization Relationships ──

  // GET /api/org-relationships?orgId=X
  app.get('/org-relationships', async (request) => {
    const { orgId } = request.query as { orgId?: string };
    const data = await getOrgRelationships(orgId);
    return { data };
  });

  // POST /api/org-relationships
  app.post('/org-relationships', async (request, reply) => {
    const body = request.body as {
      orgAId: string;
      orgBId: string;
      type: string;
      notes?: string;
    };
    if (!body.orgAId || !body.orgBId || !body.type) {
      return reply.code(400).send({
        error: 'Bad request',
        message: 'orgAId, orgBId, and type are required',
        statusCode: 400,
      });
    }
    const rel = await createOrgRelationship(body as any);
    return reply.code(201).send({ data: rel });
  });

  // PUT /api/org-relationships/:id
  app.put('/org-relationships/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { type?: string; notes?: string };
    const rel = await updateOrgRelationship(id, body);
    if (!rel) {
      return reply.code(404).send({ error: 'Not found', message: 'Organization relationship not found', statusCode: 404 });
    }
    return { data: rel };
  });

  // DELETE /api/org-relationships/:id
  app.delete('/org-relationships/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const rel = await deleteOrgRelationship(id);
    if (!rel) {
      return reply.code(404).send({ error: 'Not found', message: 'Organization relationship not found', statusCode: 404 });
    }
    return { data: rel };
  });
}
