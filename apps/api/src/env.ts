import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),

  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  R2_PUBLIC_URL: z.string().url().optional(),

  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // Optional: if both set on first deploy, an admin user is auto-created.
  ADMIN_USERNAME: z.string().min(1).max(100).optional(),
  ADMIN_PASSWORD: z.string().min(8).max(200).optional(),

  // Email notifications via Resend (resend.com). All optional — if any are
  // missing, the app boots but no emails are sent on submit.
  RESEND_API_KEY: z.string().optional(),
  // One address, or several separated by commas.
  ADMIN_NOTIFY_EMAIL: z
    .string()
    .optional()
    .transform((v) => (v ?? '').split(',').map((s) => s.trim()).filter(Boolean))
    .pipe(z.array(z.string().email())),
  FROM_EMAIL: z.string().email().optional().default('onboarding@resend.dev'),
  // Where store owners' replies to their copy go. Unset = no reply address.
  REPLY_TO_EMAIL: z.string().email().optional(),
  // Google Apps Script web app that sends store owners' copies from a Gmail
  // account (apps/api/gmail-sender.gs). A bad value only turns the copies off.
  GMAIL_SCRIPT_URL: z.string().trim().url().startsWith('https://').optional().catch(undefined),

  // Public URL of the deployed app, used to build links inside notification
  // emails. Defaults to localhost for dev.
  PUBLIC_BASE_URL: z.string().url().optional().default('http://localhost:3000'),

  // Path to Chromium binary for Puppeteer PDF generation. Set in the
  // Dockerfile; defaults to the Debian Chromium location.
  PUPPETEER_EXECUTABLE_PATH: z.string().optional().default('/usr/bin/chromium'),

  // How many months ahead the earliest valid flyer start date must be.
  // 1 = first of next month, 2 = first of month-after-next, etc. The colleague's
  // rule says "nothing in the current month" so the minimum is 1.
  FLYER_ADVANCE_MONTHS: z.coerce.number().int().min(1).max(12).default(2),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
