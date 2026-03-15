import { FastifyInstance } from 'fastify';
import { getGraphData, getEgoGraph, findConnectionPath, createConnection } from '../services/connections.js';
import { computeInfluenceScores, detectMicroCommunities, findWarmPath, getSocialContext } from '../services/graph-analytics.js';

export async function graphRoutes(app: FastifyInstance) {
  // GET /api/graph — nodes + edges for D3
  // Supports ?tier=N and ?limit=N query params for filtering
  app.get('/graph', async (request) => {
    const query = request.query as Record<string, string>;
    const options: { tier?: number; limit?: number } = {};
    if (query.tier) options.tier = parseInt(query.tier, 10);
    if (query.limit) options.limit = parseInt(query.limit, 10);
    const data = await getGraphData(options);
    return { data };
  });

  // GET /api/graph/ego/:personId — ego-centric subgraph
  app.get('/graph/ego/:personId', async (request) => {
    const { personId } = request.params as { personId: string };
    const query = request.query as Record<string, string>;
    const depth = query.depth ? parseInt(query.depth, 10) : 1;
    const data = await getEgoGraph(personId, depth);
    return { data };
  });

  // GET /api/graph/path?from=X&to=Y — find connection paths
  app.get('/graph/path', async (request, reply) => {
    const query = request.query as Record<string, string>;
    if (!query.from || !query.to) {
      return reply.code(400).send({
        error: 'Bad request',
        message: 'from and to query params are required',
        statusCode: 400,
      });
    }
    const paths = await findConnectionPath(query.from, query.to);
    return { data: { paths } };
  });

  // GET /api/graph/influence — influence scores for all people
  app.get('/graph/influence', async () => {
    const scores = await computeInfluenceScores();
    return { data: scores };
  });

  // GET /api/graph/communities — detect micro-communities
  app.get('/graph/communities', async () => {
    const communities = await detectMicroCommunities();
    return { data: communities };
  });

  // GET /api/graph/warm-path?from=X&to=Y — find warmest intro path
  app.get('/graph/warm-path', async (request, reply) => {
    const query = request.query as Record<string, string>;
    if (!query.from || !query.to) {
      return reply.code(400).send({ error: 'Bad request', message: 'from and to are required', statusCode: 400 });
    }
    const paths = await findWarmPath(query.from, query.to);
    return { data: paths };
  });

  // GET /api/graph/social-context/:id — social context for a person
  app.get('/graph/social-context/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const context = await getSocialContext(id);
    if (!context) {
      return reply.code(404).send({ error: 'Not found', message: 'Person not found', statusCode: 404 });
    }
    return { data: context };
  });

  // POST /api/connections
  app.post('/connections', async (request, reply) => {
    const body = request.body as {
      fromPersonId: string;
      toPersonId: string;
      strength?: 'strong' | 'medium' | 'weak';
      type?: string;
      context?: string;
      howMet?: string;
      connectedAt?: string;
    };
    if (!body.fromPersonId || !body.toPersonId) {
      return reply.code(400).send({
        error: 'Bad request',
        message: 'fromPersonId and toPersonId are required',
        statusCode: 400,
      });
    }
    const connection = await createConnection({
      ...body,
      type: body.type as any,
      connectedAt: body.connectedAt ? new Date(body.connectedAt) : undefined,
    });
    return reply.code(201).send({ data: connection });
  });
}
