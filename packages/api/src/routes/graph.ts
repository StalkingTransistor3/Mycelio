import { FastifyInstance } from 'fastify';
import { getGraphData, findConnectionPath, createConnection } from '../services/connections.js';

export async function graphRoutes(app: FastifyInstance) {
  // GET /api/graph — nodes + edges for D3
  app.get('/graph', async () => {
    const data = await getGraphData();
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

  // POST /api/connections
  app.post('/connections', async (request, reply) => {
    const body = request.body as {
      fromPersonId: string;
      toPersonId: string;
      strength?: 'strong' | 'medium' | 'weak';
      context?: string;
    };
    if (!body.fromPersonId || !body.toPersonId) {
      return reply.code(400).send({
        error: 'Bad request',
        message: 'fromPersonId and toPersonId are required',
        statusCode: 400,
      });
    }
    const connection = await createConnection(body);
    return reply.code(201).send({ data: connection });
  });
}
