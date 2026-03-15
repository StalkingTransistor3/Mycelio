import { FastifyInstance } from 'fastify';
import {
  searchCampaigns,
  getCampaignWithStats,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  getCampaignMembers,
  addCampaignMember,
  addBulkCampaignMembers,
  updateCampaignMember,
  removeCampaignMember,
  getCampaignStats,
} from '../services/campaigns.js';

export async function campaignsRoutes(app: FastifyInstance) {
  // GET /api/campaigns
  app.get('/campaigns', async (request) => {
    const query = request.query as Record<string, string>;
    const data = await searchCampaigns({
      query: query.q,
      status: query.status as any,
      type: query.type as any,
      tags: query.tags ? query.tags.split(',') : undefined,
      limit: query.limit ? parseInt(query.limit) : undefined,
      offset: query.offset ? parseInt(query.offset) : undefined,
    });
    return { data };
  });

  // GET /api/campaigns/:id
  app.get('/campaigns/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const campaign = await getCampaignWithStats(id);
    if (!campaign) {
      return reply.code(404).send({ error: 'Not found', message: 'Campaign not found', statusCode: 404 });
    }
    return { data: campaign };
  });

  // POST /api/campaigns
  app.post('/campaigns', async (request, reply) => {
    const body = request.body as {
      name: string;
      description?: string;
      goal?: string;
      status?: string;
      type?: string;
      tags?: string[];
      organizationIds?: string[];
      eventIds?: string[];
      startDate?: string;
      endDate?: string;
    };
    if (!body.name) {
      return reply.code(400).send({
        error: 'Bad request',
        message: 'name is required',
        statusCode: 400,
      });
    }
    const campaign = await createCampaign({
      ...body,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
    });
    return reply.code(201).send({ data: campaign });
  });

  // PUT /api/campaigns/:id
  app.put('/campaigns/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;
    if (body.startDate) body.startDate = new Date(body.startDate as string);
    if (body.endDate) body.endDate = new Date(body.endDate as string);
    const campaign = await updateCampaign(id, body);
    if (!campaign) {
      return reply.code(404).send({ error: 'Not found', message: 'Campaign not found', statusCode: 404 });
    }
    return { data: campaign };
  });

  // DELETE /api/campaigns/:id
  app.delete('/campaigns/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const campaign = await deleteCampaign(id);
    if (!campaign) {
      return reply.code(404).send({ error: 'Not found', message: 'Campaign not found', statusCode: 404 });
    }
    return { data: campaign };
  });

  // GET /api/campaigns/:id/members
  app.get('/campaigns/:id/members', async (request) => {
    const { id } = request.params as { id: string };
    const query = request.query as Record<string, string>;
    const data = await getCampaignMembers(id, {
      query: query.q,
      status: query.status as any,
      tier: query.tier ? (parseInt(query.tier) as any) : undefined,
      stage: query.stage as any,
      tags: query.tags ? query.tags.split(',') : undefined,
      organizationId: query.organizationId,
      minWarmth: query.minWarmth ? parseInt(query.minWarmth) : undefined,
      maxWarmth: query.maxWarmth ? parseInt(query.maxWarmth) : undefined,
      sortBy: query.sortBy as any,
      sortOrder: query.sortOrder as any,
      limit: query.limit ? parseInt(query.limit) : undefined,
      offset: query.offset ? parseInt(query.offset) : undefined,
    });
    return { data };
  });

  // POST /api/campaigns/:id/members
  app.post('/campaigns/:id/members', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      personId: string;
      priority?: number;
      warmth?: number;
      notes?: string;
      nextAction?: string;
      nextActionAt?: string;
    };
    if (!body.personId) {
      return reply.code(400).send({
        error: 'Bad request',
        message: 'personId is required',
        statusCode: 400,
      });
    }
    const member = await addCampaignMember(id, {
      ...body,
      nextActionAt: body.nextActionAt ? new Date(body.nextActionAt) : undefined,
    });
    return reply.code(201).send({ data: member });
  });

  // POST /api/campaigns/:id/members/bulk
  app.post('/campaigns/:id/members/bulk', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { personIds: string[] };
    if (!body.personIds || !Array.isArray(body.personIds)) {
      return reply.code(400).send({
        error: 'Bad request',
        message: 'personIds array is required',
        statusCode: 400,
      });
    }
    const result = await addBulkCampaignMembers(id, body.personIds);
    return reply.code(201).send({ data: result });
  });

  // PUT /api/campaigns/:id/members/:memberId
  app.put('/campaigns/:id/members/:memberId', async (request, reply) => {
    const { memberId } = request.params as { id: string; memberId: string };
    const body = request.body as Record<string, unknown>;
    if (body.nextActionAt) body.nextActionAt = new Date(body.nextActionAt as string);
    if (body.lastOutreachAt) body.lastOutreachAt = new Date(body.lastOutreachAt as string);
    const member = await updateCampaignMember(memberId, body);
    if (!member) {
      return reply.code(404).send({ error: 'Not found', message: 'Campaign member not found', statusCode: 404 });
    }
    return { data: member };
  });

  // DELETE /api/campaigns/:id/members/:memberId
  app.delete('/campaigns/:id/members/:memberId', async (request, reply) => {
    const { memberId } = request.params as { id: string; memberId: string };
    const member = await removeCampaignMember(memberId);
    if (!member) {
      return reply.code(404).send({ error: 'Not found', message: 'Campaign member not found', statusCode: 404 });
    }
    return { data: member };
  });

  // GET /api/campaigns/:id/stats
  app.get('/campaigns/:id/stats', async (request) => {
    const { id } = request.params as { id: string };
    const stats = await getCampaignStats(id);
    return { data: stats };
  });
}
