import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    setLoading(true)
    const { ok, data } = await api.register({ name, email, password })
    setLoading(false)
    if (ok) {
      setMessage('Account created! Please log in.')
      navigate('/login', { replace: true })
    } else {
      setMessage(data.detail || 'Registration failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="flex w-full max-w-4xl glass-card !rounded-[2.5rem] border-white/5 overflow-hidden min-h-[600px] shadow-2xl relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/10 to-indigo-600/10 blur-2xl opacity-50"></div>

        {/* Left Side - Visual Statement */}
        <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&q=80&w=2000"
            alt="Asset Verification"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent flex flex-col justify-end p-12 space-y-3">
            <h2 className="text-3xl font-bold text-white leading-tight">JOIN THE<br />COMMUNITY.</h2>
            <div className="h-0.5 w-10 bg-purple-500 rounded-full"></div>
            <p className="text-slate-400 text-[11px] font-medium tracking-wide">Create your account to start bidding on amazing items.</p>
          </div>
        </div>

        {/* Right Side - Form Suite */}
        <div className="w-full lg:w-1/2 p-10 lg:p-14 flex flex-col justify-center relative z-10 bg-slate-950/40 backdrop-blur-3xl">
          <div className="max-w-sm w-full mx-auto space-y-8">
            <header>
              <h1 className="text-4xl font-bold text-white tracking-tighter mb-1">REGISTER.</h1>
              <p className="text-slate-500 font-semibold uppercase tracking-[0.3em] text-[8px]">Create your free account today</p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-4">
                <div className="relative group">
                  <label className="text-[8px] font-bold uppercase text-slate-500 tracking-widest block mb-1.5 px-1">Your Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input-field !py-3 !px-5 !text-sm"
                    placeholder="Enter your name"
                    required
                  />
                </div>
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
                <div className={`p-3 rounded-2xl text-[9px] font-black uppercase text-center border-2 animate-float ${message.includes('created')
                  ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                  : 'bg-rose-500/5 border-rose-500/20 text-rose-400'
                  }`}>
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-4 text-[10px] font-bold tracking-[0.4em] uppercase shadow-purple-500/20 shadow-xl active:scale-95"
              >
                {loading ? 'REGISTERING...' : 'REGISTER NOW'}
              </button>
            </form>

            <footer className="text-center pt-2">
              <p className="text-[9px] font-semibold text-slate-500 tracking-widest uppercase mb-3">Already have an account?</p>
              <Link to="/login" className="text-purple-400 font-bold text-[10px] uppercase tracking-widest hover:text-purple-300 transition-colors">
                Login Here →
              </Link>
            </footer>
          </div>
        </div>
      </div>
    </div>
  )
}



