import { Route, Routes, Link } from 'react-router-dom';
import Home from './pages/Home';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminFlyerWindows from './pages/AdminFlyerWindows';
import AdminCategories from './pages/AdminCategories';

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/windows" element={<AdminFlyerWindows />} />
          <Route path="/admin/categories" element={<AdminCategories />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="bg-brand-blue text-white shadow">
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-3">
          {/* Drop windsor-logo.svg or .png into apps/web/public/ and the <img> below will pick it up.
              Falls back to text wordmark if the asset is missing. */}
          <img
            src="/windsor-logo.svg"
            alt="Windsor Plywood"
            className="h-10 w-auto"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
          <span className="text-xl font-bold tracking-tight">Windsor Plywood</span>
        </Link>
        <Link
          to="/admin"
          className="text-sm opacity-80 hover:opacity-100 px-3 py-2 rounded"
        >
          Admin
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
