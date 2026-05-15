import bcrypt from 'bcrypt';
import { getDb, getPool, adminUsers } from '@flyer/db';
import { env } from './env.js';

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS admin_users_username_idx ON admin_users(username);

CREATE TABLE IF NOT EXISTS product_categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS product_categories_name_idx ON product_categories(name);

CREATE TABLE IF NOT EXISTS flyer_windows (
  id SERIAL PRIMARY KEY,
  label TEXT,
  flyer_start_date DATE NOT NULL,
  flyer_end_date DATE NOT NULL,
  submission_deadline TIMESTAMPTZ NOT NULL,
  flyer_size TEXT NOT NULL,
  page_count INTEGER NOT NULL,
  is_open BOOLEAN NOT NULL DEFAULT true,
  created_by_admin_id INTEGER REFERENCES admin_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS flyer_windows_open_deadline_idx ON flyer_windows(is_open, submission_deadline);

CREATE TABLE IF NOT EXISTS submissions (
  id SERIAL PRIMARY KEY,
  flyer_window_id INTEGER REFERENCES flyer_windows(id),
  store_name TEXT NOT NULL,
  submitted_by TEXT NOT NULL,
  flyer_start_date DATE,
  flyer_end_date DATE,
  flyer_size TEXT,
  page_count INTEGER,
  theme TEXT,
  general_notes TEXT,
  print_canada_post BOOLEAN NOT NULL DEFAULT false,
  print_digital BOOLEAN NOT NULL DEFAULT false,
  canada_post_budget NUMERIC(10, 2),
  facebook_ads_enabled BOOLEAN NOT NULL DEFAULT false,
  facebook_ads_budget NUMERIC(10, 2),
  posters_requested INTEGER NOT NULL DEFAULT 0,
  price_cards_requested INTEGER NOT NULL DEFAULT 0,
  banner_details TEXT,
  req_price_tags BOOLEAN NOT NULL DEFAULT false,
  req_posters BOOLEAN NOT NULL DEFAULT false,
  req_banners BOOLEAN NOT NULL DEFAULT false,
  print_notes TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  legacy_form_data JSONB
);
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS flyer_start_date DATE;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS flyer_end_date DATE;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS flyer_size TEXT;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS page_count INTEGER;
CREATE INDEX IF NOT EXISTS submissions_submitted_at_idx ON submissions(submitted_at);
CREATE INDEX IF NOT EXISTS submissions_store_name_idx ON submissions(store_name);
CREATE INDEX IF NOT EXISTS submissions_deleted_at_idx ON submissions(deleted_at);
CREATE INDEX IF NOT EXISTS submissions_flyer_window_idx ON submissions(flyer_window_id);

CREATE TABLE IF NOT EXISTS submission_products (
  id SERIAL PRIMARY KEY,
  submission_id INTEGER NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  slot_index INTEGER NOT NULL,
  block_size INTEGER NOT NULL DEFAULT 1,
  name TEXT NOT NULL,
  brand TEXT,
  sku TEXT,
  category_id INTEGER REFERENCES product_categories(id),
  category_other TEXT,
  description TEXT,
  image_url TEXT,
  regular_price NUMERIC(10, 2),
  sale_price NUMERIC(10, 2),
  price_unit TEXT,
  discount_percent NUMERIC(5, 2),
  manual_discount_description TEXT,
  is_main_flyer_product BOOLEAN NOT NULL DEFAULT false,
  is_bundle BOOLEAN NOT NULL DEFAULT false,
  bundle_items TEXT,
  request_stock_image BOOLEAN NOT NULL DEFAULT false,
  include_in_social BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS submission_products_submission_idx ON submission_products(submission_id);

CREATE TABLE IF NOT EXISTS submission_product_colours (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES submission_products(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS submission_product_dimensions (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES submission_products(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);
`;

export async function bootstrap(log: { info: (msg: string) => void; warn: (msg: string) => void }) {
  log.info('Bootstrap: ensuring database schema...');
  const pool = getPool();
  await pool.query(SCHEMA_SQL);
  log.info('Bootstrap: schema ready');

  if (env.ADMIN_USERNAME && env.ADMIN_PASSWORD) {
    const db = getDb();
    const [existing] = await db.select().from(adminUsers).limit(1);
    if (!existing) {
      const hash = await bcrypt.hash(env.ADMIN_PASSWORD, 12);
      await db.insert(adminUsers).values({
        username: env.ADMIN_USERNAME,
        passwordHash: hash,
      });
      log.info(`Bootstrap: created initial admin user "${env.ADMIN_USERNAME}"`);
    } else {
      log.info('Bootstrap: admin user already exists, skipping seed');
    }
  } else {
    log.warn('Bootstrap: ADMIN_USERNAME / ADMIN_PASSWORD not set, no admin will be auto-created');
  }
}
