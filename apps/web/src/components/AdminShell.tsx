import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { clearToken, getToken } from '../lib/api';

const tabs = [
  { to: '/admin', label: 'Submissions' },
  { to: '/admin/windows', label: 'Flyer windows' },
  { to: '/admin/categories', label: 'Categories' },
];

export default function AdminShell({ children, title }: { children: React.ReactNode; title: string }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    if (!getToken()) navigate('/admin/login', { replace: true });
  }, [navigate]);

  function logout() {
    clearToken();
    navigate('/admin/login', { replace: true });
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{title}</h1>
        <button
          type="button"
          onClick={logout}
          className="text-sm text-slate-600 hover:text-brand-red"
        >
          Log out
        </button>
      </div>

      <nav className="flex gap-2 mb-6 overflow-x-auto -mx-4 px-4">
        {tabs.map((tab) => {
          const active = pathname === tab.to || (tab.to !== '/admin' && pathname.startsWith(tab.to));
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={
                'px-3 py-2 rounded-lg text-sm whitespace-nowrap ' +
                (active
                  ? 'bg-brand-blue text-white'
                  : 'bg-white border border-slate-200 hover:border-brand-blue')
              }
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {children}
    </div>
  );
}
