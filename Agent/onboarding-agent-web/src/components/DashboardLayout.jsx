import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const linkClass = ({ isActive }) =>
  `block rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-primary text-white shadow-md'
      : 'text-on-surface-variant hover:bg-surface-container'
  }`

export function DashboardLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const isAdmin = user?.role === 'ADMIN'

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="fixed flex h-full w-64 flex-col border-r border-outline-variant/30 bg-surface/90 backdrop-blur-xl p-5">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-primary">ElderCare</h1>
          <p className="text-xs text-on-surface-variant">Coordinator pipeline</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          <NavLink to="/" end className={linkClass}>
            Dashboard
          </NavLink>
          <NavLink to="/registrations" className={linkClass}>
            App registrations
          </NavLink>
          <NavLink to="/caregivers" className={linkClass}>
            Caregivers
          </NavLink>
          <NavLink to="/profile" className={linkClass}>
            Profile
          </NavLink>
          {isAdmin && (
            <>
              <div className="my-3 border-t border-outline-variant/40" />
              <p className="px-3 text-xs font-semibold text-secondary uppercase tracking-wide">
                Admin
              </p>
              <NavLink to="/admin" className={linkClass}>
                Overview
              </NavLink>
              <NavLink to="/admin/agents" className={linkClass}>
                Coordinators
              </NavLink>
              <NavLink to="/admin/users" className={linkClass}>
                Users
              </NavLink>
              <NavLink to="/admin/bookings" className={linkClass}>
                Bookings
              </NavLink>
              <NavLink to="/admin/caregivers" className={linkClass}>
                All caregivers
              </NavLink>
              <NavLink to="/admin/skills" className={linkClass}>
                Skills
              </NavLink>
            </>
          )}
        </nav>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-4 rounded-xl border border-outline-variant py-2.5 text-sm font-medium text-on-surface-variant hover:bg-surface-container"
        >
          Logout
        </button>
      </aside>
      <div className="ml-64 flex flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/40 bg-surface/80 px-8 py-4 backdrop-blur-xl shadow-[var(--shadow-card)]">
          <h2 className="text-lg font-semibold text-primary">Welcome, {user?.name}</h2>
          <span className="rounded-full bg-primary-fixed px-3 py-1 text-xs font-semibold text-primary">
            {user?.role}
          </span>
        </header>
        <main className="flex-1 overflow-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export const AdminLayout = DashboardLayout
