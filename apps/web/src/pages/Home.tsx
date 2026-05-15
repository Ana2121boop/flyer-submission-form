import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

type FlyerWindow = {
  id: number;
  label: string | null;
  flyerStartDate: string;
  flyerEndDate: string;
  submissionDeadline: string;
  flyerSize: string;
  pageCount: number;
};

export default function Home() {
  const navigate = useNavigate();
  const { data: windows, isLoading, isError } = useQuery({
    queryKey: ['flyer-windows'],
    queryFn: () => api<FlyerWindow[]>('/api/flyer-windows'),
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-1">Submit a flyer</h1>
      <p className="text-slate-600 mb-6">Pick the flyer window you're submitting for.</p>

      {isLoading && <p className="text-slate-500">Loading available windows…</p>}
      {isError && <p className="text-brand-red">Couldn't load flyer windows. Try again.</p>}

      {windows && windows.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-600">
          No open flyer windows right now. Check back later, or contact the head office.
        </div>
      )}

      <ul className="space-y-3">
        {windows?.map((w) => (
          <li key={w.id}>
            <button
              type="button"
              className="w-full text-left rounded-xl border-2 border-slate-200 bg-white p-4 hover:border-brand-blue active:bg-slate-50 transition-colors"
              onClick={() => navigate(`/submit/${w.id}`)}
            >
              <div className="font-semibold text-lg">{w.label ?? `Flyer ${w.flyerStartDate} – ${w.flyerEndDate}`}</div>
              <div className="text-sm text-slate-500 mt-1">
                {w.flyerSize} &middot; {w.pageCount} page{w.pageCount === 1 ? '' : 's'}
              </div>
              <div className="text-xs text-slate-400 mt-2">
                Submit by {new Date(w.submissionDeadline).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
