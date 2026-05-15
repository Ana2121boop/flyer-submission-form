import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { uploadImage } from '../lib/upload';

export type Product = {
  pageNumber: number;
  slotIndex: number;
  blockSize: number;
  name: string;
  brand?: string;
  sku?: string;
  categoryId?: number | null;
  categoryOther?: string;
  description?: string;
  imageUrl?: string;
  colours: string[];
  dimensions: string[];
  regularPrice?: number;
  salePrice?: number;
  priceUnit?: string;
  discountPercent?: number;
  manualDiscountDescription?: string;
  isMainFlyerProduct: boolean;
  isBundle: boolean;
  bundleItems?: string;
  requestStockImage: boolean;
  includeInSocial: boolean;
};

type Category = { id: number; name: string };

const PAGE_1_SLOTS = 8;
const DEFAULT_PAGE_SLOTS = 16;

const PRICE_UNITS: Array<{ value: string; label: string }> = [
  { value: 'each', label: 'each' },
  { value: 'pack', label: 'pack' },
  { value: 'box', label: 'box' },
  { value: 'pair', label: 'pair' },
  { value: 'sqft', label: 'sq ft' },
  { value: 'lnft', label: 'ln ft' },
  { value: 'lift', label: 'lift' },
  { value: 'roll', label: 'roll' },
];

export function emptyProduct(pageNumber: number, slotIndex: number): Product {
  return {
    pageNumber,
    slotIndex,
    blockSize: 1,
    name: '',
    colours: [],
    dimensions: [],
    isMainFlyerProduct: false,
    isBundle: false,
    requestStockImage: false,
    includeInSocial: false,
  };
}

function computeMinBlockSize(p: Product): number {
  const maxOptions = Math.max(p.colours.length, p.dimensions.length);
  if (maxOptions > 5) return 3;
  if (maxOptions > 2) return 2;
  return 1;
}

function slotsForPage(pageNumber: number): number {
  return pageNumber === 1 ? PAGE_1_SLOTS : DEFAULT_PAGE_SLOTS;
}

