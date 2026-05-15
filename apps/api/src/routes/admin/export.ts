import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import archiver from 'archiver';
import { getDb, submissions } from '@flyer/db';
import { requireAdmin } from '../../auth.js';
import { renderHtmlToPdf, renderSubmissionHtml } from '../../services/pdf.js';

const idParamSchema = z.object({ id: z.coerce.number().int().positive() });

export async function exportRoutes(app: FastifyInstance) {
  app.get('/api/admin/submission/:id/export', { preHandler: requireAdmin }, async (req, reply) => {
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

    const filename = `flyer-${submission.id}-${slugify(submission.storeName)}-designer-pack.zip`;
    reply
      .header('Content-Type', 'application/zip')
      .header('Content-Disposition', `attachment; filename="${filename}"`);

    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.on('warning', (err) => req.log.warn({ err }, 'archiver warning'));
    archive.on('error', (err) => req.log.error({ err }, 'archiver error'));

    // Pipe the archive to the response. Returning the stream lets Fastify
    // handle backpressure correctly.
    reply.send(archive);

    // 1. Summary PDF (server-rendered HTML -> PDF, same as the download button)
    try {
      const html = renderSubmissionHtml(submission as Parameters<typeof renderSubmissionHtml>[0]);
      const pdfBuffer = await renderHtmlToPdf(html);
      archive.append(pdfBuffer, { name: 'summary.pdf' });
    } catch (err) {
      req.log.error({ err }, 'Export: failed to generate PDF');
      archive.append(`PDF generation failed: ${err instanceof Error ? err.message : 'unknown'}`, { name: 'summary-error.txt' });
    }

    // 2. Full-resolution product images, organized by page and product
    const slugCount = new Map<string, number>();
    for (const p of submission.products) {
      if (!p.imageUrl) continue;
      try {
        const res = await fetch(p.imageUrl);
        if (!res.ok) {
          archive.append(`Could not fetch image: ${res.status}`, { name: `images/page-${p.pageNumber}/_failed-${p.id}.txt` });
          continue;
        }
        const buf = Buffer.from(await res.arrayBuffer());
        const ext = inferExt(res.headers.get('content-type') ?? '', p.imageUrl);
        let base = slugify(p.name) || `product-${p.id}`;
        const dedupeKey = `page-${p.pageNumber}/${base}`;
        const count = (slugCount.get(dedupeKey) ?? 0) + 1;
        slugCount.set(dedupeKey, count);
        const suffix = count > 1 ? `-${count}` : '';
        archive.append(buf, { name: `images/page-${p.pageNumber}/${base}${suffix}${ext}` });
      } catch (err) {
        req.log.warn({ err, url: p.imageUrl }, 'Export: image fetch failed');
        archive.append(`Image fetch failed for ${p.imageUrl}`, { name: `images/page-${p.pageNumber}/_failed-${p.id}.txt` });
      }
    }

    // 3. Plain-text checklist for the designer
    archive.append(designerNotes(submission as DesignerNotesInput), { name: 'README.txt' });

    archive.finalize();
  });
}

function inferExt(contentType: string, url: string): string {
  if (contentType.includes('jpeg') || contentType.includes('jpg')) return '.jpg';
  if (contentType.includes('png')) return '.png';
  if (contentType.includes('webp')) return '.webp';
  if (contentType.includes('gif')) return '.gif';
  const m = url.match(/\.([a-z0-9]{2,4})(?:\?.*)?$/i);
  return m ? `.${m[1].toLowerCase()}` : '.jpg';
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
}

type ProductSummary = {
  name: string;
  isMainFlyerProduct: boolean;
  isBundle: boolean;
  requestStockImage: boolean;
  includeInSocial: boolean;
};

type DesignerNotesInput = {
  id: number;
  storeName: string;
  submittedBy: string;
  flyerStartDate: string | null;
  flyerEndDate: string | null;
  flyerSize: string | null;
  pageCount: number | null;
  theme: string | null;
  generalNotes: string | null;
  printNotes: string | null;
  bannerDetails: string | null;
  postersRequested: number;
  priceCardsRequested: number;
  facebookAdsEnabled: boolean;
  facebookAdsBudget: string | null;
  printCanadaPost: boolean;
  canadaPostBudget: string | null;
  products: ProductSummary[];
};

function designerNotes(s: DesignerNotesInput): string {
  const stockNeeded = s.products.filter((p) => p.requestStockImage).map((p) => p.name);
  const socialPicks = s.products.filter((p) => p.includeInSocial).map((p) => p.name);
  const mainProducts = s.products.filter((p) => p.isMainFlyerProduct).map((p) => p.name);

  return [
    `WINDSOR PLYWOOD — DESIGNER PACK`,
    `Submission #${s.id} · ${s.storeName}`,
    `Submitted by: ${s.submittedBy}`,
    ``,
    `── FLYER ──`,
    `Dates:   ${s.flyerStartDate ?? '—'} → ${s.flyerEndDate ?? '—'}`,
    `Size:    ${s.flyerSize ?? '—'}`,
    `Pages:   ${s.pageCount ?? '—'}`,
    `Theme:   ${s.theme ?? '—'}`,
    ``,
    `── MARKETING ──`,
    `Canada Post:    ${s.printCanadaPost ? `yes${s.canadaPostBudget ? ` ($${s.canadaPostBudget})` : ''}` : 'no'}`,
    `Facebook ads:   ${s.facebookAdsEnabled ? `yes${s.facebookAdsBudget ? ` ($${s.facebookAdsBudget})` : ''}` : 'no'}`,
    `Posters:        ${s.postersRequested}`,
    `Price-card sets: ${s.priceCardsRequested}`,
    `Banner details: ${s.bannerDetails ?? '—'}`,
    ``,
    `── PRODUCTS ──`,
    `Total: ${s.products.length}`,
    `Main flyer products: ${mainProducts.length ? mainProducts.join(', ') : 'none flagged'}`,
    `For social media:    ${socialPicks.length ? socialPicks.join(', ') : 'none'}`,
    `Stock images needed: ${stockNeeded.length ? stockNeeded.join(', ') : 'none'}`,
    ``,
    `── FILES IN THIS PACK ──`,
    `summary.pdf  — Printable summary with everything needed.`,
    `images/      — Original product photos, organized by page.`,
    `README.txt   — This file.`,
    ``,
    `── NOTES ──`,
    `General: ${s.generalNotes ?? '—'}`,
    `Print:   ${s.printNotes ?? '—'}`,
    ``,
    `Generated ${new Date().toISOString()}`,
  ].join('\n');
}
