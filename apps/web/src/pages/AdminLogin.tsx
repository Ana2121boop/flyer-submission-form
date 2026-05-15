import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setToken, ApiError } from '../lib/api';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const { token } = await api<{ token: string }>('/api/admin/login', {
        method: 'POST',
        body: { username, password },
      });
      setToken(token);
      navigate('/admin');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-6 text-center">Admin login</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block">
          <span className="block text-sm font-medium mb-1">Username</span>
          <input
            type="text"
            autoComplete="username"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/30 outline-none"
          />
        </label>
        <label className="block">
          <span className="block text-sm font-medium mb-1">Password</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/30 outline-none"
          />
        </label>
        {error && <p className="text-brand-red text-sm">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="w-full bg-brand-blue text-white font-semibold rounded-lg py-3 hover:bg-brand-blue-dark disabled:opacity-50 transition-colors"
        >
          {pending ? 'Logging in…' : 'Log in'}
        </button>
      </form>
    </div>
  );
}
