import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, getToken, ApiError } from '../lib/api';
import AdminShell from '../components/AdminShell';
import ConfirmDialog from '../components/ConfirmDialog';

type SubmissionRow = {
  id: number;
  submittedAt: string;
  storeName: string;
  submittedBy: string;
  productCount: number;
  deletedAt: string | null;
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showDeleted, setShowDeleted] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [confirmAction, setConfirmAction] = useState<'trash' | 'empty' | null>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['submissions', { showDeleted }],
    queryFn: () => api<SubmissionRow[]>(
      `/api/admin/submissions${showDeleted ? '?includeDeleted=true' : ''}`,
      { auth: true },
    ),
    enabled: !!getToken(),
  });

  useEffect(() => {
    if (error instanceof ApiError && error.status === 401) {
      navigate('/admin/login', { replace: true });
    }
  }, [error, navigate]);

  // Start fresh whenever the list switches between with and without the trash.
  useEffect(() => { setSelected(new Set()); }, [showDeleted]);

  // The trash view lists only what's in the trash.
  const rows = (data ?? []).filter((r) => !showDeleted || r.deletedAt);
  const chosen = rows.filter((r) => selected.has(r.id));
  const chosenLive = chosen.filter((r) => !r.deletedAt);
  const chosenTrashed = chosen.filter((r) => r.deletedAt);
  const trashedCount = rows.filter((r) => r.deletedAt).length;
  const allSelected = rows.length > 0 && chosen.length === rows.length;

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = chosen.length > 0 && !allSelected;
  }, [chosen.length, allSelected]);

  function toggle(id: number) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));
  }

  function done() {
    setSelected(new Set());
    qc.invalidateQueries({ queryKey: ['submissions'] });
  }
  const trashMany = useMutation({
    mutationFn: (ids: number[]) => Promise.all(ids.map((id) => api(`/api/admin/submission/${id}`, { method: 'DELETE', auth: true }))),
    onSettled: done,
  });
  const restoreMany = useMutation({
    mutationFn: (ids: number[]) => Promise.all(ids.map((id) => api(`/api/admin/submission/${id}/restore`, { method: 'POST', auth: true }))),
    onSettled: done,
  });
  const emptyTrash = useMutation({
    mutationFn: () => api('/api/admin/submissions/trash', { method: 'DELETE', auth: true }),
    onSettled: done,
  });
  const actionFailed = trashMany.isError || restoreMany.isError || emptyTrash.isError;

  return (
    <AdminShell title="Submissions">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 min-h-11">
        <div className="flex flex-wrap items-center gap-2">
          {chosen.length > 0 && (
            <>
              <span className="text-sm font-medium mr-1">{chosen.length} selected</span>
              {chosenLive.length > 0 && (
                <button
                  type="button"
                  onClick={() => setConfirmAction('trash')}
                  className="px-4 py-2 border border-slate-200 bg-white text-brand-red rounded-lg hover:border-brand-red"
                >
                  Move to trash
                </button>
              )}
              {chosenTrashed.length > 0 && (
                <button
                  type="button"
                  onClick={() => restoreMany.mutate(chosenTrashed.map((r) => r.id))}
                  disabled={restoreMany.isPending}
                  className="px-4 py-2 border border-slate-200 bg-white text-brand-blue rounded-lg hover:border-brand-blue disabled:opacity-50"
                >
                  {restoreMany.isPending ? 'Restoring…' : 'Restore'}
                </button>
              )}
              <button type="button" onClick={() => setSelected(new Set())} className="px-3 py-2 text-sm text-slate-500 hover:text-slate-800">
                Clear
              </button>
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {showDeleted && trashedCount > 0 && (
            <button
              type="button"
              onClick={() => setConfirmAction('empty')}
              className="px-4 py-2 border border-slate-200 bg-white text-brand-red rounded-lg hover:border-brand-red"
            >
              Empty trash
            </button>
          )}
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={showDeleted}
              onChange={(e) => setShowDeleted(e.target.checked)}
              className="w-5 h-5 accent-brand-blue"
            />
            <span>Show trash</span>
          </label>
        </div>
      </div>

      {actionFailed && <p className="text-brand-red text-sm mb-3">Something didn't go through. Please try again.</p>}
      {isLoading && <p className="text-slate-500">Loading…</p>}
      {isError && <p className="text-brand-red">Could not load submissions.</p>}

      {data && rows.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
          {showDeleted ? 'The trash is empty.' : 'No submissions yet.'}
        </div>
      )}

      {data && rows.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="pl-4 pr-1 py-3 w-10">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="Select all submissions"
                    className="w-5 h-5 accent-brand-blue align-middle cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3 font-medium">Store</th>
                <th className="px-4 py-3 font-medium">Submitted by</th>
                <th className="px-4 py-3 font-medium">Products</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className={
                    'border-t border-slate-100 cursor-pointer hover:bg-slate-50 ' +
                    (selected.has(row.id) ? 'bg-blue-50' : '')
                  }
                  onClick={() => navigate(`/admin/submissions/${row.id}`)}
                >
                  <td className="pl-4 pr-1 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(row.id)}
                      onChange={() => toggle(row.id)}
                      aria-label={`Select ${row.storeName}`}
                      className="w-5 h-5 accent-brand-blue align-middle cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3 font-medium">{row.storeName}</td>
                  <td className="px-4 py-3 text-slate-600">{row.submittedBy}</td>
                  <td className="px-4 py-3 text-slate-600">{row.productCount}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(row.submittedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/admin/submissions/${row.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-brand-blue text-sm hover:underline"
                    >
                      Open →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={confirmAction === 'trash'}
        title={`Move ${chosenLive.length === 1 ? 'this submission' : `${chosenLive.length} submissions`} to the trash?`}
        description={'You can restore them later from the "Show trash" filter.'}
        confirmLabel="Move to trash"
        confirmVariant="warning"
        pending={trashMany.isPending}
        onConfirm={() => { trashMany.mutate(chosenLive.map((r) => r.id)); setConfirmAction(null); }}
        onCancel={() => setConfirmAction(null)}
      />
      <ConfirmDialog
        open={confirmAction === 'empty'}
        title="Empty the trash?"
        description={`This deletes the ${trashedCount === 1 ? 'submission' : `${trashedCount} submissions`} in the trash for good.\nThis can't be undone.`}
        confirmLabel="Delete for good"
        confirmVariant="danger"
        pending={emptyTrash.isPending}
        onConfirm={() => { emptyTrash.mutate(); setConfirmAction(null); }}
        onCancel={() => setConfirmAction(null)}
      />
    </AdminShell>
  );
}
