import { Resend } from 'resend';
import { env } from '../env.js';

let resend: Resend | null = null;
function getResend(): Resend | null {
  if (!env.RESEND_API_KEY) return null;
  if (!resend) resend = new Resend(env.RESEND_API_KEY);
  return resend;
}

type SubmissionNotification = {
  submissionId: number;
  storeName: string;
  submittedBy: string;
  productCount: number;
  flyerStartDate: string | null;
  flyerEndDate: string | null;
  theme: string | null;
};

export async function sendNewSubmissionEmail(
  data: SubmissionNotification,
  log: { info: (msg: string) => void; warn: (msg: string) => void; error: (msg: string) => void },
): Promise<void> {
  const client = getResend();
  if (!client || !env.ADMIN_NOTIFY_EMAIL) {
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
        <tr><td style="padding: 4px 8px 4px 0; color: #6b7280;">Date range</td><td style="padding: 4px 0;">${escapeHtml(dateLine)}</td></tr>
        ${data.theme ? `<tr><td style="padding: 4px 8px 4px 0; color: #6b7280;">Theme</td><td style="padding: 4px 0;">${escapeHtml(data.theme)}</td></tr>` : ''}
        <tr><td style="padding: 4px 8px 4px 0; color: #6b7280;">Products</td><td style="padding: 4px 0;">${data.productCount}</td></tr>
      </table>
      <a href="${detailUrl}" style="display: inline-block; background: #26408F; color: white; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 600;">
        Open submission →
      </a>
      <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">
        Windsor Plywood flyer submissions. You're getting this because this email is set as ADMIN_NOTIFY_EMAIL.
      </p>
    </div>
  `;

  try {
    await client.emails.send({
      from: env.FROM_EMAIL,
      to: env.ADMIN_NOTIFY_EMAIL,
      subject,
      html,
    });
    log.info(`Email: notification sent for submission #${data.submissionId}`);
  } catch (err) {
    log.error(`Email: failed to send notification — ${err instanceof Error ? err.message : 'unknown'}`);
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
