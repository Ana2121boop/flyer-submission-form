import { Resend } from 'resend';
import { eq } from 'drizzle-orm';
import { getDb, submissions } from '@flyer/db';
import { env } from '../env.js';
import { fmtDate, renderHtmlToPdf, renderSubmissionHtml } from './pdf.js';

let resend: Resend | null = null;
function getResend(): Resend | null {
  if (!env.RESEND_API_KEY) return null;
  if (!resend) resend = new Resend(env.RESEND_API_KEY);
  return resend;
}

const FROM = `Windsor Plywood Flyers <${env.FROM_EMAIL}>`;

type Log = { info: (msg: string) => void; warn: (msg: string) => void; error: (msg: string) => void };

type SubmissionNotification = {
  submissionId: number;
  storeName: string;
  submittedBy: string;
  submitterEmail: string | null;
  productCount: number;
  flyerStartDate: string | null;
  flyerEndDate: string | null;
  flyerSize: string | null;
  pageCount: number | null;
  theme: string | null;
};

// Copies to store owners go out through the Gmail script when it's set up.
// Otherwise they need Resend with FROM_EMAIL on a verified domain: Resend's
// shared test sender (onboarding@resend.dev) only delivers to the Resend
// account's own address.
export function canEmailSubmitters(): boolean {
  if (env.GMAIL_SCRIPT_URL) return true;
  return !!env.RESEND_API_KEY && !env.FROM_EMAIL.toLowerCase().endsWith('@resend.dev');
}

export async function sendNewSubmissionEmail(data: SubmissionNotification, log: Log): Promise<void> {
  const client = getResend();
  if (!client || env.ADMIN_NOTIFY_EMAIL.length === 0) {
    log.info('Email: RESEND_API_KEY or ADMIN_NOTIFY_EMAIL not set; skipping notification');
    return;
  }

  const detailUrl = `${env.PUBLIC_BASE_URL.replace(/\/$/, '')}/admin/submissions/${data.submissionId}`;
  const dateLine = data.flyerStartDate && data.flyerEndDate
    ? `${data.flyerStartDate} → ${data.flyerEndDate}`
    : 'dates not provided';

  const subject = `New flyer submission: ${data.storeName}`;
  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1f2937;">
      <h2 style="color: #26408F; margin: 0 0 12px;">New flyer submission</h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
        <tr><td style="padding: 4px 8px 4px 0; color: #6b7280; width: 140px;">Store</td><td style="padding: 4px 0;"><strong>${escapeHtml(data.storeName)}</strong></td></tr>
        <tr><td style="padding: 4px 8px 4px 0; color: #6b7280;">Submitted by</td><td style="padding: 4px 0;">${escapeHtml(data.submittedBy)}</td></tr>
        ${data.submitterEmail ? `<tr><td style="padding: 4px 8px 4px 0; color: #6b7280;">Email</td><td style="padding: 4px 0;">${escapeHtml(data.submitterEmail)}</td></tr>` : ''}
        <tr><td style="padding: 4px 8px 4px 0; color: #6b7280;">Date range</td><td style="padding: 4px 0;">${escapeHtml(dateLine)}</td></tr>
        ${data.theme ? `<tr><td style="padding: 4px 8px 4px 0; color: #6b7280;">Theme</td><td style="padding: 4px 0;">${escapeHtml(data.theme)}</td></tr>` : ''}
        <tr><td style="padding: 4px 8px 4px 0; color: #6b7280;">Products</td><td style="padding: 4px 0;">${data.productCount}</td></tr>
      </table>
      <a href="${detailUrl}" style="display: inline-block; background: #26408F; color: white; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 600;">
        Open submission →
      </a>
      <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">
        Sent automatically by the Windsor Plywood flyer submission form.
      </p>
    </div>
  `;

  try {
    // Resend returns API errors (bad key, unverified sender or recipient) in
    // `error` rather than throwing, so check it before logging success.
    const { error } = await client.emails.send({
      from: FROM,
      to: env.ADMIN_NOTIFY_EMAIL,
      subject,
      html,
    });
    if (error) {
      log.error(`Email: failed to send notification for submission #${data.submissionId} — ${error.message}`);
      return;
    }
    log.info(`Email: notification sent for submission #${data.submissionId}`);
  } catch (err) {
    log.error(`Email: failed to send notification — ${err instanceof Error ? err.message : 'unknown'}`);
  }
}