export default function ProductsSection({
  products,
  totalPages,
  onChange,
}: {
  products: Product[];
  totalPages: number;
  onChange: (next: Product[]) => void;
}) {
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api<Category[]>('/api/categories'),
  });

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  function addProduct(pageNumber: number) {
    const onPage = products.filter((p) => p.pageNumber === pageNumber);
    onChange([...products, emptyProduct(pageNumber, onPage.length)]);
  }

  function updateAt(idx: number, next: Product) {
    onChange(products.map((p, i) => (i === idx ? next : p)));
  }

  function removeAt(idx: number) {
    onChange(products.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-4">
      {pages.map((pageNum) => {
        const onPage = products
          .map((p, idx) => ({ p, idx }))
          .filter(({ p }) => p.pageNumber === pageNum);
        const slotsUsed = onPage.reduce((sum, { p }) => sum + p.blockSize, 0);
        const slotsAvailable = slotsForPage(pageNum);
        const overCapacity = slotsUsed > slotsAvailable;

        return (
          <div key={pageNum} className="border border-slate-200 rounded-lg p-3 bg-slate-50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Page {pageNum}</h3>
              <span className={
                'text-xs ' + (overCapacity ? 'text-brand-red font-medium' : 'text-slate-500')
              }>
                {slotsUsed} of {slotsAvailable} slots
              </span>
            </div>

            <div className="space-y-2">
              {onPage.map(({ p, idx }) => (
                <ProductCard
                  key={idx}
                  product={p}
                  categories={categories ?? []}
                  totalPages={totalPages}
                  onChange={(next) => updateAt(idx, next)}
                  onRemove={() => removeAt(idx)}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => addProduct(pageNum)}
              className="w-full mt-3 border-2 border-dashed border-slate-300 hover:border-brand-blue rounded-lg py-3 text-slate-600 hover:text-brand-blue font-medium transition-colors"
            >
              + Add product to page {pageNum}
            </button>
          </div>
        );
      })}
    </div>
  );
}

function ProductCard({
  product,
  categories,
  totalPages,
  onChange,
  onRemove,
}: {
  product: Product;
  categories: Category[];
  totalPages: number;
  onChange: (p: Product) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(!product.name);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const minBlock = computeMinBlockSize(product);

  function set<K extends keyof Product>(key: K, value: Product[K]) {
    onChange({ ...product, [key]: value });
  }

  function addColour(value: string) {
    const v = value.trim();
    if (!v) return;
    const next = { ...product, colours: [...product.colours, v] };
    next.blockSize = Math.max(next.blockSize, computeMinBlockSize(next));
    onChange(next);
  }
  function addDimension(value: string) {
    const v = value.trim();
    if (!v) return;
    const next = { ...product, dimensions: [...product.dimensions, v] };
    next.blockSize = Math.max(next.blockSize, computeMinBlockSize(next));
    onChange(next);
  }

  async function handleFile(file: File) {
    setUploadError(null);
    setUploadProgress(0);
    try {
      const url = await uploadImage(file, (pct) => setUploadProgress(pct));
      set('imageUrl', url);
      setUploadProgress(null);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Upload failed');
      setUploadProgress(null);
    }
  }

  function recomputeDiscount(reg: number | undefined, sale: number | undefined) {
    if (reg && sale && reg > 0 && sale < reg) {
      const pct = Math.round(((reg - sale) / reg) * 100);
      set('discountPercent', pct);
    }
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full p-3 flex items-center gap-3 text-left"
      >
        {product.imageUrl ? (
          <img src={product.imageUrl} alt="" className="w-12 h-12 object-cover rounded border border-slate-200 shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-xs shrink-0">
            no img
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{product.name || 'New product'}</div>
          <div className="text-xs text-slate-500 truncate">
            {product.blockSize > 1 && `${product.blockSize} blocks · `}
            {product.colours.length > 0 && `${product.colours.length} colour${product.colours.length === 1 ? '' : 's'} · `}
            {product.dimensions.length > 0 && `${product.dimensions.length} size${product.dimensions.length === 1 ? '' : 's'}`}
            {product.colours.length === 0 && product.dimensions.length === 0 && product.blockSize === 1 && 'Tap to edit'}
          </div>
        </div>
        <span className="text-slate-400 text-xl shrink-0">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-3 border-t border-slate-100 pt-3">
          {/* Image */}
          <div>
            <label className="block text-sm font-medium mb-1">Photo</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 border border-slate-300 rounded-lg px-3 py-3 text-slate-700 hover:border-brand-blue"
              >
                {product.imageUrl ? 'Replace photo' : 'Take / choose photo'}
              </button>
              {product.imageUrl && (
                <button
                  type="button"
                  onClick={() => set('imageUrl', undefined)}
                  className="px-3 py-3 border border-slate-300 rounded-lg text-brand-red hover:border-brand-red"
                >
                  Remove
                </button>
              )}
            </div>
            {uploadProgress !== null && (
              <div className="mt-2">
                <div className="h-2 bg-slate-200 rounded overflow-hidden">
                  <div className="h-full bg-brand-blue transition-all" style={{ width: `${uploadProgress}%` }} />
                </div>
                <div className="text-xs text-slate-500 mt-1">Uploading… {uploadProgress}%</div>
              </div>
            )}
            {uploadError && <p className="text-brand-red text-xs mt-1">{uploadError}</p>}
            {!product.imageUrl && (
              <label className="flex items-center gap-2 text-xs text-slate-600 mt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={product.requestStockImage}
                  onChange={(e) => set('requestStockImage', e.target.checked)}
                  className="accent-brand-blue"
                />
                <span>Request a stock image from head office</span>
              </label>
            )}
          </div>

          {/* Basics */}
          <Field label="Product name" required>
            <input type="text" value={product.name} onChange={(e) => set('name', e.target.value)} className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Brand">
              <input type="text" value={product.brand ?? ''} onChange={(e) => set('brand', e.target.value)} className={inputCls} />
            </Field>
            <Field label="SKU">
              <input type="text" value={product.sku ?? ''} onChange={(e) => set('sku', e.target.value)} className={inputCls} />
            </Field>
          </div>

          {/* Category */}
          <Field label="Category">
            <select
              value={product.categoryId === null || product.categoryId === undefined
                ? (product.categoryOther !== undefined ? 'other' : '')
                : String(product.categoryId)}
              onChange={(e) => {
                if (e.target.value === '') {
                  onChange({ ...product, categoryId: null, categoryOther: undefined });
                } else if (e.target.value === 'other') {
                  onChange({ ...product, categoryId: null, categoryOther: product.categoryOther ?? '' });
                } else {
                  onChange({ ...product, categoryId: Number(e.target.value), categoryOther: undefined });
                }
              }}
              className={inputCls + ' bg-white'}
            >
              <option value="">Pick one…</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              <option value="other">Other (specify)</option>
            </select>
          </Field>
          {product.categoryOther !== undefined && (
            <Field label="Specify category">
              <input
                type="text"
                value={product.categoryOther}
                onChange={(e) => set('categoryOther', e.target.value)}
                className={inputCls}
                placeholder="Tell us the category name"
              />
            </Field>
          )}

          {/* Colours */}
          <ChipField
            label="Colours"
            values={product.colours}
            onAdd={addColour}
            onRemove={(i) => set('colours', product.colours.filter((_, idx) => idx !== i))}
            placeholder="e.g. White, Oak, Charcoal"
          />

          {/* Dimensions */}
          <ChipField
            label="Sizes / dimensions"
            values={product.dimensions}
            onAdd={addDimension}
            onRemove={(i) => set('dimensions', product.dimensions.filter((_, idx) => idx !== i))}
            placeholder='e.g. 4&quot; x 8&quot;, 12 ft, 1L'
          />

          {(product.colours.length > 2 || product.dimensions.length > 2) && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs text-amber-900">
              {product.colours.length > 5 || product.dimensions.length > 5
                ? 'Lots of options — block size bumped to 3 slots so they all fit.'
                : 'More than 2 options — block size bumped to 2 slots to make room.'}
            </div>
          )}

          {/* Price */}
          <div className="grid grid-cols-2 gap-2">
            <Field label="Regular price ($)">
              <input
                type="number" inputMode="decimal" min="0" step="0.01"
                value={product.regularPrice ?? ''}
                onChange={(e) => {
                  const v = e.target.value ? Number(e.target.value) : undefined;
                  set('regularPrice', v);
                  recomputeDiscount(v, product.salePrice);
                }}
                className={inputCls}
              />
            </Field>
            <Field label="Sale price ($)">
              <input
                type="number" inputMode="decimal" min="0" step="0.01"
                value={product.salePrice ?? ''}
                onChange={(e) => {
                  const v = e.target.value ? Number(e.target.value) : undefined;
                  set('salePrice', v);
                  recomputeDiscount(product.regularPrice, v);
                }}
                className={inputCls}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Unit">
              <select
                value={product.priceUnit ?? ''}
                onChange={(e) => set('priceUnit', e.target.value || undefined)}
                className={inputCls + ' bg-white'}
              >
                <option value="">—</option>
                {PRICE_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </Field>
            <Field label="Discount %">
              <input
                type="number" inputMode="numeric" min="0" max="100" step="1"
                value={product.discountPercent ?? ''}
                onChange={(e) => set('discountPercent', e.target.value ? Number(e.target.value) : undefined)}
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="Other discount note" hint='e.g. "Buy 2 get 1 free"'>
            <input
              type="text"
              value={product.manualDiscountDescription ?? ''}
              onChange={(e) => set('manualDiscountDescription', e.target.value)}
              className={inputCls}
            />
          </Field>

          {/* Block size + page */}
          <div className="grid grid-cols-2 gap-2">
            <Field label="Block size" hint={minBlock > 1 ? `Minimum ${minBlock} (auto)` : 'How many slots this product takes'}>
              <select
                value={product.blockSize}
                onChange={(e) => set('blockSize', Math.max(minBlock, Number(e.target.value)))}
                className={inputCls + ' bg-white'}
              >
                {[1, 2, 3].map((n) => (
                  <option key={n} value={n} disabled={n < minBlock}>{n} block{n === 1 ? '' : 's'}</option>
                ))}
              </select>
            </Field>
            <Field label="Page">
              <select
                value={product.pageNumber}
                onChange={(e) => set('pageNumber', Number(e.target.value))}
                className={inputCls + ' bg-white'}
              >
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <option key={p} value={p}>Page {p}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* Toggles */}
          <Toggle
            checked={product.isMainFlyerProduct}
            onChange={(v) => set('isMainFlyerProduct', v)}
            label="Main flyer product (feature on cover or hero)"
          />
          <Toggle
            checked={product.isBundle}
            onChange={(v) => set('isBundle', v)}
            label="This is a bundle"
          />
          {product.isBundle && (
            <Field label="Bundle items" hint="What's in the bundle?">
              <textarea
                rows={2}
                value={product.bundleItems ?? ''}
                onChange={(e) => set('bundleItems', e.target.value)}
                className={inputCls}
              />
            </Field>
          )}
          <Toggle
            checked={product.includeInSocial}
            onChange={(v) => set('includeInSocial', v)}
            label="Include in social media post"
          />

          {/* Description */}
          <Field label="Description / notes">
            <textarea
              rows={2}
              value={product.description ?? ''}
              onChange={(e) => set('description', e.target.value)}
              className={inputCls}
            />
          </Field>

          <div className="pt-2 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              onClick={() => {
                if (confirm('Remove this product?')) onRemove();
              }}
              className="text-sm text-brand-red px-3 py-2 hover:underline"
            >
              Remove product
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ChipField({
  label,
  values,
  onAdd,
  onRemove,
  placeholder,
}: {
  label: string;
  values: string[];
  onAdd: (v: string) => void;
  onRemove: (i: number) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState('');

  function commit() {
    if (!draft.trim()) return;
    onAdd(draft);
    setDraft('');
  }

  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {values.map((v, i) => (
            <span key={i} className="inline-flex items-center gap-1 bg-brand-blue/10 text-brand-blue px-2 py-1 rounded-full text-sm">
              {v}
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="hover:text-brand-red"
                aria-label={`Remove ${v}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit();
            }
          }}
          placeholder={placeholder}
          className={inputCls}
        />
        <button
          type="button"
          onClick={commit}
          className="px-4 rounded-lg border-2 border-brand-blue text-brand-blue font-bold hover:bg-brand-blue hover:text-white"
        >
          +
        </button>
      </div>
    </div>
  );
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium mb-1">
        {label}
        {required && <span className="text-brand-red ml-1">*</span>}
      </span>
      {children}
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </label>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 py-1 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-5 h-5 accent-brand-blue"
      />
      <span className="text-sm">{label}</span>
    </label>
  );
}

const inputCls = "w-full rounded-lg border border-slate-300 px-3 py-3 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 outline-none";
