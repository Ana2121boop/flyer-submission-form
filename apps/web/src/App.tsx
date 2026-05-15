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
    <header className="bg-brand-blue text-white sticky top-0 z-10 shadow">
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold tracking-tight">Windsor Flyers</Link>
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
    <footer className="bg-slate-100 text-slate-500 text-xs text-center py-4 px-4">
      Windsor Plywood Flyer Submission &middot; v2.0
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
