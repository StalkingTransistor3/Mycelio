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
import { graphRoutes } from './routes/graph.js';
import { followUpsRoutes } from './routes/follow-ups.js';
import { organizationsRoutes } from './routes/organizations.js';
import { venueRoutes } from './routes/venues.js';
import { campaignsRoutes } from './routes/campaigns.js';
import { cadenceRoutes } from './routes/cadence.js';
import { projectsRoutes } from './routes/projects.js';
import { docsRoutes } from './routes/docs.js';
import { relationshipsRoutes } from './routes/relationships.js';
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
  await app.register(graphRoutes, { prefix: '/api' });
  await app.register(followUpsRoutes, { prefix: '/api' });
  await app.register(organizationsRoutes, { prefix: '/api' });
  await app.register(venueRoutes, { prefix: '/api' });
  await app.register(campaignsRoutes, { prefix: '/api' });
  await app.register(cadenceRoutes, { prefix: '/api' });
  await app.register(projectsRoutes, { prefix: '/api' });
  await app.register(docsRoutes, { prefix: '/api' });
  await app.register(relationshipsRoutes, { prefix: '/api' });

  try {
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`Mycelio API running on http://localhost:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
