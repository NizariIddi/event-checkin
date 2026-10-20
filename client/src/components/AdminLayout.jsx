import { Link, useNavigate } from 'react-router-dom';
import { adminSession } from '../api.js';

export default function AdminLayout({ children, back }) {
  const nav = useNavigate();
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white print:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/admin" className="flex items-center gap-2 font-bold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-white">✓</span> Event Check-in
          </Link>
          <button className="btn btn-secondary" onClick={() => { adminSession.clear(); nav('/admin/login'); }}>Log out</button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        {back && <Link to={back.to} className="mb-3 inline-block text-sm font-medium text-indigo-600 hover:underline">← {back.label}</Link>}
        {children}
      </main>
    </div>
  );
}
