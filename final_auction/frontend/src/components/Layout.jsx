import { Outlet, Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { api } from '../api'

export default function Layout() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const token = localStorage.getItem('token')

  useEffect(() => {
    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }
    api.getMe().then(({ ok, data }) => {
      setUser(ok ? data : null)
      setLoading(false)
    })
  }, [token])

  const handleLogout = () => {
    localStorage.removeItem('token')
    setUser(null)
    navigate('/')
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-brand-600 tracking-tight">
            Auction
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              to="/"
              className="text-slate-600 hover:text-brand-600 font-medium transition"
            >
              Auctions
            </Link>
            {loading ? (
              <span className="text-slate-400 text-sm">...</span>
            ) : user ? (
              <>
                <Link
                  to="/dashboard"
                  className="text-slate-600 hover:text-brand-600 font-medium transition"
                >
                  Dashboard
                </Link>
                {user.role === 'seller' && (
                  <Link
                    to="/create"
                    className="btn-primary text-sm"
                  >
                    Create Auction
                  </Link>
                )}
                <span className="text-slate-500 text-sm hidden sm:inline">
                  {user.name}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-slate-500 hover:text-red-600 text-sm font-medium"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-secondary text-sm">
                  Login
                </Link>
                <Link to="/register" className="btn-primary text-sm">
                  Register
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 py-4 text-center text-slate-500 text-sm">
        Auction App — React + FastAPI + MongoDB
      </footer>
    </div>
  )
}
