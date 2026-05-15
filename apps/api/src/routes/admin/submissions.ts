import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { and, desc, eq, gte, ilike, isNull, lte, sql } from 'drizzle-orm';
import {
  getDb,
  submissions,
  submissionProducts,
  submissionProductColours,
  submissionProductDimensions,
} from '@flyer/db';
import { requireAdmin } from '../../auth.js';

const listQuerySchema = z.object({
  dateStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  storeName: z.string().min(1).optional(),
  includeDeleted: z.enum(['true', 'false']).optional(),
});

const idParamSchema = z.object({ id: z.coerce.number().int().positive() });

export async function submissionsAdminRoutes(app: FastifyInstance) {
  app.get('/api/admin/submissions', { preHandler: requireAdmin }, async (req, reply) => {
    const q = listQuerySchema.safeParse(req.query);
    if (!q.success) return reply.code(400).send({ message: 'Bad query', issues: q.error.issues });

    const db = getDb();
    const conditions = [];
    if (q.data.dateStart) conditions.push(gte(submissions.submittedAt, new Date(q.data.dateStart)));
    if (q.data.dateEnd) conditions.push(lte(submissions.submittedAt, new Date(`${q.data.dateEnd}T23:59:59.999Z`)));
    if (q.data.storeName) conditions.push(ilike(submissions.storeName, `%${q.data.storeName}%`));
    if (q.data.includeDeleted !== 'true') conditions.push(isNull(submissions.deletedAt));

    const rows = await db
      .select({
        id: submissions.id,
        submittedAt: submissions.submittedAt,
        storeName: submissions.storeName,
        submittedBy: submissions.submittedBy,
        deletedAt: submissions.deletedAt,
        productCount: sql<number>`(SELECT count(*) FROM ${submissionProducts} WHERE ${submissionProducts.submissionId} = ${submissions.id})::int`,
      })
      .from(submissions)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(submissions.submittedAt));

    return reply.send(rows);
  });

  app.get('/api/admin/submission/:id', { preHandler: requireAdmin }, async (req, reply) => {
    const params = idParamSchema.safeParse(req.params);
    if (!params.success) return reply.code(400).send({ message: 'Bad ID' });

    const db = getDb();
    const submission = await db.query.submissions.findFirst({
      where: eq(submissions.id, params.data.id),
      with: {
        flyerWindow: true,
        products: {
          with: { category: true, colours: true, dimensions: true },
          orderBy: (p, { asc }) => [asc(p.pageNumber), asc(p.slotIndex), asc(p.sortOrder)],
        },
      },
    });

    if (!submission) return reply.code(404).send({ message: 'Not found' });
    return reply.send(submission);
  });

  app.delete('/api/admin/submission/:id', { preHandler: requireAdmin }, async (req, reply) => {
    const params = idParamSchema.safeParse(req.params);
    if (!params.success) return reply.code(400).send({ message: 'Bad ID' });

    const db = getDb();
    const result = await db
      .update(submissions)
      .set({ deletedAt: new Date() })
      .where(and(eq(submissions.id, params.data.id), isNull(submissions.deletedAt)))
      .returning({ id: submissions.id });

    if (result.length === 0) return reply.code(404).send({ message: 'Not found or already deleted' });
    return reply.send({ message: 'Moved to trash', id: result[0].id });
  });

  app.post('/api/admin/submission/:id/restore', { preHandler: requireAdmin }, async (req, reply) => {
    const params = idParamSchema.safeParse(req.params);
    if (!params.success) return reply.code(400).send({ message: 'Bad ID' });

    const db = getDb();
    const result = await db
      .update(submissions)
      .set({ deletedAt: null })
      .where(eq(submissions.id, params.data.id))
      .returning({ id: submissions.id });

    if (result.length === 0) return reply.code(404).send({ message: 'Not found' });
    return reply.send({ message: 'Restored', id: result[0].id });
  });

  // Hard delete — permanent. Cascades to products / colours / dimensions via FK.
  app.delete('/api/admin/submission/:id/permanent', { preHandler: requireAdmin }, async (req, reply) => {
    const params = idParamSchema.safeParse(req.params);
    if (!params.success) return reply.code(400).send({ message: 'Bad ID' });

    const db = getDb();
    // TODO Phase 1.5: also delete associated images from R2 here
    const result = await db
      .delete(submissions)
      .where(eq(submissions.id, params.data.id))
      .returning({ id: submissions.id });

    if (result.length === 0) return reply.code(404).send({ message: 'Not found' });
    return reply.send({ message: 'Permanently deleted', id: result[0].id });
  });
}
