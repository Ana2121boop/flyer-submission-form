import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { asc, eq } from 'drizzle-orm';
import { getDb, productCategories } from '@flyer/db';
import { productCategorySchema } from '@flyer/shared';
import { requireAdmin } from '../../auth.js';

const idParamSchema = z.object({ id: z.coerce.number().int().positive() });
const patchSchema = productCategorySchema.partial();

export async function categoriesRoutes(app: FastifyInstance) {
  // Public: list active categories for the submission form
  app.get('/api/categories', async (_req, reply) => {
    const db = getDb();
    const rows = await db
      .select()
      .from(productCategories)
      .where(eq(productCategories.isActive, true))
      .orderBy(asc(productCategories.name));
    return reply.send(rows);
  });

  // Admin: list everything
  app.get('/api/admin/categories', { preHandler: requireAdmin }, async (_req, reply) => {
    const db = getDb();
    const rows = await db.select().from(productCategories).orderBy(asc(productCategories.name));
    return reply.send(rows);
  });

  app.post('/api/admin/categories', { preHandler: requireAdmin }, async (req, reply) => {
    const parsed = productCategorySchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ message: 'Bad Request', issues: parsed.error.issues });

    const db = getDb();
    try {
      const [row] = await db.insert(productCategories).values({
        name: parsed.data.name,
        isActive: parsed.data.isActive,
      }).returning();
      return reply.code(201).send(row);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Insert failed';
      if (msg.includes('unique')) return reply.code(409).send({ message: 'Category name already exists' });
      throw err;
    }
  });

  app.patch('/api/admin/categories/:id', { preHandler: requireAdmin }, async (req, reply) => {
    const params = idParamSchema.safeParse(req.params);
    if (!params.success) return reply.code(400).send({ message: 'Bad ID' });

    const parsed = patchSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ message: 'Bad Request', issues: parsed.error.issues });

    const db = getDb();
    const [row] = await db.update(productCategories).set(parsed.data).where(eq(productCategories.id, params.data.id)).returning();
    if (!row) return reply.code(404).send({ message: 'Not found' });
    return reply.send(row);
  });

  app.delete('/api/admin/categories/:id', { preHandler: requireAdmin }, async (req, reply) => {
    const params = idParamSchema.safeParse(req.params);
    if (!params.success) return reply.code(400).send({ message: 'Bad ID' });

    const db = getDb();
    const result = await db.delete(productCategories).where(eq(productCategories.id, params.data.id)).returning({ id: productCategories.id });
    if (result.length === 0) return reply.code(404).send({ message: 'Not found' });
    return reply.send({ message: 'Deleted', id: result[0].id });
  });
}
