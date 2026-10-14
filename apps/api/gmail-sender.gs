// Windsor Plywood flyer form: sends each store its copy of a submission from
// a Gmail account, so store copies need no verified email domain.
//
// Setup, signed in to the Gmail account that sends the copies:
// script.google.com → New project → replace the code with this file → Save →
// Deploy → New deployment → Web app (Execute as: Me, Who has access: Anyone)
// → Deploy → authorize → copy the Web app URL into Railway as GMAIL_SCRIPT_URL.
// After changing this file, deploy a new version of the same deployment
// (Deploy → Manage deployments → edit → Version: New version) so the URL stays.
//
// The form's server posts the store's details here and this script builds the
// email itself, so the URL can only ever send this one kind of email.
// A free Gmail account can email 100 recipients a day.

const SENDER_NAME = 'Windsor Plywood Flyers';
// Store replies may only go to Windsor addresses.
const REPLY_TO_DOMAINS = ['windsorplywood.com', 'windsorplywood.ca'];
const MAX_ROWS = 12;
const MAX_TEXT = 300;
// The Windsor look, the same as the form's own emails (apps/api/src/services/email.ts).
const LOGO_URL = 'https://flyer-submission-form-production.up.railway.app/email/windsor-logo.png';
const BRAND_BLUE = '#26408F';
const BRAND_RED = '#ED1C2B';
const FONT = "Montserrat, 'Helvetica Neue', Arial, sans-serif";

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    const to = String(data.to || '').trim();
    if (!/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(to)) return reply_({ ok: false, error: 'bad recipient address' });
    if (MailApp.getRemainingDailyQuota() < 1) return reply_({ ok: false, error: 'Gmail daily limit reached' });

    const storeName = clip_(data.storeName) || 'your store';
    const submittedBy = clip_(data.submittedBy);
    const rows = (Array.isArray(data.rows) ? data.rows : [])
      .slice(0, MAX_ROWS)
      .map((r) => [clip_(r && r[0]), clip_(r && r[1])]);
    const replyTo = String(data.replyTo || '').trim();
    const canReply = REPLY_TO_DOMAINS.some((d) => replyTo.toLowerCase().endsWith('@' + d));

    // Attach the submission PDF only if it really is a PDF.
    let pdf = null;
    if (data.pdfBase64) {
      const bytes = Utilities.base64Decode(data.pdfBase64);
      const isPdf = bytes.length > 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46; // %PDF
      if (isPdf) pdf = Utilities.newBlob(bytes, 'application/pdf', 'flyer-submission-' + slug_(storeName) + '.pdf');
    }

    const options = { name: SENDER_NAME, htmlBody: html_(submittedBy, rows, !!pdf, canReply) };
    if (canReply) options.replyTo = replyTo;
    if (pdf) options.attachments = [pdf];

    MailApp.sendEmail(
      to,
      'We got your flyer submission: ' + storeName,
      'Head office received your flyer submission.' + (pdf ? ' Your full submission is attached as a PDF.' : ''),
      options,
    );
    return reply_({ ok: true, remaining: MailApp.getRemainingDailyQuota() });
  } catch (err) {
    return reply_({ ok: false, error: String((err && err.message) || err) });
  }
}

function html_(submittedBy, rows, hasPdf, canReply) {
  const type = (size, line, weight, color) =>
    'font-family: ' + FONT + '; font-size: ' + size + 'px; line-height: ' + line + 'px; font-weight: ' + weight + '; color: ' + color + ';';
  const cells = rows.map((r, i) => {
    const rule = i > 0 ? 'border-top: 1px solid #E3E7EF;' : '';
    return '<tr>'
      + '<td style="' + rule + ' padding: 12px 16px; width: 120px; vertical-align: top; ' + type(11, 18, 700, '#6B7280') + ' letter-spacing: 1px; text-transform: uppercase;">' + esc_(r[0]) + '</td>'
      + '<td style="' + rule + ' padding: 12px 16px; vertical-align: top; ' + type(15, 22, 600, '#111827') + '">' + esc_(r[1]) + '</td>'
      + '</tr>';
  }).join('');
  const title = (submittedBy ? 'Thanks, ' + submittedBy + '! ' : 'Thanks! ') + 'Your flyer is in.';
  const intro = 'Head office received your flyer submission.' + (hasPdf ? ' Your full submission is attached as a PDF.' : '');
  const note = 'Need to change something? ' + (canReply ? 'Just reply to this email.' : 'Get in touch with head office.');

  return '<!doctype html><html lang="en"><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light">'
    + '<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700;800&display=swap" rel="stylesheet">'
    + '</head><body style="margin: 0; padding: 0; background: #EEF1F6;">'
    + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #EEF1F6;"><tr><td align="center" style="padding: 24px 12px;">'
    + '<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width: 100%; max-width: 600px; background: #FFFFFF;">'
    + '<tr><td style="background: ' + BRAND_BLUE + '; padding: 28px 32px;">'
    + '<img src="' + LOGO_URL + '" width="280" alt="Windsor Plywood" style="display: block; width: 280px; max-width: 100%; height: auto; border: 0; ' + type(20, 28, 800, '#FFFFFF') + '">'
    + '</td></tr>'
    + '<tr><td style="background: ' + BRAND_RED + '; height: 4px; line-height: 4px; font-size: 0;">&nbsp;</td></tr>'
    + '<tr><td style="padding: 32px;">'
    + '<p style="margin: 0 0 8px; ' + type(12, 16, 800, BRAND_RED) + ' letter-spacing: 2px; text-transform: uppercase;">Flyer submission received</p>'
    + '<h1 style="margin: 0 0 12px; ' + type(26, 32, 800, BRAND_BLUE) + '">' + esc_(title) + '</h1>'
    + '<p style="margin: 0 0 24px; ' + type(15, 23, 500, '#374151') + '">' + esc_(intro) + '</p>'
    + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #F5F7FB; border-left: 4px solid ' + BRAND_BLUE + ';">' + cells + '</table>'
    + '<p style="margin: 24px 0 0; ' + type(14, 22, 500, '#374151') + '">' + esc_(note) + '</p>'
    + '</td></tr>'
    + '<tr><td style="padding: 0 32px 28px;">'
    + '<p style="margin: 0; padding-top: 16px; border-top: 1px solid #E3E7EF; ' + type(12, 18, 500, '#9CA3AF') + '">Sent automatically by the Windsor Plywood flyer submission form.</p>'
    + '</td></tr>'
    + '</table></td></tr></table></body></html>';
}

function reply_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function clip_(v) {
  return String(v == null ? '' : v).trim().slice(0, MAX_TEXT);
}

function slug_(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'submission';
}

function esc_(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
