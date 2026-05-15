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
  // When false, the price block is hidden and all price fields are sent as null
  // ("we just carry this product"). Default true.
  showPrice: boolean;
  // Prices stored as strings to allow free typing (e.g. "1.5" without losing the dot
  // when input type=number coerces values mid-keystroke). Parsed to numbers at submit time.
  regularPrice: string;
  salePrice: string;
  priceUnit?: string;
  discountPercent: string;
  manualDiscountDescription?: string;
  isMainFlyerProduct: boolean;
  isBundle: boolean;
  bundleItems?: string;
  requestStockImage: boolean;
  includeInSocial: boolean;
};

type Category = { id: number; name: string };

// Quick-add chips so store managers don't have to hunt for × on a mobile keyboard.
// Covers Windsor's main product mix: plywood / sheet goods, dimensional lumber,
// gallons (paint/glue/finish), and pounds (hardware bundles).
const DIMENSION_PRESETS = [
  "4'×8'", "4'×4'", "2'×4'", "2'×8'",
  '8 ft', '10 ft', '12 ft', '16 ft',
  '1 gal', '5 gal', '1 quart', '1 pint',
  '1 lb', '5 lbs', '20 lbs',
];

const COLOUR_PRESETS = [
  'White', 'Black', 'Brown', 'Grey', 'Natural',
  'Oak', 'Walnut', 'Cherry', 'Espresso', 'Maple',
];

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
    showPrice: true,
    regularPrice: '',
    salePrice: '',
    discountPercent: '',
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

