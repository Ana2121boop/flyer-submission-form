// Windsor Plywood flyer form: sends the form's emails from a Gmail account,
// so they need no verified email domain:
// - head office's alert for each new submission (only to Windsor addresses)
// - each store's copy of its submission, with the PDF attached
//
// Setup, signed in to the Gmail account that sends the emails:
// script.google.com → New project → replace the code with this file → Save →
// Deploy → New deployment → Web app (Execute as: Me, Who has access: Anyone)
// → Deploy → authorize → copy the Web app URL into Railway as GMAIL_SCRIPT_URL.
// After changing this file, deploy a new version of the same deployment
// (Deploy → Manage deployments → edit → Version: New version) so the URL stays.
//
// The form's server posts the details here and this script builds the emails
// itself, so the URL can only ever send these two kinds of email.
// A free Gmail account can email 100 recipients a day.

const SENDER_NAME = 'Windsor Plywood Flyers';
// Head office alerts and store replies may only go to Windsor addresses.
const WINDSOR_DOMAINS = ['windsorplywood.com', 'windsorplywood.ca'];
const MAX_OFFICE_RECIPIENTS = 5;
const MAX_ROWS = 12;
const MAX_TEXT = 300;
// The Windsor look, the same as the form's own emails (apps/api/src/services/email.ts).
const APP_URL = 'https://flyer-submission-form-production.up.railway.app';
const LOGO_URL = APP_URL + '/email/windsor-logo.png';
const BRAND_BLUE = '#26408F';
const BRAND_RED = '#ED1C2B';
const FONT = "Montserrat, 'Helvetica Neue', Arial, sans-serif";

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (MailApp.getRemainingDailyQuota() < 1) return reply_({ ok: false, error: 'Gmail daily limit reached' });
    return reply_(data.kind === 'office' ? sendOfficeAlert_(data) : sendStoreCopy_(data));
  } catch (err) {
    return reply_({ ok: false, error: String((err && err.message) || err) });
  }
}

// Head office's alert for a new submission, with a button to open it.
function sendOfficeAlert_(data) {
  const to = (Array.isArray(data.to) ? data.to : [data.to]).map((a) => String(a || '').trim()).filter(Boolean);
  if (to.length === 0 || to.length > MAX_OFFICE_RECIPIENTS || !to.every(isWindsor_)) {
    return { ok: false, error: 'head office alerts only go to Windsor addresses' };
  }
  const storeName = clip_(data.storeName) || 'A store';
  const id = Number(data.submissionId);
  const button = Number.isInteger(id) && id > 0 ? { label: 'Open submission', href: APP_URL + '/admin/submissions/' + id } : null;

  MailApp.sendEmail(to.join(','), 'New flyer submission: ' + storeName, storeName + ' just sent in its flyer.', {
    name: SENDER_NAME,
    htmlBody: html_({
      kicker: 'New flyer submission',
      title: storeName,
      intro: 'A store just sent in its flyer. Here are the details.',
      rows: rows_(data.rows),
      button: button,
    }),
  });
  return { ok: true, remaining: MailApp.getRemainingDailyQuota() };
}

