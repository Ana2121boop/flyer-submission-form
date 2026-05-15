import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api, ApiError } from '../lib/api';
import ProductsSection, { type Product } from '../components/ProductsSection';

const FLYER_SIZES: Array<{ value: 'standard' | '8.5x11'; label: string }> = [
  { value: 'standard', label: 'Standard' },
  { value: '8.5x11', label: '8.5" × 11" (Canada Post)' },
];
const PAGE_COUNTS = [1, 2, 4, 6, 8, 10, 12] as const;

type FormState = {
  storeName: string;
  submittedBy: string;

  flyerStartDate: string;
  flyerEndDate: string;
  flyerSize: 'standard' | '8.5x11';
  pageCount: number;

  theme: string;

  printCanadaPost: boolean;
  printDigital: boolean;
  canadaPostBudget: string;

  facebookAdsEnabled: boolean;
  facebookAdsBudget: string;

  postersRequested: string;
  priceCardsRequested: string;
  bannerDetails: string;

  generalNotes: string;
  printNotes: string;

  products: Product[];
};

const DRAFT_KEY = 'flyer_draft_v2';

function firstOfNextMonth(): string {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return next.toISOString().slice(0, 10);
}

function emptyForm(): FormState {
  const start = firstOfNextMonth();
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 13);
  return {
    storeName: '',
    submittedBy: '',
    flyerStartDate: start,
    flyerEndDate: end.toISOString().slice(0, 10),
    flyerSize: 'standard',
    pageCount: 4,
    theme: '',
    printCanadaPost: false,
    printDigital: false,
    canadaPostBudget: '',
    facebookAdsEnabled: false,
    facebookAdsBudget: '',
    postersRequested: '0',
    priceCardsRequested: '0',
    bannerDetails: '',
    generalNotes: '',
    printNotes: '',
    products: [],
  };
}

