import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api, ApiError } from '../lib/api';

type FlyerWindow = {
  id: number;
  label: string | null;
  flyerStartDate: string;
  flyerEndDate: string;
  submissionDeadline: string;
  flyerSize: string;
  pageCount: number;
};

type Product = {
  // Phase 5: full product editor with image upload, multi-colour/dimension, block size auto-bump
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

type FormState = {
  storeName: string;
  submittedBy: string;
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

const DRAFT_KEY_PREFIX = 'flyer_draft_window_';

function emptyForm(): FormState {
  return {
    storeName: '',
    submittedBy: '',
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
  const { windowId } = useParams<{ windowId: string }>();
  const navigate = useNavigate();
  const draftKey = `${DRAFT_KEY_PREFIX}${windowId}`;

  const { data: window, isLoading } = useQuery({
    queryKey: ['flyer-window', windowId],
    queryFn: async () => {
      const all = await api<FlyerWindow[]>('/api/flyer-windows');
      return all.find((w) => w.id === Number(windowId)) ?? null;
    },
    enabled: !!windowId,
  });

  const [form, setForm] = useState<FormState>(() => {
    const saved = localStorage.getItem(draftKey);
    if (saved) {
      try { return { ...emptyForm(), ...JSON.parse(saved) }; } catch { /* ignore */ }
    }
    return emptyForm();
  });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedId, setSubmittedId] = useState<number | null>(null);

  // Autosave on every change
  useEffect(() => {
    localStorage.setItem(draftKey, JSON.stringify(form));
  }, [form, draftKey]);

  const submit = useMutation({
    mutationFn: async () => {
      if (!windowId) throw new Error('Missing flyer window');
      const body = {
        flyerWindowId: Number(windowId),
        storeName: form.storeName.trim(),
        submittedBy: form.submittedBy.trim(),
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
        products: form.products,
      };
      return api<{ submissionId: number }>('/api/submit', { method: 'POST', body });
    },
    onSuccess: (data) => {
      setSubmittedId(data.submissionId);
      localStorage.removeItem(draftKey);
    },
    onError: (err) => {
      setSubmitError(err instanceof ApiError ? err.message : 'Submission failed');
    },
  });

  if (isLoading) return <div className="max-w-3xl mx-auto px-4 py-6">Loading…</div>;
  if (!window) return (
    <div className="max-w-3xl mx-auto px-4 py-6 text-center">
      <p className="mb-4">This flyer window is closed or no longer available.</p>
      <button type="button" onClick={() => navigate('/')} className="text-brand-blue underline">Back to home</button>
    </div>
  );

  if (submittedId !== null) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <div className="text-6xl mb-4">✓</div>
        <h1 className="text-2xl font-bold mb-2">Submission received!</h1>
        <p className="text-slate-600 mb-1">Submission ID: <span className="font-mono">{submittedId}</span></p>
        <p className="text-slate-600 mb-6">Head office has it. You can close this page.</p>
        <button
          type="button"
          onClick={() => { setSubmittedId(null); setForm(emptyForm()); navigate('/'); }}
          className="bg-brand-blue text-white font-semibold rounded-lg px-6 py-3 hover:bg-brand-blue-dark"
        >
          Done
        </button>
      </div>
    );
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-4 sm:py-6 pb-32">
      {/* Selected window banner */}
      <div className="bg-brand-blue/10 border border-brand-blue/30 rounded-xl p-3 mb-4 text-sm">
        <div className="font-medium text-brand-blue">
          {window.label ?? `Flyer ${window.flyerStartDate} – ${window.flyerEndDate}`}
        </div>
        <div className="text-slate-600 text-xs mt-1">
          {window.flyerSize} · {window.pageCount} {window.pageCount === 1 ? 'page' : 'pages'} ·
          {' '}submit by {new Date(window.submissionDeadline).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
        </div>
      </div>

      {/* Section 1: Store info */}
      <Section title="1. Your store" defaultOpen>
        <Field label="Store name" required>
          <input type="text" value={form.storeName} onChange={(e) => update('storeName', e.target.value)} className={inputCls} />
        </Field>
        <Field label="Your name" required>
          <input type="text" value={form.submittedBy} onChange={(e) => update('submittedBy', e.target.value)} className={inputCls} />
        </Field>
        <Field label="Theme / title (optional)" hint='e.g. "Black Friday", "Spring DIY Sale"'>
          <input type="text" value={form.theme} onChange={(e) => update('theme', e.target.value)} className={inputCls} />
        </Field>
      </Section>

      {/* Section 2: Marketing channels */}
      <Section title="2. Marketing channels & budgets" defaultOpen>
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

      {/* Section 3: Products — placeholder for next commit */}
      <Section title="3. Products" defaultOpen>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900">
          <strong>Products editor coming in the next deploy.</strong> You'll be able to add products with photos, multiple colours/dimensions (+ button), category dropdown, price + unit, and block size 1–3 (auto-bumped when many options are added).
        </div>
      </Section>

      {/* Section 4: Notes */}
      <Section title="4. Anything else?">
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

      {/* Sticky submit bar — always reachable on mobile */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-3 z-20 shadow-lg">
        <div className="max-w-3xl mx-auto flex gap-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-4 py-3 rounded-lg border border-slate-200 text-slate-700"
          >
            Cancel
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
