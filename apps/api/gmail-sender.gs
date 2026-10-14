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
  const cells = rows
    .map((r) => '<tr><td style="padding: 4px 8px 4px 0; color: #6b7280; width: 140px;">' + esc_(r[0]) + '</td><td style="padding: 4px 0;">' + esc_(r[1]) + '</td></tr>')
    .join('');
  return '<div style="font-family: \'Helvetica Neue\', Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1f2937;">'
    + '<h2 style="color: #26408F; margin: 0 0 12px;">' + (submittedBy ? 'Thanks, ' + esc_(submittedBy) + '! ' : 'Thanks! ') + 'Your flyer is in.</h2>'
    + '<p style="margin: 0 0 16px;">Head office received your flyer submission.' + (hasPdf ? ' Your full submission is attached as a PDF.' : '') + '</p>'
    + '<table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">' + cells + '</table>'
    + '<p style="margin: 0 0 16px;">Need to change something? ' + (canReply ? 'Just reply to this email.' : 'Get in touch with head office.') + '</p>'
    + '<p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">Sent automatically by the Windsor Plywood flyer submission form.</p>'
    + '</div>';
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
