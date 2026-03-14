import { FastifyInstance } from 'fastify';
import { logInteraction, getInteractionsByPerson, getInteractionsByEvent, getRecentInteractions } from '../services/interactions.js';

export async function interactionsRoutes(app: FastifyInstance) {
  // GET /api/interactions
  app.get('/interactions', async (request) => {
    const query = request.query as Record<string, string>;
    if (query.personId) {
      const data = await getInteractionsByPerson(query.personId, query.limit ? parseInt(query.limit) : undefined);
      return { data };
    }
    if (query.eventId) {
      const data = await getInteractionsByEvent(query.eventId, query.limit ? parseInt(query.limit) : undefined);
      return { data };
    }
    const data = await getRecentInteractions(query.limit ? parseInt(query.limit) : undefined);
    return { data };
  });

  // POST /api/interactions
  app.post('/interactions', async (request, reply) => {
    const body = request.body as {
      personId: string;
      personIds?: string[];
      eventId?: string;
      type: string;
      sentiment?: string;
      energy?: number;
      initiatedBy?: string;
      summary: string;
      details?: string;
      occurredAt?: string;
    };
    if (!body.personId || !body.type || !body.summary) {
      return reply.code(400).send({
        error: 'Bad request',
        message: 'personId, type, and summary are required',
        statusCode: 400,
      });
    }
    const interaction = await logInteraction({
      ...body,
      occurredAt: body.occurredAt ? new Date(body.occurredAt) : undefined,
    });
    return reply.code(201).send({ data: interaction });
  });
}
