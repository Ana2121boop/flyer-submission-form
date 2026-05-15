import type { FastifyInstance } from 'fastify';
import {
  getDb,
  submissions,
  submissionProducts,
  submissionProductColours,
  submissionProductDimensions,
} from '@flyer/db';
import { submissionSchema, earliestFlyerStartDate } from '@flyer/shared';
import { sendNewSubmissionEmail } from '../services/email.js';
import { env } from '../env.js';

export async function submitRoutes(app: FastifyInstance) {
  app.post('/api/submit', async (req, reply) => {
    const parsed = submissionSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Bad Request', issues: parsed.error.issues });
    }
    const data = parsed.data;

    // Server-enforced lead time. The shared schema doesn't know about env,
    // so we apply it here.
    const earliest = earliestFlyerStartDate(env.FLYER_ADVANCE_MONTHS);
    if (data.flyerStartDate < earliest) {
      return reply.code(400).send({
        message: 'Bad Request',
        issues: [{
          path: ['flyerStartDate'],
          message: `Flyer start date must be ${earliest} or later`,
        }],
      });
    }

    const db = getDb();

    const insertedId = await db.transaction(async (tx) => {
      const [row] = await tx.insert(submissions).values({
        storeName: data.storeName,
        submittedBy: data.submittedBy,
        flyerStartDate: data.flyerStartDate,
        flyerEndDate: data.flyerEndDate,
        flyerSize: data.flyerSize,
        pageCount: data.pageCount,
        theme: data.theme ?? null,
        generalNotes: data.generalNotes ?? null,
        printCanadaPost: data.printCanadaPost,
        printDigital: data.printDigital,
        canadaPostBudget: data.canadaPostBudget?.toString() ?? null,
        facebookAdsEnabled: data.facebookAdsEnabled,
        facebookAdsBudget: data.facebookAdsBudget?.toString() ?? null,
        postersRequested: data.postersRequested,
        priceCardsRequested: data.priceCardsRequested,
        bannerDetails: data.bannerDetails ?? null,
        reqPriceTags: data.reqPriceTags,
        reqPosters: data.reqPosters,
        reqBanners: data.reqBanners,
        printNotes: data.printNotes ?? null,
      }).returning({ id: submissions.id });

      const submissionId = row.id;

      for (let i = 0; i < data.products.length; i++) {
        const p = data.products[i];
        const [productRow] = await tx.insert(submissionProducts).values({
          submissionId,
          pageNumber: p.pageNumber,
          slotIndex: p.slotIndex,
          blockSize: p.blockSize,
          name: p.name,
          brand: p.brand ?? null,
          sku: p.sku ?? null,
          categoryId: p.categoryId ?? null,
          categoryOther: p.categoryOther ?? null,
          description: p.description ?? null,
          imageUrl: p.imageUrl ?? null,
          regularPrice: p.regularPrice?.toString() ?? null,
          salePrice: p.salePrice?.toString() ?? null,
          priceUnit: p.priceUnit ?? null,
          discountPercent: p.discountPercent?.toString() ?? null,
          manualDiscountDescription: p.manualDiscountDescription ?? null,
          isMainFlyerProduct: p.isMainFlyerProduct,
          isBundle: p.isBundle,
          bundleItems: p.bundleItems ?? null,
          requestStockImage: p.requestStockImage,
          includeInSocial: p.includeInSocial,
          sortOrder: i,
        }).returning({ id: submissionProducts.id });

        const productId = productRow.id;

        if (p.colours.length > 0) {
          await tx.insert(submissionProductColours).values(
            p.colours.map((value, idx) => ({ productId, value, sortOrder: idx })),
          );
        }
        if (p.dimensions.length > 0) {
          await tx.insert(submissionProductDimensions).values(
            p.dimensions.map((value, idx) => ({ productId, value, sortOrder: idx })),
          );
        }
      }

      return submissionId;
    });

    // Fire-and-forget notification. Never block the response on it.
    sendNewSubmissionEmail(
      {
        submissionId: insertedId,
        storeName: data.storeName,
        submittedBy: data.submittedBy,
        productCount: data.products.length,
        flyerStartDate: data.flyerStartDate,
        flyerEndDate: data.flyerEndDate,
        theme: data.theme ?? null,
      },
      {
        info: (m) => app.log.info(m),
        warn: (m) => app.log.warn(m),
        error: (m) => app.log.error(m),
      },
    ).catch((err) => app.log.error(`Email task failed: ${err}`));

    return reply.code(201).send({ message: 'Submission successful', submissionId: insertedId });
  });
}
