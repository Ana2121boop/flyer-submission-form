import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, getToken, clearToken, ApiError } from '../lib/api';

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

  useEffect(() => {
    if (!getToken()) navigate('/admin/login', { replace: true });
  }, [navigate]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['submissions'],
    queryFn: () => api<SubmissionRow[]>('/api/admin/submissions', { auth: true }),
    enabled: !!getToken(),
  });

  useEffect(() => {
    if (error instanceof ApiError && error.status === 401) {
      navigate('/admin/login', { replace: true });
    }
  }, [error, navigate]);

  function logout() {
    clearToken();
    navigate('/admin/login', { replace: true });
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Submissions</h1>
        <button
          type="button"
          onClick={logout}
          className="text-sm text-slate-600 hover:text-brand-red"
        >
          Log out
        </button>
      </div>

      <nav className="flex gap-2 mb-6 overflow-x-auto">
        <Link to="/admin" className="px-3 py-2 bg-brand-blue text-white rounded-lg text-sm whitespace-nowrap">
          Submissions
        </Link>
        <Link to="/admin/windows" className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm whitespace-nowrap hover:border-brand-blue">
          Flyer windows
        </Link>
        <Link to="/admin/categories" className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm whitespace-nowrap hover:border-brand-blue">
          Categories
        </Link>
      </nav>

      {isLoading && <p className="text-slate-500">Loading…</p>}
      {isError && <p className="text-brand-red">Could not load submissions.</p>}

      {data && data.length === 0 && (
        <p className="text-slate-500 text-center py-8">No submissions yet.</p>
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
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{row.storeName}</td>
                  <td className="px-4 py-3 text-slate-600">{row.submittedBy}</td>
                  <td className="px-4 py-3 text-slate-600">{row.productCount}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(row.submittedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
