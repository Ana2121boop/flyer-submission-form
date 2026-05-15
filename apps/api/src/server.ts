import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { env } from './env.js';
import { loginRoutes } from './routes/admin/login.js';
import { submitRoutes } from './routes/submit.js';
import { submissionsAdminRoutes } from './routes/admin/submissions.js';
import { flyerWindowsRoutes } from './routes/admin/flyer-windows.js';
import { categoriesRoutes } from './routes/admin/categories.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function buildServer() {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      transport: env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
    },
    bodyLimit: 2 * 1024 * 1024,
  });

  await app.register(cors, { origin: true, credentials: true });
  await app.register(jwt, { secret: env.JWT_SECRET, sign: { expiresIn: '1h' } });
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });

  app.get('/api/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
  }));

  await app.register(loginRoutes);
  await app.register(submitRoutes);
  await app.register(submissionsAdminRoutes);
  await app.register(flyerWindowsRoutes);
  await app.register(categoriesRoutes);

  // Serve legacy frontend during the transition. Will be replaced by apps/web build in Phase 4.
  const legacyRoot = resolve(__dirname, '../../../legacy');
  await app.register(fastifyStatic, { root: legacyRoot, prefix: '/' });

  return app;
}

const app = await buildServer();

try {
  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  app.log.info(`Flyer API listening on :${env.PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