function computeDiscount(regular: string, sale: string): string | null {
  const reg = Number(regular);
  const sal = Number(sale);
  if (!regular || !sale || !Number.isFinite(reg) || !Number.isFinite(sal) || reg <= 0 || sal >= reg) return null;
  return String(Math.round(((reg - sal) / reg) * 100));
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

  // Global: block adding new products anywhere while any product (on any page)
  // is still unfilled. Forces serial one-at-a-time editing.
  const anyIncomplete = products.find((p) => !p.name.trim());
  const incompletePage = anyIncomplete?.pageNumber;

  return (
    <div className="space-y-4">
      {pages.map((pageNum) => {
        const onPage = products
          .map((p, idx) => ({ p, idx }))
          .filter(({ p }) => p.pageNumber === pageNum);
        const namedOnPage = onPage.filter(({ p }) => p.name.trim().length > 0);

        return (
          <div key={pageNum} className="border border-slate-200 rounded-lg p-3 bg-slate-50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Page {pageNum}</h3>
              <span className="text-xs text-slate-500">
                {namedOnPage.length} {namedOnPage.length === 1 ? 'product' : 'products'}
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

            {anyIncomplete ? (
              <div className="mt-3 text-center text-sm text-slate-700 py-3 px-3 bg-amber-50 border border-amber-200 rounded-lg">
                {incompletePage === pageNum
                  ? 'Finish filling in the product above first.'
                  : `Finish the unfilled product on page ${incompletePage} first.`}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => addProduct(pageNum)}
                className="w-full mt-3 border-2 border-dashed border-slate-300 hover:border-brand-blue hover:bg-brand-blue/5 rounded-lg py-4 text-slate-600 hover:text-brand-blue font-semibold transition-colors active:scale-[0.99]"
              >
                {onPage.length === 0 ? `+ Add the first product to page ${pageNum}` : `+ Add another product to page ${pageNum}`}
              </button>
            )}
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


  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full p-3 flex items-center gap-3 text-left"
      >
        {product.imageUrl ? (
          <img src={product.imageUrl} alt="" className="w-24 h-24 object-cover rounded-lg border border-slate-200 shrink-0" />
        ) : (
          <div className="w-24 h-24 rounded-lg border-2 border-dashed border-slate-200 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate">{product.name || 'New product (tap to fill in)'}</div>
          <div className="text-xs text-slate-500 truncate mt-0.5">
            {product.blockSize > 1 && `Emphasized · `}
            {product.colours.length > 0 && `${product.colours.length} colour${product.colours.length === 1 ? '' : 's'}`}
            {product.colours.length > 0 && product.dimensions.length > 0 && ' · '}
            {product.dimensions.length > 0 && `${product.dimensions.length} size${product.dimensions.length === 1 ? '' : 's'}`}
            {product.colours.length === 0 && product.dimensions.length === 0 && product.blockSize === 1 && (product.name ? 'Tap to edit' : 'Tap to add details')}
          </div>
        </div>
        <span className="text-slate-400 text-2xl leading-none shrink-0">{open ? '−' : '+'}</span>
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

          {/* Colours — single text input + quick-add chips for common Windsor colours */}
          <ListField
            label="Colours"
            values={product.colours}
            onChange={(next) => {
              const updated = { ...product, colours: next };
              updated.blockSize = Math.max(updated.blockSize, computeMinBlockSize(updated));
              onChange(updated);
            }}
            placeholder="e.g. White, Espresso, Sea Green"
            presets={COLOUR_PRESETS}
          />

          <ListField
            label="Sizes / dimensions"
            values={product.dimensions}
            onChange={(next) => {
              const updated = { ...product, dimensions: next };
              updated.blockSize = Math.max(updated.blockSize, computeMinBlockSize(updated));
              onChange(updated);
            }}
            placeholder="e.g. 4x8, 12 ft, 1L, custom..."
            presets={DIMENSION_PRESETS}
          />

          {(product.colours.length > 2 || product.dimensions.length > 2) && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs text-amber-900">
              {product.colours.length > 5 || product.dimensions.length > 5
                ? 'Lots of options — this product will get extra space on the flyer.'
                : 'More than 2 options — this product will get a bit more space.'}
            </div>
          )}

          {/* Pricing — explicit choice between "show a price" and "we just carry it" */}
          <div className="pt-1">
            <div className="text-sm font-medium mb-2">Pricing</div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button
                type="button"
                onClick={() => set('showPrice', true)}
                className={
                  'py-3 rounded-lg border-2 font-medium transition-colors ' +
                  (product.showPrice
                    ? 'border-brand-blue bg-brand-blue/10 text-brand-blue'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300')
                }
              >
                Show a price
              </button>
              <button
                type="button"
                onClick={() => onChange({
                  ...product,
                  showPrice: false,
                  regularPrice: '',
                  salePrice: '',
                  discountPercent: '',
                  priceUnit: undefined,
                  manualDiscountDescription: undefined,
                })}
                className={
                  'py-3 rounded-lg border-2 font-medium transition-colors ' +
                  (!product.showPrice
                    ? 'border-brand-blue bg-brand-blue/10 text-brand-blue'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300')
                }
              >
                Just carry it<br /><span className="text-xs font-normal">(no price)</span>
              </button>
            </div>

            {!product.showPrice && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-600 text-center">
                Got it — we'll feature this product without showing a price.
              </div>
            )}

            {product.showPrice && (
              <>
                <p className="text-xs text-slate-500 mb-2">
                  Regular price alone = everyday price. Add a sale price OR a discount % if it's on sale. Skip what doesn't apply.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Regular ($)">
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={product.regularPrice}
                      onChange={(e) => {
                        const next = { ...product, regularPrice: e.target.value };
                        next.discountPercent = computeDiscount(next.regularPrice, next.salePrice) ?? product.discountPercent;
                        onChange(next);
                      }}
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Sale ($)">
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={product.salePrice}
                      onChange={(e) => {
                        const next = { ...product, salePrice: e.target.value };
                        next.discountPercent = computeDiscount(next.regularPrice, next.salePrice) ?? product.discountPercent;
                        onChange(next);
                      }}
                      className={inputCls}
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Field label="Unit (per...)">
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
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={product.discountPercent}
                      onChange={(e) => set('discountPercent', e.target.value)}
                      className={inputCls}
                    />
                  </Field>
                </div>
                <Field
                  label="Pricing or unit note"
                  hint='Use this for anything weird. e.g. "Sold in lift, priced per individual sheet" or "Buy 2 get 1 free"'
                >
                  <input
                    type="text"
                    value={product.manualDiscountDescription ?? ''}
                    onChange={(e) => set('manualDiscountDescription', e.target.value)}
                    className={inputCls}
                    placeholder="e.g. Sold in lift, priced each"
                  />
                </Field>
              </>
            )}
          </div>

          {/* Emphasize toggle — replaces the old block-size buttons */}
          <Toggle
            checked={product.blockSize >= 2}
            onChange={(v) => {
              if (v) {
                set('blockSize', Math.max(2, minBlock));
              } else {
                // Can't go below auto-bumped minimum
                set('blockSize', minBlock);
              }
            }}
            label="Emphasize this product"
          />
          {product.blockSize > 1 && minBlock > 1 && (
            <p className="text-xs text-slate-500 -mt-2">Auto-emphasized because of multiple colours/sizes.</p>
          )}

          <Field label="Page in flyer">
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

          <div className="pt-3 mt-2 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                if (confirm('Remove this product?')) onRemove();
              }}
              className="text-sm text-brand-red px-3 py-2 hover:underline self-start"
            >
              Remove product
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={!product.name.trim()}
              className="bg-brand-blue text-white font-semibold rounded-lg py-3 px-5 hover:bg-brand-blue-dark disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {product.name.trim() ? 'Done with this product ✓' : 'Add a name to continue'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ListField({
  label,
  values,
  onChange,
  placeholder,
  presets,
}: {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  presets?: string[];
}) {
  const [text, setText] = useState(values.join(', '));

  function commit(raw: string) {
    setText(raw);
    const parsed = raw.split(',').map((s) => s.trim()).filter(Boolean);
    onChange(parsed);
  }

  function addPreset(preset: string) {
    if (values.includes(preset)) {
      // Already there — remove on second tap so it acts like a chip toggle.
      const next = values.filter((v) => v !== preset);
      setText(next.join(', '));
      onChange(next);
    } else {
      const next = [...values, preset];
      setText(next.join(', '));
      onChange(next);
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium mb-1">
        {label} <span className="text-slate-400 font-normal text-xs">(any, separate with commas)</span>
      </label>

      {/* Primary input — type anything */}
      <input
        type="text"
        value={text}
        onChange={(e) => commit(e.target.value)}
        placeholder={placeholder}
        className={inputCls}
      />

      {/* What they've added so far */}
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {values.map((v, i) => (
            <span key={i} className="inline-flex items-center bg-brand-blue/10 text-brand-blue px-2 py-1 rounded-full text-xs">
              {v}
            </span>
          ))}
        </div>
      )}

      {/* Secondary: quick-add shortcuts, clearly subordinate */}
      {presets && presets.length > 0 && (
        <div className="mt-2 pt-2 border-t border-dashed border-slate-200">
          <div className="text-[11px] text-slate-500 mb-1.5">
            Or tap a common one to add it (you can still type any you want above):
          </div>
          <div className="flex flex-wrap gap-1">
            {presets.map((p) => {
              const active = values.includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => addPreset(p)}
                  className={
                    'text-xs px-2 py-1 rounded-full border transition-colors ' +
                    (active
                      ? 'bg-brand-blue/10 border-brand-blue text-brand-blue'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white hover:border-brand-blue/40')
                  }
                >
                  {active ? '✓ ' : '+ '}{p}
                </button>
              );
            })}
          </div>
        </div>
      )}
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
