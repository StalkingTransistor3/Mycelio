import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';

async function auth(app: FastifyInstance) {
  app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    const apiKey = request.headers['x-api-key'];
    const expectedKey = process.env.API_KEY;

    // In development, skip auth if no API_KEY is configured
    if (!expectedKey) return;

    if (apiKey !== expectedKey) {
      reply.code(401).send({ error: 'Unauthorized', message: 'Invalid API key', statusCode: 401 });
    }
  });
}

export const authPlugin = fp(auth);
