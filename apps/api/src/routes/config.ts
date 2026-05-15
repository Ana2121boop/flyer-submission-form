import type { FastifyInstance } from 'fastify';
import { env } from '../env.js';

export async function configRoutes(app: FastifyInstance) {
  app.get('/api/config', async (_req, reply) => {
    return reply.send({
      flyerAdvanceMonths: env.FLYER_ADVANCE_MONTHS,
    });
  });
}
