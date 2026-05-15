import puppeteer, { type Browser } from 'puppeteer-core';
import { env } from '../env.js';

let browserPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      executablePath: env.PUPPETEER_EXECUTABLE_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
  }
  return browserPromise;
}

export async function renderHtmlToPdf(html: string): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30_000 });
    const buf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '14mm', right: '12mm', bottom: '14mm', left: '12mm' },
    });
    return Buffer.from(buf);
  } finally {
    await page.close();
  }
}

type ProductRow = {
  pageNumber: number;
  blockSize: number;
  name: string;
  brand: string | null;
  sku: string | null;
  imageUrl: string | null;
  category: { name: string } | null;
  categoryOther: string | null;
  description: string | null;
  regularPrice: string | null;
  salePrice: string | null;
  priceUnit: string | null;
  discountPercent: string | null;
  manualDiscountDescription: string | null;
  isMainFlyerProduct: boolean;
  isBundle: boolean;
  bundleItems: string | null;
  requestStockImage: boolean;
  includeInSocial: boolean;
  colours: Array<{ value: string }>;
  dimensions: Array<{ value: string }>;
};

type SubmissionData = {
  id: number;
  storeName: string;
  submittedBy: string;
  flyerStartDate: string | null;
  flyerEndDate: string | null;
  flyerSize: string | null;
  pageCount: number | null;
  theme: string | null;
  generalNotes: string | null;
  printCanadaPost: boolean;
  printDigital: boolean;
  canadaPostBudget: string | null;
  facebookAdsEnabled: boolean;
  facebookAdsBudget: string | null;
  postersRequested: number;
  priceCardsRequested: number;
  bannerDetails: string | null;
  printNotes: string | null;
  submittedAt: string | Date;
  products: ProductRow[];
};

const esc = (s: string | number | null | undefined): string => {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
};

