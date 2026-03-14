import { FastifyInstance } from 'fastify';
import { getCommunities, getCommunityById, createCommunity, getCommunityHealth } from '../services/communities.js';

export async function communitiesRoutes(app: FastifyInstance) {
  // GET /api/communities
  app.get('/communities', async () => {
    const data = await getCommunities();
    return { data };
  });

  // GET /api/communities/:id
  app.get('/communities/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const community = await getCommunityById(id);
    if (!community) {
      return reply.code(404).send({ error: 'Not found', message: 'Community not found', statusCode: 404 });
    }
    return { data: community };
  });

  // GET /api/communities/:id/health
  app.get('/communities/:id/health', async (request, reply) => {
    const { id } = request.params as { id: string };
    const health = await getCommunityHealth(id);
    if (!health) {
      return reply.code(404).send({ error: 'Not found', message: 'Community not found', statusCode: 404 });
    }
    return { data: health };
  });

  // POST /api/communities
  app.post('/communities', async (request, reply) => {
    const body = request.body as {
      name: string;
      description?: string;
      memberIds?: string[];
      tags?: string[];
    };
    if (!body.name) {
      return reply.code(400).send({
        error: 'Bad request',
        message: 'name is required',
        statusCode: 400,
      });
    }
    const community = await createCommunity(body);
    return reply.code(201).send({ data: community });
  });
}
