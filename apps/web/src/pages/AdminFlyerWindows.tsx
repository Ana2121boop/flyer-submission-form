import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../lib/api';
import AdminShell from '../components/AdminShell';

type FlyerWindow = {
  id: number;
  label: string | null;
  flyerStartDate: string;
  flyerEndDate: string;
  submissionDeadline: string;
  flyerSize: string;
  pageCount: number;
  isOpen: boolean;
  createdAt: string;
};

const FLYER_SIZES = ['standard', '8.5x11'] as const;
const PAGE_COUNTS = [1, 2, 4, 6, 8, 10, 12] as const;

export default function AdminFlyerWindows() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<FlyerWindow | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: windows, isLoading } = useQuery({
    queryKey: ['admin', 'flyer-windows'],
    queryFn: () => api<FlyerWindow[]>('/api/admin/flyer-windows', { auth: true }),
  });

  const remove = useMutation({
    mutationFn: (id: number) => api(`/api/admin/flyer-windows/${id}`, { method: 'DELETE', auth: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'flyer-windows'] }),
  });

  const toggleOpen = useMutation({
    mutationFn: ({ id, isOpen }: { id: number; isOpen: boolean }) =>
      api(`/api/admin/flyer-windows/${id}`, { method: 'PATCH', auth: true, body: { isOpen } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'flyer-windows'] }),
  });

  return (
    <AdminShell title="Flyer windows">
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-slate-600">
          Windows control which flyer dates stores can submit for.
        </p>
        <button
          type="button"
          onClick={() => { setCreating(true); setEditing(null); }}
          className="bg-brand-blue text-white font-medium px-4 py-2 rounded-lg hover:bg-brand-blue-dark"
        >
          + New window
        </button>
      </div>

      {(creating || editing) && (
        <WindowForm
          initial={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
            qc.invalidateQueries({ queryKey: ['admin', 'flyer-windows'] });
          }}
        />
      )}

      {isLoading && <p className="text-slate-500">Loading…</p>}

      {windows && windows.length === 0 && !creating && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
          No flyer windows yet. Click "New window" to create one.
        </div>
      )}

      <div className="space-y-3">
        {windows?.map((w) => (
          <div key={w.id} className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="font-semibold">{w.label ?? `${w.flyerStartDate} – ${w.flyerEndDate}`}</div>
              <div className="text-sm text-slate-600 mt-1">
                {w.flyerSize} &middot; {w.pageCount} page{w.pageCount === 1 ? '' : 's'} &middot;
                {' '}deadline {new Date(w.submissionDeadline).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={w.isOpen}
                onChange={(e) => toggleOpen.mutate({ id: w.id, isOpen: e.target.checked })}
                className="w-5 h-5 accent-brand-blue"
              />
              <span className={w.isOpen ? 'text-brand-blue font-medium' : 'text-slate-500'}>
                {w.isOpen ? 'Open' : 'Closed'}
              </span>
            </label>

            <button
              type="button"
              onClick={() => { setEditing(w); setCreating(false); }}
              className="text-sm px-3 py-2 border border-slate-200 rounded-lg hover:border-brand-blue"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm(`Delete window "${w.label ?? w.id}"? This cannot be undone.`)) {
                  remove.mutate(w.id);
                }
              }}
              className="text-sm px-3 py-2 border border-slate-200 text-brand-red rounded-lg hover:border-brand-red"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}

