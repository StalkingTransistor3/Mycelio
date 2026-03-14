import { FastifyInstance } from 'fastify';
import { createVenue, getVenues, getVenueById, updateVenue, getVenueHistory, searchVenues } from '../services/venues.js';

export async function venueRoutes(app: FastifyInstance) {
  // GET /api/venues
  app.get('/venues', async (request) => {
    const query = request.query as Record<string, string>;
    if (query.name || query.minCapacity || query.vibe || query.tags) {
      const results = await searchVenues({
        name: query.name,
        minCapacity: query.minCapacity ? parseInt(query.minCapacity) : undefined,
        vibe: query.vibe ? query.vibe.split(',') : undefined,
        tags: query.tags ? query.tags.split(',') : undefined,
      });
      return { data: results };
    }
    const data = await getVenues();
    return { data };
  });

  // GET /api/venues/:id
  app.get('/venues/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const venue = await getVenueById(id);
    if (!venue) {
      return reply.code(404).send({ error: 'Not found', message: 'Venue not found', statusCode: 404 });
    }
    return { data: venue };
  });

  // POST /api/venues
  app.post('/venues', async (request, reply) => {
    const body = request.body as {
      name: string;
      address?: string;
      capacity?: number;
      vibe?: string[];
      contactPersonId?: string;
      organizationId?: string;
      notes?: string;
      tags?: string[];
      availability?: Record<string, unknown>;
    };
    if (!body.name) {
      return reply.code(400).send({ error: 'Bad request', message: 'Name is required', statusCode: 400 });
    }
    const venue = await createVenue(body);
    return reply.code(201).send({ data: venue });
  });

  // PUT /api/venues/:id
  app.put('/venues/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;
    const venue = await updateVenue(id, body);
    if (!venue) {
      return reply.code(404).send({ error: 'Not found', message: 'Venue not found', statusCode: 404 });
    }
    return { data: venue };
  });

  // GET /api/venues/:id/events
  app.get('/venues/:id/events', async (request) => {
    const { id } = request.params as { id: string };
    const events = await getVenueHistory(id);
    return { data: events };
  });
}
