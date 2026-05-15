import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError, getToken } from '../lib/api';
import AdminShell from '../components/AdminShell';
import Lightbox, { type LightboxItem } from '../components/Lightbox';
import ConfirmDialog from '../components/ConfirmDialog';

type AdminProduct = {
  id: number;
  pageNumber: number;
  blockSize: number;
  name: string;
  brand: string | null;
  sku: string | null;
  imageUrl: string | null;
  category: { id: number; name: string } | null;
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

type AdminSubmission = {
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
  submittedAt: string;
  deletedAt: string | null;
  products: AdminProduct[];
};

export default function AdminSubmissionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: submission, isLoading, error } = useQuery({
    queryKey: ['admin', 'submission', id],
    queryFn: () => api<AdminSubmission>(`/api/admin/submission/${id}`, { auth: true }),
    enabled: !!id,
  });

  useEffect(() => {
    if (error instanceof ApiError && error.status === 401) {
      navigate('/admin/login', { replace: true });
    }
  }, [error, navigate]);

  const softDelete = useMutation({
    mutationFn: () => api(`/api/admin/submission/${id}`, { method: 'DELETE', auth: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['submissions'] });
      navigate('/admin');
    },
  });

  const restore = useMutation({
    mutationFn: () => api(`/api/admin/submission/${id}/restore`, { method: 'POST', auth: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'submission', id] });
      qc.invalidateQueries({ queryKey: ['submissions'] });
    },
  });

  const hardDelete = useMutation({
    mutationFn: () => api(`/api/admin/submission/${id}/permanent`, { method: 'DELETE', auth: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['submissions'] });
      navigate('/admin');
    },
  });

  const [pdfPending, setPdfPending] = useState(false);
  const [zipPending, setZipPending] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [confirmAction, setConfirmAction] = useState<'trash' | 'permanent' | null>(null);

  async function downloadFile(path: string, filename: string, setBusy: (b: boolean) => void) {
    setBusy(true);
    setDownloadError(null);
    try {
      const res = await fetch(path, {
        headers: { Authorization: `Bearer ${getToken() ?? ''}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setDownloadError(e instanceof Error ? e.message : 'Download failed');
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) return <AdminShell title="Loading…"><p className="text-slate-500">Loading…</p></AdminShell>;
  if (!submission) return (
    <AdminShell title="Not found">
      <p className="text-slate-500">Submission not found.</p>
      <Link to="/admin" className="text-brand-blue underline">Back to list</Link>
    </AdminShell>
  );

  const productsByPage = groupBy(submission.products, (p) => p.pageNumber);
  const sortedPages = Array.from(productsByPage.keys()).sort((a, b) => a - b);

  return (
    <AdminShell title={`${submission.storeName} · #${submission.id}`}>
      <Link to="/admin" className="text-sm text-brand-blue hover:underline inline-flex items-center gap-1 mb-4">
        ← Back to all submissions
      </Link>

      {submission.deletedAt && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex items-center justify-between">
          <span className="text-amber-900 text-sm">
            This submission is in the trash (deleted {new Date(submission.deletedAt).toLocaleString()}).
          </span>
          <button
            type="button"
            onClick={() => restore.mutate()}
            disabled={restore.isPending}
            className="text-sm bg-white border border-amber-300 px-3 py-1.5 rounded-lg hover:bg-amber-100"
          >
            Restore
          </button>
        </div>
      )}

      {/* Section 1: Store & flyer info */}
      <DetailCard title="Store">
        <Row label="Store">{submission.storeName}</Row>
        <Row label="Submitted by">{submission.submittedBy}</Row>
        <Row label="Theme">{submission.theme ?? <em className="text-slate-400">none</em>}</Row>
        <Row label="Submitted at">{new Date(submission.submittedAt).toLocaleString()}</Row>
      </DetailCard>

      <DetailCard title="Flyer details">
        <Row label="Date range">
          {submission.flyerStartDate && submission.flyerEndDate
            ? `${formatDate(submission.flyerStartDate)} – ${formatDate(submission.flyerEndDate)}`
            : <em className="text-slate-400">not set</em>}
        </Row>
        <Row label="Size">{submission.flyerSize ?? <em className="text-slate-400">not set</em>}</Row>
        <Row label="Pages">{submission.pageCount ?? <em className="text-slate-400">not set</em>}</Row>
      </DetailCard>

      <DetailCard title="Marketing channels">
        <Row label="Canada Post">
          {submission.printCanadaPost ? (
            <span>Yes{submission.canadaPostBudget && ` · $${submission.canadaPostBudget} budget`}</span>
          ) : <em className="text-slate-400">no</em>}
        </Row>
        <Row label="Digital / in-store">{submission.printDigital ? 'Yes' : <em className="text-slate-400">no</em>}</Row>
        <Row label="Facebook ads">
          {submission.facebookAdsEnabled ? (
            <span>Yes{submission.facebookAdsBudget && ` · $${submission.facebookAdsBudget} budget`}</span>
          ) : <em className="text-slate-400">no</em>}
        </Row>
        <Row label="Posters needed">{submission.postersRequested || <em className="text-slate-400">0</em>}</Row>
        <Row label="Price-card sets">{submission.priceCardsRequested || <em className="text-slate-400">0</em>}</Row>
        <Row label="Banner details">
          {submission.bannerDetails || <em className="text-slate-400">none</em>}
        </Row>
      </DetailCard>

      {/* Products */}
      <div className="mb-4">
        <h2 className="text-lg font-bold mb-2">Products ({submission.products.length})</h2>
        {submission.products.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-500">
            No products in this submission.
          </div>
        ) : (
          sortedPages.map((pageNum) => (
            <div key={pageNum} className="mb-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Page {pageNum}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {productsByPage.get(pageNum)!.map((p) => (
                  <ProductTile
                    key={p.id}
                    product={p}
                    onOpenImage={() => {
                      const photoProducts = submission.products.filter((q) => q.imageUrl);
                      const idx = photoProducts.findIndex((q) => q.id === p.id);
                      if (idx >= 0) setLightboxIndex(idx);
                    }}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Notes */}
      {(submission.generalNotes || submission.printNotes) && (
        <DetailCard title="Notes">
          {submission.generalNotes && (
            <div className="mb-3">
              <div className="text-xs font-medium text-slate-500 mb-1">General notes</div>
              <p className="whitespace-pre-wrap text-sm">{submission.generalNotes}</p>
            </div>
          )}
          {submission.printNotes && (
            <div>
              <div className="text-xs font-medium text-slate-500 mb-1">Print / production notes</div>
              <p className="whitespace-pre-wrap text-sm">{submission.printNotes}</p>
            </div>
          )}
        </DetailCard>
      )}

      {/* Actions */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mt-6">
        <h3 className="font-semibold mb-3">Actions</h3>
        <div className="flex flex-wrap gap-2">
          {!submission.deletedAt && (
            <button
              type="button"
              onClick={() => setConfirmAction('trash')}
              className="px-4 py-2 border border-slate-200 text-brand-red rounded-lg hover:border-brand-red"
            >
              Move to trash
            </button>
          )}
          {submission.deletedAt && (
            <button
              type="button"
              onClick={() => restore.mutate()}
              className="px-4 py-2 border border-slate-200 text-brand-blue rounded-lg hover:border-brand-blue"
            >
              Restore from trash
            </button>
          )}
          <button
            type="button"
            onClick={() => setConfirmAction('permanent')}
            className="px-4 py-2 border border-red-300 bg-red-50 text-brand-red rounded-lg hover:bg-red-100"
          >
            Delete permanently
          </button>
          <button
            type="button"
            onClick={() => downloadFile(`/api/admin/submission/${id}/pdf`, `flyer-${id}.pdf`, setPdfPending)}
            disabled={pdfPending}
            className="px-4 py-2 border border-brand-blue text-brand-blue rounded-lg hover:bg-brand-blue hover:text-white disabled:opacity-50"
          >
            {pdfPending ? 'Generating PDF…' : 'Download PDF'}
          </button>
          <button
            type="button"
            onClick={() => downloadFile(`/api/admin/submission/${id}/export`, `flyer-${id}-designer-pack.zip`, setZipPending)}
            disabled={zipPending}
            className="px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue-dark disabled:opacity-50"
          >
            {zipPending ? 'Building pack…' : 'Designer pack (PDF + photos)'}
          </button>
        </div>
        {downloadError && <p className="text-brand-red text-sm mt-2">{downloadError}</p>}
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          items={submission.products
            .filter((p) => p.imageUrl)
            .map<LightboxItem>((p) => ({ url: p.imageUrl!, caption: `${p.name} · Page ${p.pageNumber}` }))}
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      <ConfirmDialog
        open={confirmAction === 'trash'}
        title="Move to trash?"
        description={`This submission from ${submission.storeName} will be moved to the trash.\nYou can restore it later from the "Show trash" filter on the submissions list.`}
        confirmLabel="Move to trash"
        confirmVariant="warning"
        pending={softDelete.isPending}
        onConfirm={() => { softDelete.mutate(); setConfirmAction(null); }}
        onCancel={() => setConfirmAction(null)}
      />

      <ConfirmDialog
        open={confirmAction === 'permanent'}
        title="Delete permanently?"
        description={`This will permanently delete ${submission.storeName}'s submission and all its product data. Photos in storage stay.\n\nThis cannot be undone.`}
        confirmLabel="Delete permanently"
        confirmVariant="danger"
        pending={hardDelete.isPending}
        onConfirm={() => { hardDelete.mutate(); setConfirmAction(null); }}
        onCancel={() => setConfirmAction(null)}
      />
    </AdminShell>
  );
}

function DetailCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 mb-3">
      <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide mb-3">{title}</h2>
      <dl className="space-y-2">{children}</dl>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:gap-3">
      <dt className="text-sm font-medium text-slate-500 sm:w-40 sm:shrink-0">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

function ProductTile({ product, onOpenImage }: { product: AdminProduct; onOpenImage: () => void }) {
  const categoryName = product.category?.name ?? product.categoryOther ?? null;
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3">
      <div className="flex gap-3">
        {product.imageUrl ? (
          <button
            type="button"
            onClick={onOpenImage}
            aria-label="Open full-size photo"
            className="shrink-0 group"
          >
            <img
              src={product.imageUrl}
              alt=""
              className="w-20 h-20 object-cover rounded border border-slate-200 group-hover:border-brand-blue cursor-zoom-in transition-colors"
            />
          </button>
        ) : (
          <div className="w-20 h-20 rounded border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-xs shrink-0">
            {product.requestStockImage ? 'stock' : 'no img'}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-semibold">{product.name}</div>
          {(product.brand || product.sku) && (
            <div className="text-xs text-slate-500">
              {[product.brand, product.sku].filter(Boolean).join(' · ')}
            </div>
          )}
          {categoryName && (
            <div className="text-xs text-slate-600 mt-1">{categoryName}</div>
          )}
          {product.blockSize > 1 && (
            <div className="text-xs text-brand-blue font-medium mt-1">Emphasized ({product.blockSize}× space)</div>
          )}
        </div>
      </div>

      {(product.colours.length > 0 || product.dimensions.length > 0) && (
        <div className="mt-2 space-y-1">
          {product.colours.length > 0 && (
            <div className="flex flex-wrap gap-1">
              <span className="text-xs text-slate-500 mr-1">Colours:</span>
              {product.colours.map((c, i) => (
                <span key={i} className="text-xs bg-slate-100 px-2 py-0.5 rounded-full">{c.value}</span>
              ))}
            </div>
          )}
          {product.dimensions.length > 0 && (
            <div className="flex flex-wrap gap-1">
              <span className="text-xs text-slate-500 mr-1">Sizes:</span>
              {product.dimensions.map((d, i) => (
                <span key={i} className="text-xs bg-slate-100 px-2 py-0.5 rounded-full">{d.value}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {(product.regularPrice || product.salePrice || product.manualDiscountDescription) && (
        <div className="mt-2 text-sm">
          {product.regularPrice && <span className={product.salePrice ? 'line-through text-slate-400 mr-2' : ''}>${product.regularPrice}</span>}
          {product.salePrice && <span className="font-semibold text-brand-red">${product.salePrice}</span>}
          {product.priceUnit && <span className="text-xs text-slate-500 ml-1">/ {product.priceUnit}</span>}
          {product.discountPercent && <span className="text-xs text-brand-red ml-2">{product.discountPercent}% off</span>}
          {product.manualDiscountDescription && <div className="text-xs text-slate-600 mt-1">{product.manualDiscountDescription}</div>}
        </div>
      )}

      {product.isBundle && product.bundleItems && (
        <div className="mt-2 text-xs text-slate-600">
          <span className="font-medium">Bundle:</span> {product.bundleItems}
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-1.5">
        {product.isMainFlyerProduct && <Pill>Main flyer</Pill>}
        {product.includeInSocial && <Pill>Social media</Pill>}
        {product.requestStockImage && <Pill>Stock image requested</Pill>}
      </div>

      {product.description && (
        <p className="mt-2 text-xs text-slate-600 whitespace-pre-wrap">{product.description}</p>
      )}
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="text-xs bg-brand-blue/10 text-brand-blue px-2 py-0.5 rounded-full">{children}</span>;
}

function formatDate(d: string): string {
  try {
    return new Date(d + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return d;
  }
}

function groupBy<T, K>(arr: T[], key: (item: T) => K): Map<K, T[]> {
  const out = new Map<K, T[]>();
  for (const item of arr) {
    const k = key(item);
    if (!out.has(k)) out.set(k, []);
    out.get(k)!.push(item);
  }
  return out;
}
