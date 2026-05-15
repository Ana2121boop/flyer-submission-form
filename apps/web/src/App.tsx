import { Route, Routes, Link, useLocation } from 'react-router-dom';
import SubmitForm from './pages/SubmitForm';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminSubmissionDetail from './pages/AdminSubmissionDetail';
import AdminCategories from './pages/AdminCategories';

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<SubmitForm />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/submissions/:id" element={<AdminSubmissionDetail />} />
          <Route path="/admin/categories" element={<AdminCategories />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

function Header() {
  const { pathname } = useLocation();
  const isAdminArea = pathname.startsWith('/admin');

  return (
    <header className="bg-brand-blue text-white shadow">
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
        <Link to={isAdminArea ? '/admin' : '/'} className="flex items-center gap-3">
          <img
            src="/windsor-logo.svg"
            alt="Windsor Plywood"
            className="h-10 w-auto"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
          <span className="text-xl font-bold tracking-tight">
            Windsor Plywood{isAdminArea && ' · Admin'}
          </span>
        </Link>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="bg-slate-100 text-slate-600 text-sm py-6 px-4 mt-12 border-t border-slate-200">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
        <div>
          <div className="font-medium text-slate-700">Windsor Plywood &middot; Flyer Submissions</div>
          <div className="text-xs text-slate-500 mt-1">Trouble with the form? Email{' '}
            <a className="text-brand-blue underline" href="mailto:advertising@windsorplywood.com">
              advertising@windsorplywood.com
            </a>
          </div>
        </div>
        <div className="text-xs text-slate-400">v2.0</div>
      </div>
    </footer>
  );
}

function NotFound() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 text-center">
      <h1 className="text-2xl font-bold mb-2">Page not found</h1>
      <Link to="/" className="text-brand-blue underline">Go home</Link>
    </div>
  );
}