export default function SubmitForm() {
  const [form, setForm] = useState<FormState>(() => {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      try { return { ...emptyForm(), ...JSON.parse(saved) }; } catch { /* ignore */ }
    }
    return emptyForm();
  });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedId, setSubmittedId] = useState<number | null>(null);

  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
  }, [form]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // If page count drops, reassign products on now-nonexistent pages.
  function updatePageCount(n: number) {
    setForm((f) => ({
      ...f,
      pageCount: n,
      products: f.products.map((p) => ({
        ...p,
        pageNumber: p.pageNumber > n ? n : p.pageNumber,
      })),
    }));
  }

  const submit = useMutation({
    mutationFn: async () => {
      const body = {
        storeName: form.storeName.trim(),
        submittedBy: form.submittedBy.trim(),
        flyerStartDate: form.flyerStartDate,
        flyerEndDate: form.flyerEndDate,
        flyerSize: form.flyerSize,
        pageCount: form.pageCount,
        theme: form.theme.trim() || null,
        generalNotes: form.generalNotes.trim() || null,
        printCanadaPost: form.printCanadaPost,
        printDigital: form.printDigital,
        canadaPostBudget: form.printCanadaPost && form.canadaPostBudget ? Number(form.canadaPostBudget) : null,
        facebookAdsEnabled: form.facebookAdsEnabled,
        facebookAdsBudget: form.facebookAdsEnabled && form.facebookAdsBudget ? Number(form.facebookAdsBudget) : null,
        postersRequested: Number(form.postersRequested) || 0,
        priceCardsRequested: Number(form.priceCardsRequested) || 0,
        bannerDetails: form.bannerDetails.trim() || null,
        reqPriceTags: false,
        reqPosters: Number(form.postersRequested) > 0,
        reqBanners: !!form.bannerDetails.trim(),
        printNotes: form.printNotes.trim() || null,
        products: form.products.filter((p) => p.name.trim().length > 0),
      };
      return api<{ submissionId: number }>('/api/submit', { method: 'POST', body });
    },
    onSuccess: (data) => {
      setSubmittedId(data.submissionId);
      localStorage.removeItem(DRAFT_KEY);
    },
    onError: (err) => {
      setSubmitError(err instanceof ApiError ? err.message : 'Submission failed');
    },
  });

  if (submittedId !== null) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <div className="text-6xl mb-4">✓</div>
        <h1 className="text-2xl font-bold mb-2">Submission received!</h1>
        <p className="text-slate-600 mb-1">Submission ID: <span className="font-mono">{submittedId}</span></p>
        <p className="text-slate-600 mb-6">Head office has it. You can close this page.</p>
        <button
          type="button"
          onClick={() => { setSubmittedId(null); setForm(emptyForm()); }}
          className="bg-brand-blue text-white font-semibold rounded-lg px-6 py-3 hover:bg-brand-blue-dark"
        >
          Submit another flyer
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-4 sm:py-6 pb-32">
      <h1 className="text-2xl font-bold mb-1">Submit a flyer</h1>
      <p className="text-slate-600 mb-6">Fill out the form below. Your progress is saved on this device as you type.</p>

      <Section title="1. Your store" defaultOpen>
        <Field label="Store name" required>
          <input type="text" value={form.storeName} onChange={(e) => update('storeName', e.target.value)} className={inputCls} placeholder="e.g. Windsor Plywood Surrey" />
        </Field>
        <Field label="Your name" required>
          <input type="text" value={form.submittedBy} onChange={(e) => update('submittedBy', e.target.value)} className={inputCls} />
        </Field>
        <Field label="Theme / title (optional)" hint='e.g. "Black Friday", "Spring DIY Sale"'>
          <input type="text" value={form.theme} onChange={(e) => update('theme', e.target.value)} className={inputCls} />
        </Field>
      </Section>

      <Section title="2. Flyer details" defaultOpen>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Flyer start date" required hint="Must be the 1st of next month or later">
            <input
              type="date"
              value={form.flyerStartDate}
              min={firstOfNextMonth()}
              onChange={(e) => update('flyerStartDate', e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Flyer end date" required>
            <input
              type="date"
              value={form.flyerEndDate}
              min={form.flyerStartDate}
              onChange={(e) => update('flyerEndDate', e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Flyer size" required>
            <select
              value={form.flyerSize}
              onChange={(e) => update('flyerSize', e.target.value as 'standard' | '8.5x11')}
              className={inputCls + ' bg-white'}
            >
              {FLYER_SIZES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </Field>
          <Field label="Number of pages" required>
            <select
              value={form.pageCount}
              onChange={(e) => updatePageCount(Number(e.target.value))}
              className={inputCls + ' bg-white'}
            >
              {PAGE_COUNTS.map((n) => <option key={n} value={n}>{n} {n === 1 ? 'page' : 'pages'}</option>)}
            </select>
          </Field>
        </div>
      </Section>

      <Section title="3. Marketing channels & budgets" defaultOpen>
        <Toggle
          checked={form.printCanadaPost}
          onChange={(v) => update('printCanadaPost', v)}
          label="Canada Post flyer"
          hint="Mailed to homes"
        />
        {form.printCanadaPost && (
          <Field label="Canada Post budget ($)" required>
            <input type="number" inputMode="decimal" min="0" step="0.01" value={form.canadaPostBudget} onChange={(e) => update('canadaPostBudget', e.target.value)} className={inputCls} />
          </Field>
        )}

        <Toggle
          checked={form.printDigital}
          onChange={(v) => update('printDigital', v)}
          label="Digital / in-store flyer"
        />

        <Toggle
          checked={form.facebookAdsEnabled}
          onChange={(v) => update('facebookAdsEnabled', v)}
          label="Facebook ads"
        />
        {form.facebookAdsEnabled && (
          <Field label="Facebook ads budget ($)" required>
            <input type="number" inputMode="decimal" min="0" step="0.01" value={form.facebookAdsBudget} onChange={(e) => update('facebookAdsBudget', e.target.value)} className={inputCls} />
          </Field>
        )}

        <div className="grid grid-cols-2 gap-3 mt-2">
          <Field label="Posters needed">
            <input type="number" inputMode="numeric" min="0" step="1" value={form.postersRequested} onChange={(e) => update('postersRequested', e.target.value)} className={inputCls} />
          </Field>
          <Field label="Price-card sets">
            <input type="number" inputMode="numeric" min="0" step="1" value={form.priceCardsRequested} onChange={(e) => update('priceCardsRequested', e.target.value)} className={inputCls} />
          </Field>
        </div>

        <Field label="In-store banner details" hint='e.g. "Proudly Canadian banner, plus a Paint banner"'>
          <textarea rows={3} value={form.bannerDetails} onChange={(e) => update('bannerDetails', e.target.value)} className={inputCls} />
        </Field>
      </Section>

      <Section title={`4. Products (${form.products.length})`} defaultOpen>
        <ProductsSection
          products={form.products}
          totalPages={form.pageCount}
          onChange={(next) => update('products', next)}
        />
      </Section>

      <Section title="5. Anything else?">
        <Field label="General notes for head office">
          <textarea rows={4} value={form.generalNotes} onChange={(e) => update('generalNotes', e.target.value)} className={inputCls} />
        </Field>
        <Field label="Print / production notes">
          <textarea rows={3} value={form.printNotes} onChange={(e) => update('printNotes', e.target.value)} className={inputCls} />
        </Field>
      </Section>

      {submitError && (
        <div className="bg-red-50 border border-red-200 text-red-900 rounded-lg p-3 mt-4 text-sm">
          {submitError}
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-3 z-20 shadow-lg">
        <div className="max-w-3xl mx-auto flex gap-3">
          <button
            type="button"
            onClick={() => {
              if (confirm('Clear the form and start over?')) {
                localStorage.removeItem(DRAFT_KEY);
                setForm(emptyForm());
                setSubmitError(null);
              }
            }}
            className="px-4 py-3 rounded-lg border border-slate-200 text-slate-700"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => submit.mutate()}
            disabled={submit.isPending || !form.storeName.trim() || !form.submittedBy.trim()}
            className="flex-1 bg-brand-blue text-white font-semibold rounded-lg py-3 hover:bg-brand-blue-dark disabled:opacity-50"
          >
            {submit.isPending ? 'Submitting…' : 'Submit flyer'}
          </button>
        </div>
        <div className="max-w-3xl mx-auto text-center text-xs text-slate-400 mt-1">
          Draft is auto-saved on this device
        </div>
      </div>
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-slate-300 px-3 py-3 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 outline-none";

function Section({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-xl border border-slate-200 mb-3 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left font-semibold"
      >
        {title}
        <span className="text-slate-400 text-xl">{open ? '−' : '+'}</span>
      </button>
      {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
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

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex items-start gap-3 py-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-5 h-5 accent-brand-blue mt-1"
      />
      <span>
        <span className="font-medium">{label}</span>
        {hint && <span className="block text-xs text-slate-500">{hint}</span>}
      </span>
    </label>
  );
}
