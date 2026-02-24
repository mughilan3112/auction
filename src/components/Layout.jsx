import { Outlet, Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { api } from '../api'
import NotificationCenter from './NotificationCenter'


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
    <div className="min-h-screen flex flex-col selection:bg-indigo-500/30">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#030712]/80 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link to="/" className="text-xl gradient-text tracking-tighter hover:opacity-80 transition-opacity">
            AUCTION.
          </Link>
          <nav className="flex items-center gap-5">
            <Link
              to="/"
              className="text-slate-400 hover:text-white font-semibold text-[11px] uppercase tracking-wider transition-all"
            >
              Discover
            </Link>
            {loading ? (
              <span className="text-slate-600">
                <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              </span>
            ) : user ? (
              <>
                <Link
                  to="/dashboard"
                  className="text-slate-400 hover:text-white font-semibold text-[11px] uppercase tracking-wider transition-all"
                >
                  Dashboard
                </Link>
                { /* Show control for all users but enable only for sellers */ }
                {user.role === 'seller' ? (
                  <Link
                    to="/create"
                    className="btn-primary py-2 text-[10px] uppercase tracking-widest"
                  >
                    Post Auction
                  </Link>
                ) : (
                  <button
                    type="button"
                    disabled
                    title="Only sellers can post auctions"
                    className="btn-primary py-2 text-[10px] uppercase tracking-widest opacity-50 cursor-not-allowed"
                  >
                    Post Auction
                  </button>
                )}
                <NotificationCenter />
                <div className="h-6 w-[1px] bg-slate-800 mx-1 hidden sm:block"></div>
                <span className="text-slate-300 text-xs font-semibold hidden sm:inline">
                  {user.name}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-slate-500 hover:text-red-400 text-[9px] font-bold uppercase tracking-widest transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <div className="flex items-center gap-4">
                <Link to="/login" className="text-slate-400 hover:text-white text-[11px] font-semibold uppercase tracking-wider">
                  Login
                </Link>
                <Link to="/register" className="btn-primary py-2 px-6 text-[10px] uppercase tracking-widest">
                  Join Now
                </Link>
              </div>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8">
        <Outlet />
      </main>
      <footer className="border-t border-white/5 py-8 text-center bg-[#030712]/50 backdrop-blur-sm">
        <p className="text-slate-600 text-[10px] font-bold uppercase tracking-[0.3em]">
          Auction System — 2026
        </p>
      </footer>
    </div>
  )
}

