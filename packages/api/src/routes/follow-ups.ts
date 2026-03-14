import { FastifyInstance } from 'fastify';
import { getFollowUps } from '../services/follow-ups.js';

export async function followUpsRoutes(app: FastifyInstance) {
  // GET /api/follow-ups
  app.get('/follow-ups', async (request) => {
    const query = request.query as Record<string, string>;
    const data = await getFollowUps({
      includeSnoozed: query.includeSnoozed === 'true',
      limit: query.limit ? parseInt(query.limit) : undefined,
    });
    return { data };
  });
}
