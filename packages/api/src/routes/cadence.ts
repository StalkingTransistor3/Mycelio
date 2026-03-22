import { FastifyInstance } from 'fastify';
import { getDailyCadenceReport, getWeeklyCadenceStats, formatCadenceReport, formatWeeklyStats } from '../services/cadence.js';

export async function cadenceRoutes(app: FastifyInstance) {
  // GET /api/cadence/daily — Today's cadence report
  app.get('/cadence/daily', async (request) => {
    const query = request.query as Record<string, string>;
    const report = await getDailyCadenceReport({
      budgetMinutes: query.budgetMinutes ? parseInt(query.budgetMinutes) : undefined,
      maxEntries: query.maxEntries ? parseInt(query.maxEntries) : undefined,
      tierFilter: query.tierFilter ? query.tierFilter.split(',').map(Number) : undefined,
      includeFresh: query.includeFresh === 'true',
    });

    if (query.format === 'text') {
      return { data: formatCadenceReport(report) };
    }
    return { data: report };
  });

  // GET /api/cadence/stats — Weekly compliance stats
  app.get('/cadence/stats', async (request) => {
    const query = request.query as Record<string, string>;
    const stats = await getWeeklyCadenceStats();

    if (query.format === 'text') {
      return { data: formatWeeklyStats(stats) };
    }
    return { data: stats };
  });
}
