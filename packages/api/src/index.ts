import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../../.env') });
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { healthRoutes } from './routes/health.js';
import { peopleRoutes } from './routes/people.js';
import { interactionsRoutes } from './routes/interactions.js';
import { eventsRoutes } from './routes/events.js';
import { communitiesRoutes } from './routes/communities.js';
import { graphRoutes } from './routes/graph.js';
import { followUpsRoutes } from './routes/follow-ups.js';
import { authPlugin } from './auth.js';

const port = parseInt(process.env.API_PORT || '3001', 10);

const app = Fastify({ logger: true });

async function start() {
  await app.register(cors, { origin: true });
  await app.register(authPlugin);
  await app.register(healthRoutes);
  await app.register(peopleRoutes, { prefix: '/api' });
  await app.register(interactionsRoutes, { prefix: '/api' });
  await app.register(eventsRoutes, { prefix: '/api' });
  await app.register(communitiesRoutes, { prefix: '/api' });
  await app.register(graphRoutes, { prefix: '/api' });
  await app.register(followUpsRoutes, { prefix: '/api' });

  try {
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`Mycelio API running on http://localhost:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