function WindowForm({
  initial,
  onClose,
  onSaved,
}: {
  initial: FlyerWindow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!initial;
  const [label, setLabel] = useState(initial?.label ?? '');
  const [flyerStartDate, setFlyerStartDate] = useState(initial?.flyerStartDate ?? defaultStartDate());
  const [flyerEndDate, setFlyerEndDate] = useState(initial?.flyerEndDate ?? defaultEndDate());
  const [submissionDeadline, setSubmissionDeadline] = useState(
    initial ? toLocalDatetime(initial.submissionDeadline) : defaultDeadline(),
  );
  const [flyerSize, setFlyerSize] = useState<typeof FLYER_SIZES[number]>(
    (initial?.flyerSize as typeof FLYER_SIZES[number]) ?? 'standard',
  );
  const [pageCount, setPageCount] = useState<number>(initial?.pageCount ?? 4);
  const [isOpen, setIsOpen] = useState(initial?.isOpen ?? true);
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: async () => {
      const body = {
        label: label.trim() || null,
        flyerStartDate,
        flyerEndDate,
        submissionDeadline: new Date(submissionDeadline).toISOString(),
        flyerSize,
        pageCount,
        isOpen,
      };
      if (isEdit) {
        return api(`/api/admin/flyer-windows/${initial!.id}`, { method: 'PATCH', auth: true, body });
      }
      return api('/api/admin/flyer-windows', { method: 'POST', auth: true, body });
    },
    onSuccess: () => onSaved(),
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Save failed');
    },
  });

  return (
    <div className="bg-white border-2 border-brand-blue rounded-xl p-4 mb-4">
      <h2 className="font-bold mb-4">{isEdit ? 'Edit window' : 'New flyer window'}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Label (optional)">
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. June 2026"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-blue outline-none"
          />
        </Field>
        <Field label="Flyer size">
          <select
            value={flyerSize}
            onChange={(e) => setFlyerSize(e.target.value as typeof FLYER_SIZES[number])}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-blue outline-none bg-white"
          >
            <option value="standard">Standard</option>
            <option value="8.5x11">8.5" × 11" (Canada Post)</option>
          </select>
        </Field>
        <Field label="Flyer start date">
          <input
            type="date"
            value={flyerStartDate}
            onChange={(e) => setFlyerStartDate(e.target.value)}
            min={defaultStartDate()}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-blue outline-none"
          />
          <p className="text-xs text-slate-500 mt-1">Must be the first of next month or later</p>
        </Field>
        <Field label="Flyer end date">
          <input
            type="date"
            value={flyerEndDate}
            onChange={(e) => setFlyerEndDate(e.target.value)}
            min={flyerStartDate}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-blue outline-none"
          />
        </Field>
        <Field label="Submission deadline">
          <input
            type="datetime-local"
            value={submissionDeadline}
            onChange={(e) => setSubmissionDeadline(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-blue outline-none"
          />
        </Field>
        <Field label="Page count">
          <select
            value={pageCount}
            onChange={(e) => setPageCount(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-blue outline-none bg-white"
          >
            {PAGE_COUNTS.map((n) => (
              <option key={n} value={n}>{n} {n === 1 ? 'page' : 'pages'}</option>
            ))}
          </select>
        </Field>
      </div>

      <label className="flex items-center gap-2 mt-4 cursor-pointer">
        <input
          type="checkbox"
          checked={isOpen}
          onChange={(e) => setIsOpen(e.target.checked)}
          className="w-5 h-5 accent-brand-blue"
        />
        <span>Open for submissions</span>
      </label>

      {error && <p className="text-brand-red text-sm mt-3">{error}</p>}

      <div className="flex gap-3 mt-4">
        <button
          type="button"
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="bg-brand-blue text-white font-medium px-5 py-2 rounded-lg hover:bg-brand-blue-dark disabled:opacity-50"
        >
          {save.isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Create window'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-2 border border-slate-200 rounded-lg hover:border-slate-400"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium mb-1">{label}</span>
      {children}
    </label>
  );
}

function defaultStartDate(): string {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return next.toISOString().slice(0, 10);
}

function defaultEndDate(): string {
  const start = new Date(defaultStartDate());
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 13);
  return end.toISOString().slice(0, 10);
}

function defaultDeadline(): string {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  d.setHours(17, 0, 0, 0);
  return toLocalDatetime(d.toISOString());
}

function toLocalDatetime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
