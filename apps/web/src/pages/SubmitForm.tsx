import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api, ApiError } from '../lib/api';
import ProductsSection, { type Product } from '../components/ProductsSection';
import FormProgressBar from '../components/FormProgressBar';

const FLYER_SIZES: Array<{ value: 'standard' | '8.5x11'; label: string }> = [
  { value: 'standard', label: 'Standard' },
  { value: '8.5x11', label: '8.5" × 11" (Canada Post)' },
];
const PAGE_COUNTS = [1, 2, 4, 6, 8] as const;

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
  const [currentSectionId, setCurrentSectionId] = useState<string>('store');
  const storeNameRef = useRef<HTMLInputElement>(null);
  const submittedByRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
  }, [form]);

  // Track which section is in view for the progress bar highlight
  useEffect(() => {
    const ids = ['store', 'dates', 'marketing', 'products', 'notes'];
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) {
          const id = visible[0].target.id.replace('section-', '');
          setCurrentSectionId(id);
        }
      },
      { rootMargin: '-30% 0px -50% 0px', threshold: [0, 0.25, 0.5] },
    );
    ids.forEach((id) => {
      const el = document.getElementById(`section-${id}`);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function updatePageCount(n: number) {
    setForm((f) => ({
      ...f,
      pageCount: n,
      products: f.products.map((p) => ({ ...p, pageNumber: p.pageNumber > n ? n : p.pageNumber })),
    }));
  }

  // Section completion status
  const storeDone = !!form.storeName.trim() && !!form.submittedBy.trim();
  const datesDone = !!form.flyerStartDate && !!form.flyerEndDate && !!form.flyerSize && !!form.pageCount;
  const productsDone = form.products.some((p) => p.name.trim().length > 0);
  const submitDone = storeDone && datesDone && productsDone;

  const steps = [
    { id: 'store', label: 'Store', done: storeDone },
    { id: 'dates', label: 'Dates', done: datesDone },
    { id: 'products', label: 'Products', done: productsDone },
    { id: 'submit', label: submitDone ? 'Ready!' : 'Submit', done: false },
  ];

  // Smart submit button hint
  function getBlocker(): { msg: string; jumpTo: (() => void) | null } | null {
    if (!form.storeName.trim()) {
      return { msg: 'Enter your store name first', jumpTo: () => { focusField(storeNameRef); } };
    }
    if (!form.submittedBy.trim()) {
      return { msg: 'Enter your name', jumpTo: () => { focusField(submittedByRef); } };
    }
    if (!productsDone) {
      return { msg: 'Add at least one product', jumpTo: () => { scrollToSection('products'); } };
    }
    return null;
  }
  const blocker = getBlocker();

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
        products: form.products
          .filter((p) => p.name.trim().length > 0)
          .map((p) => ({
            ...p,
            regularPrice: parsePositive(p.regularPrice),
            salePrice: parsePositive(p.salePrice),
            discountPercent: parsePositive(p.discountPercent),
          })),
      };
      return api<{ submissionId: number }>('/api/submit', { method: 'POST', body });
    },
    onSuccess: (data) => {
      setSubmittedId(data.submissionId);
      localStorage.removeItem(DRAFT_KEY);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    onError: (err) => {
      setSubmitError(err instanceof ApiError ? err.message : 'Submission failed');
    },
  });

  if (submittedId !== null) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <div className="text-6xl mb-4">✓</div>
        <h1 className="text-2xl font-bold mb-2">Thanks, your flyer's in!</h1>
        <p className="text-slate-600 mb-1">Submission ID: <span className="font-mono">{submittedId}</span></p>
        <p className="text-slate-600 mb-6">Head office got it. You're all done — close this page or start another.</p>
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
      <FormProgressBar steps={steps} currentId={currentSectionId} />

      <h1 className="text-2xl font-bold mb-1">Submit a flyer</h1>
      <p className="text-slate-600 mb-6">
        Fill out the sections below — we'll save as you go.
      </p>

      <Section
        id="store"
        title="1. Your store"
        complete={storeDone}
        summary={storeDone ? `${form.storeName} · ${form.submittedBy}` : null}
        defaultOpen
      >
        <Field label="Store name" required>
          <input ref={storeNameRef} type="text" value={form.storeName} onChange={(e) => update('storeName', e.target.value)} className={inputCls} placeholder="e.g. Windsor Plywood Surrey" />
        </Field>
        <Field label="Your name" required>
          <input ref={submittedByRef} type="text" value={form.submittedBy} onChange={(e) => update('submittedBy', e.target.value)} className={inputCls} placeholder="So we know who to ask if there's a question" />
        </Field>
        <Field label="Theme / title (optional)" hint='e.g. "Black Friday", "Spring DIY Sale"'>
          <input type="text" value={form.theme} onChange={(e) => update('theme', e.target.value)} className={inputCls} />
        </Field>
      </Section>

      <Section
        id="dates"
        title="2. Flyer details"
        complete={datesDone}
        summary={datesDone ? `${form.flyerStartDate} → ${form.flyerEndDate} · ${form.flyerSize === '8.5x11' ? '8.5×11' : 'standard'} · ${form.pageCount}p` : null}
        defaultOpen
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Flyer starts" required hint="Must be the 1st of next month or later">
            <input
              type="date"
              value={form.flyerStartDate}
              min={firstOfNextMonth()}
              onChange={(e) => update('flyerStartDate', e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Flyer ends" required hint="Most flyers run 1–2 weeks">
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

      <Section
        id="marketing"
        title="3. Marketing channels & budgets"
        complete={form.printCanadaPost || form.printDigital || form.facebookAdsEnabled}
        summary={summarizeMarketing(form)}
      >
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

      <Section
        id="products"
        title="4. Products"
        complete={productsDone}
        summary={productsDone ? `${form.products.filter((p) => p.name.trim()).length} added` : null}
        defaultOpen
      >
        {form.products.length === 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3 text-sm text-blue-900">
            <strong>Tip:</strong> tap "+ Add product" below, then tap the photo area to take a picture with your phone's camera. Fill in the name, price, and you're done — head office gets all the details.
          </div>
        )}
        <ProductsSection
          products={form.products}
          totalPages={form.pageCount}
          onChange={(next) => update('products', next)}
        />
      </Section>

      <Section
        id="notes"
        title="5. Anything else? (optional)"
        complete={!!(form.generalNotes.trim() || form.printNotes.trim())}
        summary={null}
      >
        <Field label="General notes for head office">
          <textarea rows={4} value={form.generalNotes} onChange={(e) => update('generalNotes', e.target.value)} className={inputCls} placeholder="Anything else you'd like us to know?" />
        </Field>
        <Field label="Print / production notes">
          <textarea rows={3} value={form.printNotes} onChange={(e) => update('printNotes', e.target.value)} className={inputCls} />
        </Field>
      </Section>

      {submitError && (
        <div className="bg-red-50 border border-red-200 text-red-900 rounded-lg p-3 mt-4 text-sm">
          <strong>Couldn't submit:</strong> {submitError}
        </div>
      )}

      {/* Sticky bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-3 z-20 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
        <div className="max-w-3xl mx-auto">
          {blocker ? (
            <button
              type="button"
              onClick={() => blocker.jumpTo?.()}
              className="w-full bg-slate-100 text-slate-700 font-medium rounded-lg py-3.5 hover:bg-slate-200 flex items-center justify-center gap-2"
            >
              <span>👉</span>
              <span>{blocker.msg}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => submit.mutate()}
              disabled={submit.isPending}
              className="w-full bg-brand-blue text-white font-bold rounded-lg py-3.5 hover:bg-brand-blue-dark disabled:opacity-60 text-lg shadow-md"
            >
              {submit.isPending ? 'Sending…' : 'Submit flyer ✓'}
            </button>
          )}
          <div className="flex items-center justify-between mt-2 text-xs text-slate-400">
            <button
              type="button"
              onClick={() => {
                if (confirm('Clear everything and start over?')) {
                  localStorage.removeItem(DRAFT_KEY);
                  setForm(emptyForm());
                  setSubmitError(null);
                }
              }}
              className="hover:text-brand-red"
            >
              Clear form
            </button>
            <span>Draft saved on this device</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function focusField(ref: React.RefObject<HTMLInputElement | null>) {
  if (!ref.current) return;
  ref.current.focus();
  ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function scrollToSection(id: string) {
  const el = document.getElementById(`section-${id}`);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function summarizeMarketing(f: FormState): string | null {
  const parts: string[] = [];
  if (f.printCanadaPost) parts.push('Canada Post');
  if (f.printDigital) parts.push('Digital');
  if (f.facebookAdsEnabled) parts.push('Facebook');
  if (parts.length === 0) return null;
  return parts.join(' · ');
}

const inputCls = "w-full rounded-lg border border-slate-300 px-3 py-3 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 outline-none text-base";

function parsePositive(s: string): number | null {
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function Section({
  id, title, children, defaultOpen = false, complete = false, summary,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  complete?: boolean;
  summary?: string | null;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div id={`section-${id}`} className="bg-white rounded-xl border border-slate-200 mb-3 overflow-hidden scroll-mt-24">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 p-4 text-left"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div
            className={
              'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ' +
              (complete ? 'bg-brand-blue text-white' : 'bg-slate-100 text-slate-400')
            }
          >
            {complete ? '✓' : ''}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold">{title}</div>
            {!open && summary && <div className="text-xs text-slate-500 truncate mt-0.5">{summary}</div>}
          </div>
        </div>
        <span className="text-slate-400 text-2xl leading-none shrink-0">{open ? '−' : '+'}</span>
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
