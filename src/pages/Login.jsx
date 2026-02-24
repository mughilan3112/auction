import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    setLoading(true)
    const { ok, data } = await api.login({ email, password })
    setLoading(false)
    if (ok) {
      localStorage.setItem('token', data.access_token)
      setMessage('Logged in!')
      navigate('/dashboard', { replace: true })
      window.dispatchEvent(new Event('storage'))
    } else {
      setMessage(data.detail || 'Login failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="flex w-full max-w-4xl glass-card !rounded-[2.5rem] border-white/5 overflow-hidden min-h-[550px] shadow-2xl relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/10 to-purple-600/10 blur-2xl opacity-50"></div>

        {/* Left Side - Visual Statement */}
        <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&q=80&w=2000"
            alt="The Exchange"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent flex flex-col justify-end p-12 space-y-3">
            <h2 className="text-3xl font-bold text-white leading-tight">PREMIUM<br />AUCTIONS.</h2>
            <div className="h-0.5 w-10 bg-indigo-500 rounded-full"></div>
            <p className="text-slate-400 text-[11px] font-medium tracking-wide">Buy and sell elite items with ease.</p>
          </div>
        </div>

        {/* Right Side - Form Suite */}
        <div className="w-full lg:w-1/2 p-10 lg:p-14 flex flex-col justify-center relative z-10 bg-slate-950/40 backdrop-blur-3xl">
          <div className="max-w-sm w-full mx-auto space-y-8">
            <header>
              <h1 className="text-4xl font-bold text-white tracking-tighter mb-1">LOGIN.</h1>
              <p className="text-slate-500 font-semibold uppercase tracking-[0.3em] text-[8px]">Welcome back to the auction</p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-5">
                <div className="relative group">
                  <label className="text-[8px] font-bold uppercase text-slate-500 tracking-widest block mb-1.5 px-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field !py-3 !px-5 !text-sm"
                    placeholder="Enter your email"
                    required
                  />
                </div>
                <div className="relative group">
                  <label className="text-[8px] font-bold uppercase text-slate-500 tracking-widest block mb-1.5 px-1">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field !py-3 !px-5 !text-sm"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              {message && (
                <div className={`p-3 rounded-2xl text-[9px] font-black uppercase text-center border-2 animate-float ${message.includes('Logged')
                  ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                  : 'bg-rose-500/5 border-rose-500/20 text-rose-400'
                  }`}>
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-4 text-[10px] font-bold tracking-[0.4em] uppercase shadow-indigo-500/20 shadow-xl active:scale-95"
              >
                {loading ? 'LOGGING IN...' : 'LOGIN NOW'}
              </button>
            </form>

            <footer className="text-center pt-2">
              <p className="text-[9px] font-semibold text-slate-500 tracking-widest uppercase mb-3">New user?</p>
              <Link to="/register" className="text-indigo-400 font-bold text-[10px] uppercase tracking-widest hover:text-indigo-300 transition-colors">
                Register Here →
              </Link>
            </footer>
          </div>
        </div>
      </div>
    </div>
  )
}


