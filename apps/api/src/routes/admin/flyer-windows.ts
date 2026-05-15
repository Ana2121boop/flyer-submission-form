import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { and, asc, desc, eq, gt } from 'drizzle-orm';
import { getDb, flyerWindows } from '@flyer/db';
import { flyerWindowSchema } from '@flyer/shared';
import { requireAdmin } from '../../auth.js';

const idParamSchema = z.object({ id: z.coerce.number().int().positive() });
const patchSchema = flyerWindowSchema.partial();

export async function flyerWindowsRoutes(app: FastifyInstance) {
  // Public: list open windows for the submission form
  app.get('/api/flyer-windows', async (_req, reply) => {
    const db = getDb();
    const rows = await db
      .select()
      .from(flyerWindows)
      .where(and(eq(flyerWindows.isOpen, true), gt(flyerWindows.submissionDeadline, new Date())))
      .orderBy(asc(flyerWindows.flyerStartDate));
    return reply.send(rows);
  });

  // Admin: list everything
  app.get('/api/admin/flyer-windows', { preHandler: requireAdmin }, async (_req, reply) => {
    const db = getDb();
    const rows = await db.select().from(flyerWindows).orderBy(desc(flyerWindows.flyerStartDate));
    return reply.send(rows);
  });

  app.post('/api/admin/flyer-windows', { preHandler: requireAdmin }, async (req, reply) => {
    const parsed = flyerWindowSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ message: 'Bad Request', issues: parsed.error.issues });

    const db = getDb();
    const [row] = await db.insert(flyerWindows).values({
      label: parsed.data.label ?? null,
      flyerStartDate: parsed.data.flyerStartDate,
      flyerEndDate: parsed.data.flyerEndDate,
      submissionDeadline: new Date(parsed.data.submissionDeadline),
      flyerSize: parsed.data.flyerSize,
      pageCount: parsed.data.pageCount,
      isOpen: parsed.data.isOpen,
      createdByAdminId: req.user.userId,
    }).returning();
    return reply.code(201).send(row);
  });

  app.patch('/api/admin/flyer-windows/:id', { preHandler: requireAdmin }, async (req, reply) => {
    const params = idParamSchema.safeParse(req.params);
    if (!params.success) return reply.code(400).send({ message: 'Bad ID' });

    const parsed = patchSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ message: 'Bad Request', issues: parsed.error.issues });

    const updates: Record<string, unknown> = {};
    if (parsed.data.label !== undefined) updates.label = parsed.data.label;
    if (parsed.data.flyerStartDate !== undefined) updates.flyerStartDate = parsed.data.flyerStartDate;
    if (parsed.data.flyerEndDate !== undefined) updates.flyerEndDate = parsed.data.flyerEndDate;
    if (parsed.data.submissionDeadline !== undefined) updates.submissionDeadline = new Date(parsed.data.submissionDeadline);
    if (parsed.data.flyerSize !== undefined) updates.flyerSize = parsed.data.flyerSize;
    if (parsed.data.pageCount !== undefined) updates.pageCount = parsed.data.pageCount;
    if (parsed.data.isOpen !== undefined) updates.isOpen = parsed.data.isOpen;

    const db = getDb();
    const [row] = await db.update(flyerWindows).set(updates).where(eq(flyerWindows.id, params.data.id)).returning();
    if (!row) return reply.code(404).send({ message: 'Not found' });
    return reply.send(row);
  });

  app.delete('/api/admin/flyer-windows/:id', { preHandler: requireAdmin }, async (req, reply) => {
    const params = idParamSchema.safeParse(req.params);
    if (!params.success) return reply.code(400).send({ message: 'Bad ID' });

    const db = getDb();
    const result = await db.delete(flyerWindows).where(eq(flyerWindows.id, params.data.id)).returning({ id: flyerWindows.id });
    if (result.length === 0) return reply.code(404).send({ message: 'Not found' });
    return reply.send({ message: 'Deleted', id: result[0].id });
  });
}
