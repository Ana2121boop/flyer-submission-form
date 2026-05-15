import { z } from 'zod';

export const FLYER_SIZES = ['standard', '8.5x11'] as const;
export const PRICE_UNITS = ['each', 'sqft', 'lnft', 'lift', 'pack', 'box', 'roll', 'pair'] as const;
export const BLOCK_SIZES = [1, 2, 3] as const;
export const ALLOWED_PAGE_COUNTS = [1, 2, 4, 6, 8] as const;

export const productSchema = z.object({
  pageNumber: z.number().int().min(1),
  slotIndex: z.number().int().min(0),
  blockSize: z.number().int().refine((v) => (BLOCK_SIZES as readonly number[]).includes(v), 'Block size must be 1, 2, or 3'),

  name: z.string().min(1, 'Product name is required').max(200),
  brand: z.string().max(200).optional().nullable(),
  sku: z.string().max(100).optional().nullable(),

  categoryId: z.number().int().optional().nullable(),
  categoryOther: z.string().max(100).optional().nullable(),

  description: z.string().max(2000).optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),

  colours: z.array(z.string().min(1).max(100)).max(20).default([]),
  dimensions: z.array(z.string().min(1).max(100)).max(20).default([]),

  regularPrice: z.number().nonnegative().optional().nullable(),
  salePrice: z.number().nonnegative().optional().nullable(),
  priceUnit: z.enum(PRICE_UNITS).optional().nullable(),
  discountPercent: z.number().min(0).max(100).optional().nullable(),
  manualDiscountDescription: z.string().max(200).optional().nullable(),

  isMainFlyerProduct: z.boolean().default(false),
  isBundle: z.boolean().default(false),
  bundleItems: z.string().max(2000).optional().nullable(),
  requestStockImage: z.boolean().default(false),
  includeInSocial: z.boolean().default(false),
});

export type Product = z.infer<typeof productSchema>;

export const submissionSchema = z.object({
  storeName: z.string().min(1, 'Store name is required').max(200),
  submittedBy: z.string().min(1, 'Submitter name is required').max(200),

  flyerStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  flyerEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  flyerSize: z.enum(FLYER_SIZES),
  pageCount: z.number().int().refine(
    (v) => (ALLOWED_PAGE_COUNTS as readonly number[]).includes(v),
    'Page count must be 1 or an even number up to 8',
  ),

  theme: z.string().max(200).optional().nullable(),
  generalNotes: z.string().max(5000).optional().nullable(),

  printCanadaPost: z.boolean().default(false),
  printDigital: z.boolean().default(false),
  canadaPostBudget: z.number().nonnegative().optional().nullable(),

  facebookAdsEnabled: z.boolean().default(false),
  facebookAdsBudget: z.number().nonnegative().optional().nullable(),

  postersRequested: z.number().int().nonnegative().default(0),
  priceCardsRequested: z.number().int().nonnegative().default(0),
  bannerDetails: z.string().max(2000).optional().nullable(),

  reqPriceTags: z.boolean().default(false),
  reqPosters: z.boolean().default(false),
  reqBanners: z.boolean().default(false),
  printNotes: z.string().max(2000).optional().nullable(),

  products: z.array(productSchema).max(200),
}).refine(
  (s) => !s.facebookAdsEnabled || (s.facebookAdsBudget !== null && s.facebookAdsBudget !== undefined && s.facebookAdsBudget > 0),
  { message: 'Facebook ads budget is required when Facebook ads are enabled', path: ['facebookAdsBudget'] },
).refine(
  (s) => !s.printCanadaPost || (s.canadaPostBudget !== null && s.canadaPostBudget !== undefined && s.canadaPostBudget > 0),
  { message: 'Canada Post budget is required when Canada Post flyer is selected', path: ['canadaPostBudget'] },
).refine(
  (s) => new Date(s.flyerEndDate) >= new Date(s.flyerStartDate),
  { message: 'Flyer end date must be on or after the start date', path: ['flyerEndDate'] },
);

/**
 * Returns the earliest allowed flyer start date (YYYY-MM-DD) given a lead-time
 * in months. 1 = first of next month, 2 = first of month-after-next, etc.
 */
export function earliestFlyerStartDate(advanceMonths: number): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + advanceMonths, 1));
  return d.toISOString().slice(0, 10);
}

export type Submission = z.infer<typeof submissionSchema>;

export const flyerWindowBaseSchema = z.object({
  label: z.string().max(200).optional().nullable(),
  flyerStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  flyerEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  submissionDeadline: z.string().datetime(),
  flyerSize: z.enum(FLYER_SIZES),
  pageCount: z.number().int().refine((v) => (ALLOWED_PAGE_COUNTS as readonly number[]).includes(v), 'Page count must be 1 or an even number up to 8'),
  isOpen: z.boolean().default(true),
});

export const flyerWindowSchema = flyerWindowBaseSchema.refine((w) => {
  const start = new Date(w.flyerStartDate);
  const now = new Date();
  const firstOfNextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return start >= firstOfNextMonth;
}, { message: 'Flyer start date must be the first of next month or later', path: ['flyerStartDate'] }
).refine((w) => new Date(w.flyerEndDate) >= new Date(w.flyerStartDate), {
  message: 'Flyer end date must be on or after the start date',
  path: ['flyerEndDate'],
});

export const flyerWindowPatchSchema = flyerWindowBaseSchema.partial();

export type FlyerWindow = z.infer<typeof flyerWindowSchema>;

export const productCategorySchema = z.object({
  name: z.string().min(1).max(100),
  isActive: z.boolean().default(true),
});

export type ProductCategory = z.infer<typeof productCategorySchema>;

export const loginSchema = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(1).max(200),
});

export const presignedUploadRequestSchema = z.object({
  fileName: z.string().min(1).max(255),
  contentType: z.string().regex(/^image\//, 'Only image uploads are allowed'),
  contentLength: z.number().int().positive().max(10 * 1024 * 1024, 'Max 10 MB before compression'),
});
