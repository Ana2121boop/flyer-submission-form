import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, getToken, ApiError } from '../lib/api';
import AdminShell from '../components/AdminShell';

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
  const [showDeleted, setShowDeleted] = useState(false);

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

  return (
    <AdminShell title="Submissions">
      <div className="flex items-center justify-end mb-3">
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

      {isLoading && <p className="text-slate-500">Loading…</p>}
      {isError && <p className="text-brand-red">Could not load submissions.</p>}

      {data && data.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
          No submissions yet.
        </div>
      )}

      {data && data.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Store</th>
                <th className="px-4 py-3 font-medium">Submitted by</th>
                <th className="px-4 py-3 font-medium">Products</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr
                  key={row.id}
                  className={
                    'border-t border-slate-100 cursor-pointer hover:bg-slate-50 ' +
                    (row.deletedAt ? 'opacity-60' : '')
                  }
                  onClick={() => navigate(`/admin/submissions/${row.id}`)}
                >
                  <td className="px-4 py-3 font-medium">
                    {row.storeName}
                    {row.deletedAt && <span className="text-xs text-amber-700 ml-2">(trash)</span>}
                  </td>
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
    </AdminShell>
  );
}
