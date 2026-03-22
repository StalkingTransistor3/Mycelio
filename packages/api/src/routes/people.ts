import { FastifyInstance } from 'fastify';
import { searchPeople, getPersonById, createPerson, updatePerson, addMilestone, addTalkingPoint, getUpcomingMilestones } from '../services/people.js';
import { getPersonSentimentTrajectory } from '../services/interactions.js';
import { computeCoAttendance } from '../services/co-attendance.js';
import { computeReciprocityIndex } from '../services/reciprocity.js';
import { transitionStage, getPipeline, suggestStage } from '../services/stages.js';
import { analyzeCommPatterns, detectAvailability, getSmartReengagement } from '../services/intelligence.js';
import { META } from './docs.js';
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
    return { data: person, _meta: META.person };
  });

  // POST /api/people
  app.post('/people', async (request, reply) => {
    const body = request.body as {
      name: string;
      email?: string;
      phone?: string;
      linkedin?: string;
      twitter?: string;
      instagram?: string;
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

  // POST /api/people/:id/milestones
  app.post('/people/:id/milestones', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      type: string;
      description: string;
      date?: string;
      recurring?: boolean;
    };
    if (!body.type || !body.description) {
      return reply.code(400).send({ error: 'Bad request', message: 'type and description are required', statusCode: 400 });
    }
    try {
      const result = await addMilestone(id, body);
      return reply.code(201).send({ data: result.milestone });
    } catch (err: unknown) {
      return reply.code(404).send({ error: 'Not found', message: (err as Error).message, statusCode: 404 });
    }
  });

  // POST /api/people/:id/talking-points
  app.post('/people/:id/talking-points', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      text: string;
      context?: string;
    };
    if (!body.text) {
      return reply.code(400).send({ error: 'Bad request', message: 'text is required', statusCode: 400 });
    }
    try {
      const result = await addTalkingPoint(id, body);
      return reply.code(201).send({ data: result.talkingPoint });
    } catch (err: unknown) {
      return reply.code(404).send({ error: 'Not found', message: (err as Error).message, statusCode: 404 });
    }
  });

  // GET /api/people/:id/sentiment
  app.get('/people/:id/sentiment', async (request) => {
    const { id } = request.params as { id: string };
    const query = request.query as Record<string, string>;
    const limit = query.limit ? parseInt(query.limit) : 10;
    const trajectory = await getPersonSentimentTrajectory(id, limit);
    return { data: trajectory };
  });

  // GET /api/milestones/upcoming
  app.get('/milestones/upcoming', async (request) => {
    const query = request.query as Record<string, string>;
    const daysAhead = query.days ? parseInt(query.days) : 30;
    const upcoming = await getUpcomingMilestones(daysAhead);
    return { data: upcoming };
  });

  // GET /api/people/:id/co-attendance
  app.get('/people/:id/co-attendance', async (request) => {
    const { id } = request.params as { id: string };
    const coAttendance = await computeCoAttendance(id);
    return { data: coAttendance };
  });

  // PUT /api/people/:id/snooze
  app.put('/people/:id/snooze', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { until: string };
    if (!body.until) {
      return reply.code(400).send({ error: 'Bad request', message: 'until date is required', statusCode: 400 });
    }
    const person = await updatePerson(id, { snoozedUntil: new Date(body.until) } as Record<string, unknown>);
    if (!person) {
      return reply.code(404).send({ error: 'Not found', message: 'Person not found', statusCode: 404 });
    }
    return { data: person };
  });

  // GET /api/pipeline
  app.get('/pipeline', async () => {
    const pipeline = await getPipeline();
    return { data: pipeline };
  });

  // PUT /api/people/:id/stage
  app.put('/people/:id/stage', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { stage: string; reason?: string };
    if (!body.stage) {
      return reply.code(400).send({ error: 'Bad request', message: 'stage is required', statusCode: 400 });
    }
    const result = await transitionStage(id, body.stage as any, body.reason);
    if (!result) {
      return reply.code(404).send({ error: 'Not found', message: 'Person not found', statusCode: 404 });
    }
    return { data: result };
  });

  // GET /api/people/:id/stage-suggestion
  app.get('/people/:id/stage-suggestion', async (request, reply) => {
    const { id } = request.params as { id: string };
    const suggestion = await suggestStage(id);
    return { data: suggestion };
  });

  // GET /api/people/:id/reciprocity
  app.get('/people/:id/reciprocity', async (request, reply) => {
    const { id } = request.params as { id: string };
    const reciprocity = await computeReciprocityIndex(id);
    if (!reciprocity) {
      return reply.code(404).send({ error: 'Not found', message: 'Person not found', statusCode: 404 });
    }
    return { data: reciprocity };
  });

  // PUT /api/people/:id/availability
  app.put('/people/:id/availability', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { status: string; note?: string };
    if (!body.status) {
      return reply.code(400).send({ error: 'Bad request', message: 'status is required', statusCode: 400 });
    }
    const availability = {
      status: body.status,
      note: body.note || null,
      updatedAt: new Date().toISOString(),
    };
    const person = await updatePerson(id, { availability } as Record<string, unknown>);
    if (!person) {
      return reply.code(404).send({ error: 'Not found', message: 'Person not found', statusCode: 404 });
    }
    return { data: person };
  });

  // GET /api/people/:id/comm-patterns
  app.get('/people/:id/comm-patterns', async (request, reply) => {
    const { id } = request.params as { id: string };
    const patterns = await analyzeCommPatterns(id);
    if (!patterns) {
      return reply.code(404).send({ error: 'Not found', message: 'Person not found or no interaction data', statusCode: 404 });
    }
    return { data: patterns };
  });

  // GET /api/people/:id/detect-availability
  app.get('/people/:id/detect-availability', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await detectAvailability(id);
    if (!result) {
      return reply.code(404).send({ error: 'Not found', message: 'Person not found', statusCode: 404 });
    }
    return { data: result };
  });

  // GET /api/people/:id/smart-reengagement
  app.get('/people/:id/smart-reengagement', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await getSmartReengagement(id);
    if (!result) {
      return reply.code(404).send({ error: 'Not found', message: 'Person not found', statusCode: 404 });
    }
    return { data: result };
  });
}