// The store's own copy: a short summary, with the full submission attached as a PDF.
export async function sendSubmitterCopyEmail(data: SubmissionNotification, log: Log): Promise<void> {
  if (!data.submitterEmail || !canEmailSubmitters()) return;

  let pdf: Buffer | null = null;
  try {
    pdf = await renderSubmissionPdf(data.submissionId);
  } catch (err) {
    log.warn(`Email: PDF for submission #${data.submissionId} failed, sending the store's copy without it — ${err instanceof Error ? err.message : 'unknown'}`);
  }

  const rows: Array<[string, string]> = [
    ['Store', data.storeName],
    ['Flyer dates', data.flyerStartDate && data.flyerEndDate ? `${fmtDate(data.flyerStartDate)} – ${fmtDate(data.flyerEndDate)}` : 'not set'],
    ['Size', sizeLabel(data.flyerSize)],
    ['Pages', data.pageCount ? String(data.pageCount) : 'not set'],
    ...(data.theme ? [['Theme', data.theme] as [string, string]] : []),
    ['Products', String(data.productCount)],
  ];

  if (env.GMAIL_SCRIPT_URL) {
    await sendViaGmailScript(env.GMAIL_SCRIPT_URL, {
      to: data.submitterEmail,
      storeName: data.storeName,
      submittedBy: data.submittedBy,
      rows,
      replyTo: env.REPLY_TO_EMAIL ?? null,
      pdfBase64: pdf ? pdf.toString('base64') : null,
    }, data.submissionId, log);
    return;
  }

  const client = getResend();
  if (!client) return;

  const subject = `We got your flyer submission: ${data.storeName}`;
  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1f2937;">
      <h2 style="color: #26408F; margin: 0 0 12px;">Thanks, ${escapeHtml(data.submittedBy)}! Your flyer is in.</h2>
      <p style="margin: 0 0 16px;">Head office received your flyer submission.${pdf ? ' Your full submission is attached as a PDF.' : ''}</p>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
        ${rows.map(([label, value]) => `<tr><td style="padding: 4px 8px 4px 0; color: #6b7280; width: 140px;">${label}</td><td style="padding: 4px 0;">${escapeHtml(value)}</td></tr>`).join('')}
      </table>
      <p style="margin: 0 0 16px;">Need to change something? ${env.REPLY_TO_EMAIL ? 'Just reply to this email.' : 'Get in touch with head office.'}</p>
      <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">
        Sent automatically by the Windsor Plywood flyer submission form.
      </p>
    </div>
  `;

  try {
    const { error } = await client.emails.send({
      from: FROM,
      to: data.submitterEmail,
      replyTo: env.REPLY_TO_EMAIL,
      subject,
      html,
      attachments: pdf
        ? [{ filename: `flyer-submission-${slugify(data.storeName)}.pdf`, content: pdf.toString('base64') }]
        : undefined,
    });
    if (error) {
      log.error(`Email: failed to send the store's copy for submission #${data.submissionId} — ${error.message}`);
      return;
    }
    log.info(`Email: store's copy sent for submission #${data.submissionId}`);
  } catch (err) {
    log.error(`Email: failed to send the store's copy — ${err instanceof Error ? err.message : 'unknown'}`);
  }
}

type GmailCopy = {
  to: string;
  storeName: string;
  submittedBy: string;
  rows: Array<[string, string]>;
  replyTo: string | null;
  pdfBase64: string | null;
};

// The Gmail script (apps/api/gmail-sender.gs) builds the email from these
// details and sends it from its Gmail account.
export async function sendViaGmailScript(url: string, copy: GmailCopy, submissionId: number, log: Log): Promise<void> {
  try {
    // Apps Script answers a POST with a redirect to its reply; fetch follows it.
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(copy),
      signal: AbortSignal.timeout(60_000),
    });
    const result = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (!result?.ok) {
      log.error(`Email: failed to send the store's copy for submission #${submissionId} through Gmail — ${result?.error ?? `unexpected reply (HTTP ${res.status})`}`);
      return;
    }
    log.info(`Email: store's copy sent through Gmail for submission #${submissionId}`);
  } catch (err) {
    log.error(`Email: failed to send the store's copy through Gmail — ${err instanceof Error ? err.message : 'unknown'}`);
  }
}

async function renderSubmissionPdf(id: number): Promise<Buffer | null> {
  const submission = await getDb().query.submissions.findFirst({
    where: eq(submissions.id, id),
    with: {
      products: {
        with: { category: true, colours: true, dimensions: true },
        orderBy: (p, { asc }) => [asc(p.pageNumber), asc(p.slotIndex), asc(p.sortOrder)],
      },
    },
  });
  if (!submission) return null;
  return renderHtmlToPdf(renderSubmissionHtml(submission as Parameters<typeof renderSubmissionHtml>[0]));
}

function sizeLabel(size: string | null): string {
  if (size === 'standard') return '10.5" × 11"';
  if (size === '8.5x11') return '8.5" × 11"';
  return size ?? 'not set';
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'submission';
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
