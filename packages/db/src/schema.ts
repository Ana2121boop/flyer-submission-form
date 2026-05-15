import {
  pgTable,
  serial,
  integer,
  text,
  boolean,
  timestamp,
  date,
  numeric,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const adminUsers = pgTable('admin_users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  usernameIdx: uniqueIndex('admin_users_username_idx').on(t.username),
}));

export const productCategories = pgTable('product_categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  nameIdx: uniqueIndex('product_categories_name_idx').on(t.name),
}));

export const flyerWindows = pgTable('flyer_windows', {
  id: serial('id').primaryKey(),
  label: text('label'),
  flyerStartDate: date('flyer_start_date').notNull(),
  flyerEndDate: date('flyer_end_date').notNull(),
  submissionDeadline: timestamp('submission_deadline', { withTimezone: true }).notNull(),
  flyerSize: text('flyer_size').notNull(),
  pageCount: integer('page_count').notNull(),
  isOpen: boolean('is_open').notNull().default(true),
  createdByAdminId: integer('created_by_admin_id').references(() => adminUsers.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  openDeadlineIdx: index('flyer_windows_open_deadline_idx').on(t.isOpen, t.submissionDeadline),
}));

export const submissions = pgTable('submissions', {
  id: serial('id').primaryKey(),
  flyerWindowId: integer('flyer_window_id').references(() => flyerWindows.id),

  storeName: text('store_name').notNull(),
  submittedBy: text('submitted_by').notNull(),

  theme: text('theme'),
  generalNotes: text('general_notes'),

  printCanadaPost: boolean('print_canada_post').notNull().default(false),
  printDigital: boolean('print_digital').notNull().default(false),
  canadaPostBudget: numeric('canada_post_budget', { precision: 10, scale: 2 }),

  facebookAdsEnabled: boolean('facebook_ads_enabled').notNull().default(false),
  facebookAdsBudget: numeric('facebook_ads_budget', { precision: 10, scale: 2 }),

  postersRequested: integer('posters_requested').notNull().default(0),
  priceCardsRequested: integer('price_cards_requested').notNull().default(0),
  bannerDetails: text('banner_details'),

  reqPriceTags: boolean('req_price_tags').notNull().default(false),
  reqPosters: boolean('req_posters').notNull().default(false),
  reqBanners: boolean('req_banners').notNull().default(false),
  printNotes: text('print_notes'),

  submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),

  legacyFormData: jsonb('legacy_form_data'),
}, (t) => ({
  submittedAtIdx: index('submissions_submitted_at_idx').on(t.submittedAt),
  storeNameIdx: index('submissions_store_name_idx').on(t.storeName),
  deletedAtIdx: index('submissions_deleted_at_idx').on(t.deletedAt),
  flyerWindowIdx: index('submissions_flyer_window_idx').on(t.flyerWindowId),
}));

export const submissionProducts = pgTable('submission_products', {
  id: serial('id').primaryKey(),
  submissionId: integer('submission_id').notNull().references(() => submissions.id, { onDelete: 'cascade' }),

  pageNumber: integer('page_number').notNull(),
  slotIndex: integer('slot_index').notNull(),
  blockSize: integer('block_size').notNull().default(1),

  name: text('name').notNull(),
  brand: text('brand'),
  sku: text('sku'),

  categoryId: integer('category_id').references(() => productCategories.id),
  categoryOther: text('category_other'),

  description: text('description'),
  imageUrl: text('image_url'),

  regularPrice: numeric('regular_price', { precision: 10, scale: 2 }),
  salePrice: numeric('sale_price', { precision: 10, scale: 2 }),
  priceUnit: text('price_unit'),
  discountPercent: numeric('discount_percent', { precision: 5, scale: 2 }),
  manualDiscountDescription: text('manual_discount_description'),

  isMainFlyerProduct: boolean('is_main_flyer_product').notNull().default(false),
  isBundle: boolean('is_bundle').notNull().default(false),
  bundleItems: text('bundle_items'),
  requestStockImage: boolean('request_stock_image').notNull().default(false),
  includeInSocial: boolean('include_in_social').notNull().default(false),

  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  submissionIdx: index('submission_products_submission_idx').on(t.submissionId),
}));

export const submissionProductColours = pgTable('submission_product_colours', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull().references(() => submissionProducts.id, { onDelete: 'cascade' }),
  value: text('value').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const submissionProductDimensions = pgTable('submission_product_dimensions', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull().references(() => submissionProducts.id, { onDelete: 'cascade' }),
  value: text('value').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const submissionsRelations = relations(submissions, ({ one, many }) => ({
  flyerWindow: one(flyerWindows, { fields: [submissions.flyerWindowId], references: [flyerWindows.id] }),
  products: many(submissionProducts),
}));

export const submissionProductsRelations = relations(submissionProducts, ({ one, many }) => ({
  submission: one(submissions, { fields: [submissionProducts.submissionId], references: [submissions.id] }),
  category: one(productCategories, { fields: [submissionProducts.categoryId], references: [productCategories.id] }),
  colours: many(submissionProductColours),
  dimensions: many(submissionProductDimensions),
}));

export const submissionProductColoursRelations = relations(submissionProductColours, ({ one }) => ({
  product: one(submissionProducts, { fields: [submissionProductColours.productId], references: [submissionProducts.id] }),
}));

export const submissionProductDimensionsRelations = relations(submissionProductDimensions, ({ one }) => ({
  product: one(submissionProducts, { fields: [submissionProductDimensions.productId], references: [submissionProducts.id] }),
}));
