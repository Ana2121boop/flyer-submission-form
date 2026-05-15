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

const STEPS = ['store', 'dates', 'marketing', 'products', 'review'] as const;
type StepId = typeof STEPS[number];

type FormState = {
  storeName: string;
  submittedBy: string;
  theme: string;

  flyerStartDate: string;
  flyerEndDate: string;
  flyerSize: 'standard' | '8.5x11' | '';
  pageCount: number;

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

const DRAFT_KEY = 'flyer_draft_v3';

function firstOfNextMonth(): string {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return next.toISOString().slice(0, 10);
}

function emptyForm(): FormState {
  return {
    storeName: '',
    submittedBy: '',
    theme: '',
    flyerStartDate: '',
    flyerEndDate: '',
    flyerSize: '',
    pageCount: 0,
    printCanadaPost: false,
    printDigital: false,
    canadaPostBudget: '',
    facebookAdsEnabled: false,
    facebookAdsBudget: '',
    postersRequested: '',
    priceCardsRequested: '',
    bannerDetails: '',
    generalNotes: '',
    printNotes: '',
    products: [],
  };
}

function isStoreDone(f: FormState) {
  return !!f.storeName.trim() && !!f.submittedBy.trim();
}
function isDatesDone(f: FormState) {
  return !!f.flyerStartDate && !!f.flyerEndDate && !!f.flyerSize && f.pageCount > 0;
}
function isProductsDone(f: FormState) {
  return f.products.some((p) => p.name.trim().length > 0);
}
function isMarketingValid(f: FormState) {
  if (f.printCanadaPost && !f.canadaPostBudget.trim()) return false;
  if (f.facebookAdsEnabled && !f.facebookAdsBudget.trim()) return false;
  return true;
}
function canContinue(step: StepId, f: FormState): boolean {
  switch (step) {
    case 'store': return isStoreDone(f);
    case 'dates': return isDatesDone(f);
    case 'marketing': return isMarketingValid(f);
    case 'products': return isProductsDone(f);
    case 'review': return isStoreDone(f) && isDatesDone(f) && isProductsDone(f) && isMarketingValid(f);
  }
}

function computeFurthest(f: FormState): StepId {
  if (!isStoreDone(f)) return 'store';
  if (!isDatesDone(f)) return 'dates';
  // Marketing is optional but if invalid (budget missing), block on it
  if (!isMarketingValid(f)) return 'marketing';
  if (!isProductsDone(f)) return 'products';
  return 'review';
}

export default function SubmitForm() {
  const [form, setForm] = useState<FormState>(() => {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      try { return { ...emptyForm(), ...JSON.parse(saved) }; } catch { /* ignore */ }
    }
    return emptyForm();
  });
  const [furthest, setFurthest] = useState<StepId>(() => computeFurthest(form));
  const [currentStep, setCurrentStep] = useState<StepId>(furthest);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedId, setSubmittedId] = useState<number | null>(null);
  const storeNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
  }, [form]);

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

  function indexOf(step: StepId): number { return STEPS.indexOf(step); }
  function isReachable(step: StepId): boolean { return indexOf(step) <= indexOf(furthest); }
  function nextStep(step: StepId): StepId | null {
    const i = indexOf(step);
    return i < STEPS.length - 1 ? STEPS[i + 1] : null;
  }

  function advance() {
    const next = nextStep(currentStep);
    if (!next) return;
    if (indexOf(next) > indexOf(furthest)) setFurthest(next);
    setCurrentStep(next);
    setTimeout(() => {
      const el = document.getElementById(`section-${next}`);
      if (el) {
        const y = el.getBoundingClientRect().top + window.scrollY - 96;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }, 60);
  }

  function goToStep(step: StepId) {
    if (!isReachable(step)) return;
    setCurrentStep(step);
    setTimeout(() => {
      const el = document.getElementById(`section-${step}`);
      if (el) {
        const y = el.getBoundingClientRect().top + window.scrollY - 96;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }, 60);
  }

  // Keep `furthest` in sync if user changes data later (e.g., clears their name)
  useEffect(() => {
    const f = computeFurthest(form);
    if (indexOf(f) < indexOf(furthest)) {
      // Don't roll back furthest just because of typing — only on full clear.
      // But do recompute if they really did clear everything.
      if (f === 'store' && !isStoreDone(form)) {
        setFurthest('store');
        setCurrentStep('store');
      }
    } else if (indexOf(f) > indexOf(furthest)) {
      setFurthest(f);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.storeName, form.submittedBy, form.products.length]);

  const submit = useMutation({
    mutationFn: async () => {
      if (!form.flyerSize) throw new ApiError(400, 'Pick a flyer size');
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
            name: p.name.trim(),
            brand: emptyToNull(p.brand),
            sku: emptyToNull(p.sku),
            categoryOther: emptyToNull(p.categoryOther),
            description: emptyToNull(p.description),
            bundleItems: emptyToNull(p.bundleItems),
            manualDiscountDescription: emptyToNull(p.manualDiscountDescription),
            priceUnit: emptyToNull(p.priceUnit),
            imageUrl: emptyToNull(p.imageUrl),
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
      if (err instanceof ApiError) {
        const body = err.body as { message?: string; issues?: Array<{ path: (string | number)[]; message: string }> } | null;
        if (body?.issues?.length) {
          const lines = body.issues.slice(0, 5).map((i) => {
            const where = (i.path ?? []).join('.') || 'form';
            return `· ${where}: ${i.message}`;
          });
          setSubmitError(`${body.message ?? 'Validation failed'}\n${lines.join('\n')}`);
        } else {
          setSubmitError(err.message);
        }
      } else {
        setSubmitError('Submission failed');
      }
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
          onClick={() => {
            setSubmittedId(null);
            setForm(emptyForm());
            setFurthest('store');
            setCurrentStep('store');
          }}
          className="bg-brand-blue text-white font-semibold rounded-lg px-6 py-3 hover:bg-brand-blue-dark"
        >
          Submit another flyer
        </button>
      </div>
    );
  }

  const progressSteps = STEPS.slice(0, 4).map((s) => ({
    id: s,
    label: s === 'store' ? 'Store' : s === 'dates' ? 'Dates' : s === 'marketing' ? 'Marketing' : 'Products',
    done: indexOf(s) < indexOf(furthest) || (s === furthest && canContinue(s, form)),
    locked: !isReachable(s),
    onClick: () => goToStep(s),
  }));

  return (
    <div className="max-w-3xl mx-auto px-4 py-4 sm:py-6 pb-32">
      <FormProgressBar steps={progressSteps} currentId={currentStep} />

      <h1 className="text-2xl font-bold mb-1">Submit a flyer</h1>
      <p className="text-slate-600 mb-6">Fill out each section in order. We save as you go.</p>

      <StepCard
        id="store"
        title="1. Your store"
        complete={isStoreDone(form)}
        locked={!isReachable('store')}
        active={currentStep === 'store'}
        summary={isStoreDone(form) ? `${form.storeName} · ${form.submittedBy}` : null}
        onToggle={() => goToStep('store')}
      >
        <Field label="Store name" required>
          <input ref={storeNameRef} type="text" value={form.storeName} onChange={(e) => update('storeName', e.target.value)} className={inputCls} placeholder="e.g. Windsor Plywood Surrey" />
        </Field>
        <Field label="Your name" required>
          <input type="text" value={form.submittedBy} onChange={(e) => update('submittedBy', e.target.value)} className={inputCls} placeholder="So we know who to ask if there's a question" />
        </Field>
        <Field label="Theme / title (optional)" hint='e.g. "Black Friday", "Spring DIY Sale"'>
          <input type="text" value={form.theme} onChange={(e) => update('theme', e.target.value)} className={inputCls} />
        </Field>
        <ContinueRow
          complete={canContinue('store', form)}
          incompleteHint="Enter your store name and your name"
          onContinue={advance}
          onTapHint={() => { storeNameRef.current?.focus(); }}
        />
      </StepCard>

      <StepCard
        id="dates"
        title="2. Flyer details"
        complete={isDatesDone(form)}
        locked={!isReachable('dates')}
        active={currentStep === 'dates'}
        summary={isDatesDone(form) ? `${form.flyerStartDate} → ${form.flyerEndDate} · ${form.flyerSize} · ${form.pageCount}p` : null}
        onToggle={() => goToStep('dates')}
      >
        <p className="text-sm text-slate-600 mb-2">Pick when the flyer runs and how big it should be.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Flyer starts" required hint={`Earliest allowed: ${formatHumanDate(firstOfNextMonth())}`}>
            <input
              type="date"
              value={form.flyerStartDate}
              min={firstOfNextMonth()}
              onChange={(e) => update('flyerStartDate', e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Flyer ends" required>
            <input
              type="date"
              value={form.flyerEndDate}
              min={form.flyerStartDate || firstOfNextMonth()}
              onChange={(e) => update('flyerEndDate', e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Flyer size" required>
            <select
              value={form.flyerSize}
              onChange={(e) => update('flyerSize', e.target.value as '' | 'standard' | '8.5x11')}
              className={inputCls + ' bg-white'}
            >
              <option value="">Choose a size…</option>
              {FLYER_SIZES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </Field>
          <Field label="Number of pages" required>
            <select
              value={form.pageCount}
              onChange={(e) => updatePageCount(Number(e.target.value))}
              className={inputCls + ' bg-white'}
            >
              <option value={0}>How many pages?</option>
              {PAGE_COUNTS.map((n) => <option key={n} value={n}>{n} {n === 1 ? 'page' : 'pages'}</option>)}
            </select>
          </Field>
        </div>
        <ContinueRow
          complete={canContinue('dates', form)}
          incompleteHint="Fill all four fields above"
          onContinue={advance}
        />
      </StepCard>

      <StepCard
        id="marketing"
        title="3. Marketing channels & budgets"
        complete={form.printCanadaPost || form.printDigital || form.facebookAdsEnabled || indexOf(furthest) > indexOf('marketing')}
        locked={!isReachable('marketing')}
        active={currentStep === 'marketing'}
        summary={summarizeMarketing(form)}
        onToggle={() => goToStep('marketing')}
      >
        <p className="text-sm text-slate-600 mb-2">Optional. Pick the channels you want this flyer on, plus how many posters / price cards.</p>
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

        <Toggle checked={form.printDigital} onChange={(v) => update('printDigital', v)} label="Digital / in-store flyer" />

        <Toggle checked={form.facebookAdsEnabled} onChange={(v) => update('facebookAdsEnabled', v)} label="Facebook ads" />
        {form.facebookAdsEnabled && (
          <Field label="Facebook ads budget ($)" required>
            <input type="number" inputMode="decimal" min="0" step="0.01" value={form.facebookAdsBudget} onChange={(e) => update('facebookAdsBudget', e.target.value)} className={inputCls} />
          </Field>
        )}

        <div className="grid grid-cols-2 gap-3 mt-2">
          <Field label="Posters needed" hint="Leave blank if none">
            <input
              type="number" inputMode="numeric" min="0" step="1"
              value={form.postersRequested}
              onChange={(e) => update('postersRequested', e.target.value)}
              placeholder="0"
              className={inputCls}
            />
          </Field>
          <Field label="Price-card sets" hint="Leave blank if none">
            <input
              type="number" inputMode="numeric" min="0" step="1"
              value={form.priceCardsRequested}
              onChange={(e) => update('priceCardsRequested', e.target.value)}
              placeholder="0"
              className={inputCls}
            />
          </Field>
        </div>

        <Field label="In-store banner details" hint='e.g. "Proudly Canadian banner, plus a Paint banner"'>
          <textarea rows={3} value={form.bannerDetails} onChange={(e) => update('bannerDetails', e.target.value)} className={inputCls} />
        </Field>

        <ContinueRow
          complete={canContinue('marketing', form)}
          incompleteHint="Add the budget for the channels you picked"
          onContinue={advance}
        />
      </StepCard>

      <StepCard
        id="products"
        title="4. Products"
        complete={isProductsDone(form)}
        locked={!isReachable('products')}
        active={currentStep === 'products'}
        summary={isProductsDone(form) ? `${form.products.filter((p) => p.name.trim()).length} added` : null}
        onToggle={() => goToStep('products')}
      >
        {form.products.length === 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3 text-sm text-blue-900">
            <strong>Tip:</strong> tap "+ Add product" below, then tap the photo area to take a picture with your phone's camera. Fill in the name, price, and you're done.
          </div>
        )}
        {form.pageCount > 0 ? (
          <ProductsSection
            products={form.products}
            totalPages={form.pageCount}
            onChange={(next) => update('products', next)}
          />
        ) : (
          <p className="text-sm text-slate-500">Go back to step 2 and pick how many pages first.</p>
        )}
        <ContinueRow
          complete={canContinue('products', form)}
          incompleteHint="Add at least one product with a name"
          onContinue={advance}
        />
      </StepCard>

      <StepCard
        id="review"
        title="5. Review & submit"
        complete={false}
        locked={!isReachable('review')}
        active={currentStep === 'review'}
        summary={null}
        onToggle={() => goToStep('review')}
      >
        <p className="text-sm text-slate-600 mb-3">Looks good? Anything else you'd like to mention?</p>
        <Field label="General notes for head office (optional)">
          <textarea rows={3} value={form.generalNotes} onChange={(e) => update('generalNotes', e.target.value)} className={inputCls} placeholder="Anything else you'd like us to know?" />
        </Field>
        <Field label="Print / production notes (optional)">
          <textarea rows={2} value={form.printNotes} onChange={(e) => update('printNotes', e.target.value)} className={inputCls} />
        </Field>

        <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-1 mt-2">
          <div><span className="text-slate-500">Store:</span> <strong>{form.storeName}</strong></div>
          <div><span className="text-slate-500">Submitted by:</span> {form.submittedBy}</div>
          <div><span className="text-slate-500">Dates:</span> {form.flyerStartDate} → {form.flyerEndDate}</div>
          <div><span className="text-slate-500">Size:</span> {form.flyerSize} · {form.pageCount} pages</div>
          <div><span className="text-slate-500">Products:</span> {form.products.filter((p) => p.name.trim()).length}</div>
          {summarizeMarketing(form) && <div><span className="text-slate-500">Marketing:</span> {summarizeMarketing(form)}</div>}
        </div>

        <button
          type="button"
          onClick={() => submit.mutate()}
          disabled={submit.isPending || !canContinue('review', form)}
          className="w-full bg-brand-blue text-white font-bold rounded-lg py-4 mt-3 hover:bg-brand-blue-dark disabled:opacity-50 text-lg"
        >
          {submit.isPending ? 'Sending…' : 'Submit flyer'}
        </button>

        {submitError && (
          <div className="bg-red-50 border border-red-200 text-red-900 rounded-lg p-3 mt-3 text-sm whitespace-pre-line">
            <strong>Couldn't submit:</strong>{'\n'}{submitError}
          </div>
        )}
      </StepCard>

      <div className="text-center mt-6">
        <button
          type="button"
          onClick={() => {
            if (confirm('Clear everything and start over?')) {
              localStorage.removeItem(DRAFT_KEY);
              setForm(emptyForm());
              setFurthest('store');
              setCurrentStep('store');
              setSubmitError(null);
              window.scrollTo({ top: 0 });
            }
          }}
          className="text-sm text-slate-400 hover:text-brand-red"
        >
          Clear form and start over
        </button>
        <div className="text-xs text-slate-400 mt-1">Draft saved on this device</div>
      </div>
    </div>
  );
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

function emptyToNull(s: string | null | undefined): string | null {
  if (s === null || s === undefined) return null;
  const t = s.trim();
  return t.length > 0 ? t : null;
}

function formatHumanDate(iso: string): string {
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return iso;
  }
}

function StepCard({
  id, title, children, complete, locked, active, summary, onToggle,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
  complete: boolean;
  locked: boolean;
  active: boolean;
  summary: string | null;
  onToggle: () => void;
}) {
  // In wizard mode: open iff this is the active step. Header taps on collapsed
  // (completed) steps re-activate them. The active step header is decorative —
  // the only way forward is the Continue button inside.
  const open = active;

  return (
    <div
      id={`section-${id}`}
      className={
        'bg-white rounded-xl border mb-3 overflow-hidden scroll-mt-24 transition-opacity ' +
        (locked ? 'border-slate-200 opacity-50' : 'border-slate-200') +
        (active ? ' ring-2 ring-brand-blue/40' : '')
      }
    >
      <button
        type="button"
        onClick={() => { if (!locked && !active) onToggle(); }}
        disabled={locked || active}
        className={
          'w-full flex items-center justify-between gap-3 p-4 text-left ' +
          (locked ? 'cursor-not-allowed' : active ? 'cursor-default' : 'hover:bg-slate-50')
        }
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div
            className={
              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ' +
              (locked
                ? 'bg-slate-100 text-slate-300'
                : complete
                  ? 'bg-brand-blue text-white'
                  : active
                    ? 'bg-white border-2 border-brand-blue text-brand-blue'
                    : 'bg-slate-100 text-slate-400')
            }
          >
            {locked ? '🔒' : complete ? '✓' : ''}
          </div>
          <div className="min-w-0 flex-1">
            <div className={'font-semibold ' + (locked ? 'text-slate-400' : '')}>{title}</div>
            {!active && summary && <div className="text-xs text-slate-500 truncate mt-0.5">{summary}</div>}
            {locked && <div className="text-xs text-slate-400 mt-0.5">Complete the step above first</div>}
            {!active && !locked && complete && !summary && (
              <div className="text-xs text-brand-blue mt-0.5">Tap to edit</div>
            )}
          </div>
        </div>
        {!locked && !active && (
          <span className="text-brand-blue text-xs font-medium shrink-0">Edit</span>
        )}
      </button>
      {open && !locked && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  );
}

function ContinueRow({
  complete,
  incompleteHint,
  onContinue,
  onTapHint,
}: {
  complete: boolean;
  incompleteHint: string;
  onContinue: () => void;
  onTapHint?: () => void;
}) {
  return (
    <div className="pt-3 mt-1 border-t border-slate-100">
      {complete ? (
        <button
          type="button"
          onClick={onContinue}
          className="w-full bg-brand-blue text-white font-bold rounded-lg py-3.5 hover:bg-brand-blue-dark text-lg"
        >
          Continue →
        </button>
      ) : (
        <button
          type="button"
          onClick={() => onTapHint?.()}
          className="w-full bg-brand-red text-white font-bold rounded-lg py-3.5 hover:opacity-90 text-base"
        >
          {incompleteHint}
        </button>
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
