import { Link, NavLink, Outlet } from 'react-router-dom';

function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `px-4 py-2 rounded-full text-sm transition-colors ${
          isActive ? 'bg-brand-600 text-white' : 'text-gray-700 hover:bg-gray-100'
        }`
      }
    >
      {label}
    </NavLink>
  );
}

export default function App() {
  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-10 bg-white/70 backdrop-blur border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
          <Link to="/" className="font-semibold text-lg text-brand-700">Monitor Console</Link>
          <nav className="flex gap-2">
            <NavItem to="/" label="Dashboard" />
            <NavItem to="/errors" label="Errors" />
            <NavItem to="/stats" label="Stats" />
            <NavItem to="/test" label="Test" />
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6">
        <Outlet />
      </main>
    </div>
  );
}
