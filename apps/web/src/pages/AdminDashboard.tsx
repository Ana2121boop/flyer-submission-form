import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

  return (
    <AdminShell title="Submissions">
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
    </AdminShell>
  );
}
