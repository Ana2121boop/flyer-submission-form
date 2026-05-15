import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { getDb, submissions } from '@flyer/db';
import { requireAdmin } from '../../auth.js';
import { renderHtmlToPdf, renderSubmissionHtml } from '../../services/pdf.js';

const idParamSchema = z.object({ id: z.coerce.number().int().positive() });

export async function pdfRoutes(app: FastifyInstance) {
  app.get('/api/admin/submission/:id/pdf', { preHandler: requireAdmin }, async (req, reply) => {
    const params = idParamSchema.safeParse(req.params);
    if (!params.success) return reply.code(400).send({ message: 'Bad ID' });

    const db = getDb();
    const submission = await db.query.submissions.findFirst({
      where: eq(submissions.id, params.data.id),
      with: {
        products: {
          with: { category: true, colours: true, dimensions: true },
          orderBy: (p, { asc }) => [asc(p.pageNumber), asc(p.slotIndex), asc(p.sortOrder)],
        },
      },
    });

    if (!submission) return reply.code(404).send({ message: 'Not found' });

    try {
      const html = renderSubmissionHtml(submission as Parameters<typeof renderSubmissionHtml>[0]);
      const pdfBuffer = await renderHtmlToPdf(html);

      const filename = `flyer-${submission.id}-${slugify(submission.storeName)}.pdf`;
      reply
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', `inline; filename="${filename}"`);
      return reply.send(pdfBuffer);
    } catch (err) {
      req.log.error({ err }, 'PDF generation failed');
      return reply.code(500).send({ message: 'PDF generation failed' });
    }
  });
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'submission';
}
