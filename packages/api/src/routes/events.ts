import { FastifyInstance } from 'fastify';
import { createEvent, getEvents, getEventById, updateEvent } from '../services/events.js';

export async function eventsRoutes(app: FastifyInstance) {
  // GET /api/events
  app.get('/events', async (request) => {
    const query = request.query as Record<string, string>;
    const data = await getEvents(query.limit ? parseInt(query.limit) : undefined);
    return { data };
  });

  // GET /api/events/:id
  app.get('/events/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const event = await getEventById(id);
    if (!event) {
      return reply.code(404).send({ error: 'Not found', message: 'Event not found', statusCode: 404 });
    }
    return { data: event };
  });

  // POST /api/events
  app.post('/events', async (request, reply) => {
    const body = request.body as {
      name: string;
      date: string;
      location?: string;
      description?: string;
      url?: string;
      attendeeIds?: string[];
      tags?: string[];
    };
    if (!body.name || !body.date) {
      return reply.code(400).send({
        error: 'Bad request',
        message: 'name and date are required',
        statusCode: 400,
      });
    }
    const event = await createEvent({
      ...body,
      date: new Date(body.date),
    });
    return reply.code(201).send({ data: event });
  });

  // PUT /api/events/:id
  app.put('/events/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;
    if (body.date) body.date = new Date(body.date as string);
    const event = await updateEvent(id, body);
    if (!event) {
      return reply.code(404).send({ error: 'Not found', message: 'Event not found', statusCode: 404 });
    }
    return { data: event };
  });
}