// The store's copy of its submission, with the PDF attached.
function sendStoreCopy_(data) {
  const to = String(data.to || '').trim();
  if (!isEmail_(to)) return { ok: false, error: 'bad recipient address' };

  const storeName = clip_(data.storeName) || 'your store';
  const submittedBy = clip_(data.submittedBy);
  const replyTo = String(data.replyTo || '').trim();
  const canReply = isWindsor_(replyTo);

  // Attach the submission PDF only if it really is a PDF.
  let pdf = null;
  if (data.pdfBase64) {
    const bytes = Utilities.base64Decode(data.pdfBase64);
    const isPdf = bytes.length > 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46; // %PDF
    if (isPdf) pdf = Utilities.newBlob(bytes, 'application/pdf', 'flyer-submission-' + slug_(storeName) + '.pdf');
  }

  const intro = 'Head office received your flyer submission.' + (pdf ? ' Your full submission is attached as a PDF.' : '');
  const options = {
    name: SENDER_NAME,
    htmlBody: html_({
      kicker: 'Flyer submission received',
      title: (submittedBy ? 'Thanks, ' + submittedBy + '! ' : 'Thanks! ') + 'Your flyer is in.',
      intro: intro,
      rows: rows_(data.rows),
      note: 'Need to change something? ' + (canReply ? 'Just reply to this email.' : 'Get in touch with head office.'),
    }),
  };
  if (canReply) options.replyTo = replyTo;
  if (pdf) options.attachments = [pdf];

  MailApp.sendEmail(to, 'We got your flyer submission: ' + storeName, intro, options);
  return { ok: true, remaining: MailApp.getRemainingDailyQuota() };
}

// p: { kicker, title, intro, rows, button?: { label, href }, note? }, all plain text.
function html_(p) {
  const type = (size, line, weight, color) =>
    'font-family: ' + FONT + '; font-size: ' + size + 'px; line-height: ' + line + 'px; font-weight: ' + weight + '; color: ' + color + ';';
  const cells = p.rows.map((r, i) => {
    const rule = i > 0 ? 'border-top: 1px solid #E3E7EF;' : '';
    return '<tr>'
      + '<td style="' + rule + ' padding: 12px 16px; width: 120px; vertical-align: top; ' + type(11, 18, 700, '#6B7280') + ' letter-spacing: 1px; text-transform: uppercase;">' + esc_(r[0]) + '</td>'
      + '<td style="' + rule + ' padding: 12px 16px; vertical-align: top; ' + type(15, 22, 600, '#111827') + '">' + esc_(r[1]) + '</td>'
      + '</tr>';
  }).join('');
  const button = p.button
    ? '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top: 24px;"><tr><td style="background: ' + BRAND_BLUE + ';">'
      + '<a href="' + esc_(p.button.href) + '" style="display: inline-block; padding: 14px 24px; ' + type(13, 16, 800, '#FFFFFF') + ' letter-spacing: 1px; text-transform: uppercase; text-decoration: none;">' + esc_(p.button.label) + ' &rarr;</a>'
      + '</td></tr></table>'
    : '';
  const note = p.note ? '<p style="margin: 24px 0 0; ' + type(14, 22, 500, '#374151') + '">' + esc_(p.note) + '</p>' : '';

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
    + '<p style="margin: 0 0 8px; ' + type(12, 16, 800, BRAND_RED) + ' letter-spacing: 2px; text-transform: uppercase;">' + esc_(p.kicker) + '</p>'
    + '<h1 style="margin: 0 0 12px; ' + type(26, 32, 800, BRAND_BLUE) + '">' + esc_(p.title) + '</h1>'
    + '<p style="margin: 0 0 24px; ' + type(15, 23, 500, '#374151') + '">' + esc_(p.intro) + '</p>'
    + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #F5F7FB; border-left: 4px solid ' + BRAND_BLUE + ';">' + cells + '</table>'
    + button + note
    + '</td></tr>'
    + '<tr><td style="padding: 0 32px 28px;">'
    + '<p style="margin: 0; padding-top: 16px; border-top: 1px solid #E3E7EF; ' + type(12, 18, 500, '#9CA3AF') + '">Sent automatically by the Windsor Plywood flyer submission form.</p>'
    + '</td></tr>'
    + '</table></td></tr></table></body></html>';
}

function reply_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function isEmail_(a) {
  return /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(a);
}

function isWindsor_(a) {
  return isEmail_(a) && WINDSOR_DOMAINS.some((d) => a.toLowerCase().endsWith('@' + d));
}

function rows_(rows) {
  return (Array.isArray(rows) ? rows : []).slice(0, MAX_ROWS).map((r) => [clip_(r && r[0]), clip_(r && r[1])]);
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
