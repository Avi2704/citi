import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export const DashboardLayout = () => {
  const { profile, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="flex items-center justify-between border-b bg-white p-4">
        <div>
          <h1 className="text-lg font-semibold text-emerald-700">WasteFlow AI</h1>
          <p className="text-sm text-slate-500">{profile?.role}</p>
        </div>
        <button className="rounded bg-slate-900 px-3 py-1 text-white" onClick={() => void logout()}>
          Logout
        </button>
      </header>
      <main className="mx-auto max-w-5xl p-4">
        <nav className="mb-4 flex flex-wrap gap-3 text-sm">
          <Link to="/citizen/dashboard">Citizen</Link>
          <Link to="/admin/dashboard">Admin</Link>
          <Link to="/staff/dashboard">Staff</Link>
        </nav>
        <Outlet />
      </main>
    </div>
  );
};
