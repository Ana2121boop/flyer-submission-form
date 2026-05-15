import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { env } from './env.js';
import { bootstrap } from './bootstrap.js';
import { loginRoutes } from './routes/admin/login.js';
import { submitRoutes } from './routes/submit.js';
import { submissionsAdminRoutes } from './routes/admin/submissions.js';
import { flyerWindowsRoutes } from './routes/admin/flyer-windows.js';
import { categoriesRoutes } from './routes/admin/categories.js';
import { pdfRoutes } from './routes/admin/pdf.js';
import { exportRoutes } from './routes/admin/export.js';
import { uploadsRoutes } from './routes/uploads.js';
import { configRoutes } from './routes/config.js';

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
  await app.register(pdfRoutes);
  await app.register(exportRoutes);
  await app.register(uploadsRoutes);
  await app.register(configRoutes);

  // Serve the React app build. Falls back to index.html for client-side routes.
  const webDist = resolve(__dirname, '../../web/dist');
  const legacyRoot = resolve(__dirname, '../../../legacy');
  const { existsSync } = await import('node:fs');
  const staticRoot = existsSync(webDist) ? webDist : legacyRoot;

  await app.register(fastifyStatic, { root: staticRoot, prefix: '/' });

  // SPA fallback: any non-API GET request returns index.html so React Router can handle it.
  app.setNotFoundHandler((req, reply) => {
    if (req.method !== 'GET' || req.url.startsWith('/api')) {
      return reply.code(404).send({ message: 'Not Found' });
    }
    return reply.sendFile('index.html', staticRoot);
  });

  return app;
}

const app = await buildServer();

try {
  await bootstrap({
    info: (msg) => app.log.info(msg),
    warn: (msg) => app.log.warn(msg),
  });
  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  app.log.info(`Flyer API listening on :${env.PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
