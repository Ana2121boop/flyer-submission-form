import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../lib/api';
import AdminShell from '../components/AdminShell';

type Category = {
  id: number;
  name: string;
  isActive: boolean;
};

export default function AdminCategories() {
  const qc = useQueryClient();
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: categories, isLoading } = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: () => api<Category[]>('/api/admin/categories', { auth: true }),
  });

  const create = useMutation({
    mutationFn: () => api('/api/admin/categories', {
      method: 'POST',
      auth: true,
      body: { name: newName.trim(), isActive: true },
    }),
    onSuccess: () => {
      setNewName('');
      setError(null);
      qc.invalidateQueries({ queryKey: ['admin', 'categories'] });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Failed to create'),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      api(`/api/admin/categories/${id}`, { method: 'PATCH', auth: true, body: { isActive } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'categories'] }),
  });

  const remove = useMutation({
    mutationFn: (id: number) => api(`/api/admin/categories/${id}`, { method: 'DELETE', auth: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'categories'] }),
  });

  return (
    <AdminShell title="Product categories">
      <p className="text-sm text-slate-600 mb-4">
        Categories shown to stores when adding products. Deactivate one to hide it without losing data.
      </p>

      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New category name (e.g. Paint, Flooring, Lighting)"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newName.trim()) create.mutate();
            }}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-blue outline-none"
          />
          <button
            type="button"
            onClick={() => create.mutate()}
            disabled={create.isPending || !newName.trim()}
            className="bg-brand-blue text-white font-medium px-4 py-2 rounded-lg hover:bg-brand-blue-dark disabled:opacity-50"
          >
            Add
          </button>
        </div>
        {error && <p className="text-brand-red text-sm mt-2">{error}</p>}
      </div>

      {isLoading && <p className="text-slate-500">Loading…</p>}

      {categories && categories.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
          No categories yet. Add a few above to get started.
        </div>
      )}

      <div className="space-y-2">
        {categories?.map((c) => (
          <div key={c.id} className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center gap-3">
            <div className={'flex-1 ' + (c.isActive ? '' : 'text-slate-400 line-through')}>{c.name}</div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={c.isActive}
                onChange={(e) => toggleActive.mutate({ id: c.id, isActive: e.target.checked })}
                className="w-5 h-5 accent-brand-blue"
              />
              <span>Active</span>
            </label>
            <button
              type="button"
              onClick={() => {
                if (confirm(`Delete "${c.name}"? Existing submissions keep their data, but this category can't be picked again.`)) {
                  remove.mutate(c.id);
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