const fmtDate = (d: string | null): string => {
  if (!d) return '—';
  try { return new Date(d + 'T00:00:00').toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch { return d; }
};

function productCard(p: ProductRow): string {
  const categoryName = p.category?.name ?? p.categoryOther ?? null;
  const priceLine = (p.regularPrice || p.salePrice) ? `
    <div class="price">
      ${p.regularPrice ? `<span class="${p.salePrice ? 'strike' : ''}">$${esc(p.regularPrice)}</span>` : ''}
      ${p.salePrice ? `<span class="sale">$${esc(p.salePrice)}</span>` : ''}
      ${p.priceUnit ? `<span class="unit">/ ${esc(p.priceUnit)}</span>` : ''}
      ${p.discountPercent ? `<span class="discount">${esc(p.discountPercent)}% off</span>` : ''}
    </div>
    ${p.manualDiscountDescription ? `<div class="manual-discount">${esc(p.manualDiscountDescription)}</div>` : ''}
  ` : '';

  const tags = [
    p.isMainFlyerProduct ? 'Main flyer' : null,
    p.includeInSocial ? 'Social' : null,
    p.requestStockImage ? 'Stock image needed' : null,
    p.blockSize > 1 ? `Emphasized (${p.blockSize}×)` : null,
  ].filter(Boolean);

  return `
    <div class="product">
      <div class="product-top">
        ${p.imageUrl
          ? `<img src="${esc(p.imageUrl)}" alt="" class="thumb" />`
          : `<div class="thumb placeholder">${p.requestStockImage ? 'STOCK' : 'no img'}</div>`}
        <div class="product-info">
          <div class="product-name">${esc(p.name)}</div>
          ${(p.brand || p.sku) ? `<div class="meta">${esc([p.brand, p.sku].filter(Boolean).join(' · '))}</div>` : ''}
          ${categoryName ? `<div class="meta">${esc(categoryName)}</div>` : ''}
          ${tags.length ? `<div class="tags">${tags.map((t) => `<span class="tag">${esc(t!)}</span>`).join('')}</div>` : ''}
        </div>
      </div>
      ${p.colours.length ? `<div class="chip-row"><strong>Colours:</strong> ${p.colours.map((c) => `<span class="chip">${esc(c.value)}</span>`).join('')}</div>` : ''}
      ${p.dimensions.length ? `<div class="chip-row"><strong>Sizes:</strong> ${p.dimensions.map((d) => `<span class="chip">${esc(d.value)}</span>`).join('')}</div>` : ''}
      ${priceLine}
      ${p.isBundle && p.bundleItems ? `<div class="bundle"><strong>Bundle:</strong> ${esc(p.bundleItems)}</div>` : ''}
      ${p.description ? `<div class="description">${esc(p.description)}</div>` : ''}
    </div>
  `;
}

export function renderSubmissionHtml(s: SubmissionData): string {
  const productsByPage = new Map<number, ProductRow[]>();
  for (const p of s.products) {
    if (!productsByPage.has(p.pageNumber)) productsByPage.set(p.pageNumber, []);
    productsByPage.get(p.pageNumber)!.push(p);
  }
  const sortedPages = Array.from(productsByPage.keys()).sort((a, b) => a - b);

  const channels = [
    s.printCanadaPost ? `Canada Post${s.canadaPostBudget ? ` ($${esc(s.canadaPostBudget)} budget)` : ''}` : null,
    s.printDigital ? 'Digital / in-store' : null,
    s.facebookAdsEnabled ? `Facebook ads${s.facebookAdsBudget ? ` ($${esc(s.facebookAdsBudget)} budget)` : ''}` : null,
  ].filter(Boolean);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Flyer Submission #${esc(s.id)} — ${esc(s.storeName)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 0; color: #1f2937; font-size: 11pt; line-height: 1.4; }
  h1 { font-size: 22pt; margin: 0 0 4px; color: #26408F; }
  h2 { font-size: 13pt; margin: 16px 0 8px; color: #26408F; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
  h3 { font-size: 11pt; margin: 12px 0 6px; color: #374151; font-weight: 700; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
  .meta-row { color: #6b7280; font-size: 10pt; margin-top: 2px; }
  .row { display: flex; gap: 12px; margin-bottom: 4px; }
  .row dt { font-weight: 600; color: #6b7280; width: 130px; flex-shrink: 0; }
  .row dd { margin: 0; flex: 1; }
  .product { border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px; margin-bottom: 8px; page-break-inside: avoid; }
  .product-top { display: flex; gap: 10px; }
  .thumb { width: 70px; height: 70px; object-fit: cover; border-radius: 6px; border: 1px solid #e5e7eb; }
  .thumb.placeholder { display: flex; align-items: center; justify-content: center; color: #9ca3af; font-size: 9pt; background: #f3f4f6; }
  .product-info { flex: 1; min-width: 0; }
  .product-name { font-weight: 700; font-size: 11pt; }
  .meta { color: #6b7280; font-size: 9pt; margin-top: 1px; }
  .tags { margin-top: 4px; }
  .tag { display: inline-block; background: #eef2ff; color: #26408F; padding: 1px 6px; border-radius: 99px; font-size: 8pt; margin-right: 3px; }
  .chip-row { font-size: 9pt; margin-top: 4px; color: #4b5563; }
  .chip { display: inline-block; background: #f3f4f6; padding: 1px 6px; border-radius: 99px; font-size: 9pt; margin-right: 3px; }
  .price { margin-top: 4px; font-size: 10pt; }
  .price .strike { text-decoration: line-through; color: #9ca3af; margin-right: 6px; }
  .price .sale { font-weight: 700; color: #ED1C2B; }
  .price .unit { color: #6b7280; font-size: 9pt; margin-left: 2px; }
  .price .discount { color: #ED1C2B; font-size: 9pt; margin-left: 6px; }
  .manual-discount { font-size: 9pt; color: #6b7280; margin-top: 2px; }
  .bundle, .description { font-size: 9pt; margin-top: 4px; color: #4b5563; }
  .notes { white-space: pre-wrap; font-size: 10pt; }
  .footer { margin-top: 20px; padding-top: 8px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 8pt; text-align: center; }
  .page-section { page-break-inside: avoid; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <h1>${esc(s.storeName)}</h1>
      <div class="meta-row">Submission #${esc(s.id)} · ${esc(s.submittedBy)}</div>
      ${s.theme ? `<div class="meta-row"><strong>Theme:</strong> ${esc(s.theme)}</div>` : ''}
    </div>
    <div class="meta-row" style="text-align: right;">
      Submitted ${esc(new Date(s.submittedAt).toLocaleString('en-CA'))}
    </div>
  </div>

  <h2>Flyer details</h2>
  <div class="row"><dt>Date range</dt><dd>${esc(fmtDate(s.flyerStartDate))} – ${esc(fmtDate(s.flyerEndDate))}</dd></div>
  <div class="row"><dt>Size</dt><dd>${esc(s.flyerSize ?? '—')}</dd></div>
  <div class="row"><dt>Pages</dt><dd>${esc(s.pageCount ?? '—')}</dd></div>

  <h2>Marketing</h2>
  <div class="row"><dt>Channels</dt><dd>${channels.length ? channels.map(esc).join(', ') : '—'}</dd></div>
  <div class="row"><dt>Posters</dt><dd>${esc(s.postersRequested || 0)}</dd></div>
  <div class="row"><dt>Price-card sets</dt><dd>${esc(s.priceCardsRequested || 0)}</dd></div>
  ${s.bannerDetails ? `<div class="row"><dt>Banner details</dt><dd>${esc(s.bannerDetails)}</dd></div>` : ''}

  <h2>Products (${s.products.length})</h2>
  ${sortedPages.length === 0 ? '<p style="color:#9ca3af">No products in this submission.</p>' : ''}
  ${sortedPages.map((pageNum) => `
    <div class="page-section">
      <h3>Page ${pageNum}</h3>
      ${productsByPage.get(pageNum)!.map(productCard).join('')}
    </div>
  `).join('')}

  ${(s.generalNotes || s.printNotes) ? '<h2>Notes</h2>' : ''}
  ${s.generalNotes ? `<h3>General</h3><div class="notes">${esc(s.generalNotes)}</div>` : ''}
  ${s.printNotes ? `<h3>Print / production</h3><div class="notes">${esc(s.printNotes)}</div>` : ''}

  <div class="footer">Windsor Plywood · Flyer Submission · generated ${esc(new Date().toLocaleString('en-CA'))}</div>
</body>
</html>`;
}
