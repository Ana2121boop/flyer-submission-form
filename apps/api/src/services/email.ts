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

// Head office's alert goes through the Gmail script when it's set up (the
// script only sends it to Windsor addresses), otherwise through Resend.
export async function sendNewSubmissionEmail(data: SubmissionNotification, log: Log): Promise<void> {
  if (env.ADMIN_NOTIFY_EMAIL.length === 0) {
    log.info('Email: ADMIN_NOTIFY_EMAIL not set; skipping notification');
    return;
  }

  if (env.GMAIL_SCRIPT_URL) {
    await sendViaGmailScript(env.GMAIL_SCRIPT_URL, {
      kind: 'office',
      to: env.ADMIN_NOTIFY_EMAIL,
      submissionId: data.submissionId,
      storeName: data.storeName,
      rows: officeRows(data),
    }, `notification for submission #${data.submissionId}`, log);
    return;
  }

  const client = getResend();
  if (!client) {
    log.info('Email: neither GMAIL_SCRIPT_URL nor RESEND_API_KEY is set; skipping notification');
    return;
  }

  const subject = `New flyer submission: ${data.storeName}`;
  const html = headOfficeEmailHtml(data);

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

  if (env.GMAIL_SCRIPT_URL) {
    await sendViaGmailScript(env.GMAIL_SCRIPT_URL, {
      kind: 'store',
      to: data.submitterEmail,
      storeName: data.storeName,
      submittedBy: data.submittedBy,
      rows: detailRows(data),
      replyTo: env.REPLY_TO_EMAIL ?? null,
      pdfBase64: pdf ? pdf.toString('base64') : null,
    }, `store's copy for submission #${data.submissionId}`, log);
    return;
  }

  const client = getResend();
  if (!client) return;

  const subject = `We got your flyer submission: ${data.storeName}`;
  const html = storeCopyEmailHtml(data, !!pdf);

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

type GmailEmail =
  | {
    kind: 'office';
    to: string[];
    submissionId: number;
    storeName: string;
    rows: Array<[string, string]>;
  }
  | {
    kind: 'store';
    to: string;
    storeName: string;
    submittedBy: string;
    rows: Array<[string, string]>;
    replyTo: string | null;
    pdfBase64: string | null;
  };

// The Gmail script (apps/api/gmail-sender.gs) builds the email from these
// details and sends it from its Gmail account. `what` names it in the logs.
export async function sendViaGmailScript(url: string, email: GmailEmail, what: string, log: Log): Promise<void> {
  try {
    // Apps Script answers a POST with a redirect to its reply; fetch follows it.
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(email),
      signal: AbortSignal.timeout(60_000),
    });
    const result = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (!result?.ok) {
      log.error(`Email: failed to send the ${what} through Gmail — ${result?.error ?? `unexpected reply (HTTP ${res.status})`}`);
      return;
    }
    log.info(`Email: ${what} sent through Gmail`);
  } catch (err) {
    log.error(`Email: failed to send the ${what} through Gmail — ${err instanceof Error ? err.message : 'unknown'}`);
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

export function headOfficeEmailHtml(data: SubmissionNotification): string {
  return windsorEmailHtml({
    kicker: 'New flyer submission',
    title: data.storeName,
    intro: 'A store just sent in its flyer. Here are the details.',
    rows: officeRows(data),
    button: { label: 'Open submission', href: `${env.PUBLIC_BASE_URL.replace(/\/$/, '')}/admin/submissions/${data.submissionId}` },
  });
}

function officeRows(data: SubmissionNotification): Array<[string, string]> {
  return [
    ['Submitted by', data.submittedBy],
    ...(data.submitterEmail ? [['Email', data.submitterEmail] as [string, string]] : []),
    ...detailRows(data).filter(([label]) => label !== 'Store'),
  ];
}

export function storeCopyEmailHtml(data: SubmissionNotification, hasPdf: boolean): string {
  return windsorEmailHtml({
    kicker: 'Flyer submission received',
    title: `Thanks, ${data.submittedBy}! Your flyer is in.`,
    intro: `Head office received your flyer submission.${hasPdf ? ' Your full submission is attached as a PDF.' : ''}`,
    rows: detailRows(data),
    note: `Need to change something? ${env.REPLY_TO_EMAIL ? 'Just reply to this email.' : 'Get in touch with head office.'}`,
  });
}

function detailRows(data: SubmissionNotification): Array<[string, string]> {
  return [
    ['Store', data.storeName],
    ['Flyer dates', data.flyerStartDate && data.flyerEndDate ? `${fmtDate(data.flyerStartDate)} – ${fmtDate(data.flyerEndDate)}` : 'not set'],
    ['Size', sizeLabel(data.flyerSize)],
    ['Pages', data.pageCount ? String(data.pageCount) : 'not set'],
    ...(data.theme ? [['Theme', data.theme] as [string, string]] : []),
    ['Products', String(data.productCount)],
  ];
}

// The Windsor look for every email: the logo on a blue band, a red rule, square
// panels. Tables and inline styles, so it holds up in Outlook and Gmail.
// apps/api/gmail-sender.gs builds the same layout for store copies sent by Gmail.
const BRAND_BLUE = '#26408F';
const BRAND_RED = '#ED1C2B';
const FONT = `Montserrat, 'Helvetica Neue', Arial, sans-serif`;

type EmailParts = {
  kicker: string;
  title: string;
  intro: string;
  rows: Array<[string, string]>;
  button?: { label: string; href: string };
  note?: string;
};

// Takes plain text and escapes it all.
function windsorEmailHtml(p: EmailParts): string {
  const logoUrl = `${env.PUBLIC_BASE_URL.replace(/\/$/, '')}/email/windsor-logo.png`;
  const type = (size: number, line: number, weight: number, color: string) =>
    `font-family: ${FONT}; font-size: ${size}px; line-height: ${line}px; font-weight: ${weight}; color: ${color};`;
  const rows = p.rows.map(([label, value], i) => {
    const rule = i > 0 ? 'border-top: 1px solid #E3E7EF;' : '';
    return `<tr>
          <td style="${rule} padding: 12px 16px; width: 120px; vertical-align: top; ${type(11, 18, 700, '#6B7280')} letter-spacing: 1px; text-transform: uppercase;">${escapeHtml(label)}</td>
          <td style="${rule} padding: 12px 16px; vertical-align: top; ${type(15, 22, 600, '#111827')}">${escapeHtml(value)}</td>
        </tr>`;
  }).join('');
  const button = p.button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top: 24px;"><tr><td style="background: ${BRAND_BLUE};">
          <a href="${escapeHtml(p.button.href)}" style="display: inline-block; padding: 14px 24px; ${type(13, 16, 800, '#FFFFFF')} letter-spacing: 1px; text-transform: uppercase; text-decoration: none;">${escapeHtml(p.button.label)} &rarr;</a>
        </td></tr></table>`
    : '';
  const note = p.note ? `<p style="margin: 24px 0 0; ${type(14, 22, 500, '#374151')}">${escapeHtml(p.note)}</p>` : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700;800&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; background: #EEF1F6;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #EEF1F6;"><tr><td align="center" style="padding: 24px 12px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width: 100%; max-width: 600px; background: #FFFFFF;">
      <tr><td style="background: ${BRAND_BLUE}; padding: 28px 32px;">
        <img src="${logoUrl}" width="280" alt="Windsor Plywood" style="display: block; width: 280px; max-width: 100%; height: auto; border: 0; ${type(20, 28, 800, '#FFFFFF')}">
      </td></tr>
      <tr><td style="background: ${BRAND_RED}; height: 4px; line-height: 4px; font-size: 0;">&nbsp;</td></tr>
      <tr><td style="padding: 32px;">
        <p style="margin: 0 0 8px; ${type(12, 16, 800, BRAND_RED)} letter-spacing: 2px; text-transform: uppercase;">${escapeHtml(p.kicker)}</p>
        <h1 style="margin: 0 0 12px; ${type(26, 32, 800, BRAND_BLUE)}">${escapeHtml(p.title)}</h1>
        <p style="margin: 0 0 24px; ${type(15, 23, 500, '#374151')}">${escapeHtml(p.intro)}</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #F5F7FB; border-left: 4px solid ${BRAND_BLUE};">
        ${rows}
        </table>
        ${button}${note}
      </td></tr>
      <tr><td style="padding: 0 32px 28px;">
        <p style="margin: 0; padding-top: 16px; border-top: 1px solid #E3E7EF; ${type(12, 18, 500, '#9CA3AF')}">Sent automatically by the Windsor Plywood flyer submission form.</p>
      </td></tr>
    </table>
  </td></tr></table>
</body>
</html>`;
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
