import type { FastifyInstance } from 'fastify';
import { env } from '../env.js';
import { canEmailSubmitters } from '../services/email.js';

export async function configRoutes(app: FastifyInstance) {
  app.get('/api/config', async (_req, reply) => {
    return reply.send({
      flyerAdvanceMonths: env.FLYER_ADVANCE_MONTHS,
      // The form only asks for an email when it can send the store a copy.
      submitterCopies: canEmailSubmitters(),
    });
  });
}
