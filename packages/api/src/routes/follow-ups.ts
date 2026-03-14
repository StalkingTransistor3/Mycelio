import { FastifyInstance } from 'fastify';
import { getFollowUps } from '../services/follow-ups.js';

export async function followUpsRoutes(app: FastifyInstance) {
  // GET /api/follow-ups
  app.get('/follow-ups', async () => {
    const data = await getFollowUps();
    return { data };
  });
}
