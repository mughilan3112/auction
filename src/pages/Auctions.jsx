import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'

function formatDateTime(iso) {
  if (!iso) return { date: '—', time: '—' }
  const d = new Date(iso)
  return {
    date: d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    }),
    time: d.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }
}


export default function Auctions() {
  const [auctions, setAuctions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [now, setNow] = useState(new Date())
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [sortBy, setSortBy] = useState('newest')
  const [user, setUser] = useState(null)
  const token = localStorage.getItem('token')

  const categories = ["All", "Electronics", "Automotive", "Fashion", "Collectibles", "Real Estate", "Home & Garden", "Art", "Others"]


  const sortOptions = [
    { label: 'Newest First', value: 'newest' },
    { label: 'Oldest First', value: 'oldest' },
    { label: 'Price: Low to High', value: 'price_asc' },
    { label: 'Price: High to Low', value: 'price_desc' },
  ]



  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (token) {
      api.getMe().then(({ ok, data }) => {
        if (ok) setUser(data)
      })
    }
  }, [token])

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setLoading(true)
      api.listAuctions(searchQuery, [selectedCategory], [sortBy]).then(({ ok, data }) => {
        setLoading(false)
        if (ok) setAuctions(data)
        else setError('Failed to load auctions')
      })
    }, 500)

    return () => clearTimeout(delayDebounceFn)
  }, [searchQuery, selectedCategory, sortBy])


  if (error) {
    return (
      <div className="text-center py-12 text-red-600">
        {error}
      </div>
    )
  }

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 py-8 px-6 glass-card border-white/10">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold gradient-text tracking-tighter">AUCTIONS.</h1>
          <p className="text-slate-400 font-medium text-[11px] tracking-wide uppercase">Best Deals. Live Bidding.</p>
        </div>


        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 flex-1 max-w-4xl lg:justify-end">
          {/* Search Input */}
          <div className="relative flex-1 max-w-sm group">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors text-xs">🔍</span>
            <input
              type="text"
              placeholder="Search auctions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-900/80 border border-slate-800 rounded-2xl outline-none focus:border-indigo-500/50 focus:bg-slate-900 transition-all text-xs font-semibold text-white placeholder:text-slate-600 shadow-2xl"
            />
            {loading && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>

          {/* Category Dropdown */}
          <div className="relative min-w-[150px]">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] opacity-50">📂</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full pl-9 pr-8 py-3 bg-slate-900/80 border border-slate-800 rounded-2xl outline-none focus:border-indigo-500 text-[10px] font-bold uppercase tracking-widest text-slate-300 appearance-none cursor-pointer hover:bg-slate-800 transition-all"
            >
              {categories.map(cat => (
                <option key={cat} value={cat} className="bg-slate-900">{cat}</option>
              ))}
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-600 text-[8px]">▼</span>
          </div>

          {/* Sort Dropdown */}
          <div className="relative min-w-[170px]">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] opacity-50">↕️</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full pl-9 pr-8 py-3 bg-slate-900/80 border border-slate-800 rounded-2xl outline-none focus:border-indigo-500 text-[10px] font-bold uppercase tracking-widest text-slate-300 appearance-none cursor-pointer hover:bg-slate-800 transition-all"
            >
              {sortOptions.map(opt => (
                <option key={opt.value} value={opt.value} className="bg-slate-900">{opt.label}</option>
              ))}
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-600 text-[8px]">▼</span>
          </div>
        </div>
      </div>

      {/* Conditional Welcome Banner */}
      {user ? (
        <div className="px-8 py-10 glass-card border-indigo-500/20 bg-indigo-500/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-12 opacity-10 text-9xl rotate-12 transition-transform group-hover:rotate-0 duration-1000">💎</div>
          <div className="relative z-10">
            <h2 className="text-3xl font-bold text-white mb-2 tracking-tighter">Welcome back, {user.name.split(' ')[0]}.</h2>
            <p className="text-indigo-300 font-semibold uppercase tracking-widest text-[10px] mb-6">Your authorization is verified. Elite assets are ready for your inspection.</p>
            <div className="flex gap-4">
              <Link to="/dashboard" className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-500 transition-all">
                Personal Console
              </Link>
              <div className="px-6 py-2 border border-white/10 text-slate-400 rounded-xl text-[10px] font-bold uppercase tracking-widest">
                Status: Operational
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="px-8 py-12 glass-card border-white/5 bg-slate-950/40 relative overflow-hidden text-center">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-500/10 via-transparent to-purple-500/10"></div>
          <div className="relative z-10 space-y-6">
            <h2 className="text-4xl font-bold text-white tracking-tighter max-w-2xl mx-auto">Start Bidding on Live Auctions.</h2>
            <p className="text-slate-500 font-medium text-sm max-w-xl mx-auto">Join thousands of buyers and sellers. Buy and sell your items today with secure payments and verified users.</p>
            <div className="flex justify-center gap-4 pt-4">
              <Link to="/register" className="btn-primary !px-10 !py-4 text-[11px] tracking-[0.2em]">
                Register Now
              </Link>
              <Link to="/login" className="btn-secondary !px-10 !py-4 text-[11px] tracking-[0.2em]">
                Login
              </Link>
            </div>
          </div>
        </div>
      )}





      {auctions.length === 0 && !loading ? (
        <div className="glass-card py-24 text-center border-dashed border-slate-800">
          <p className="text-xl font-bold text-slate-700 uppercase tracking-widest">
            {searchQuery ? `Item not found` : 'No auctions available.'}
          </p>
          <p className="text-indigo-400/50 text-[10px] mt-2 font-medium uppercase tracking-tighter">Try searching for something else.</p>
        </div>
      ) : (


        <div className="grid gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {auctions.map((a, index) => {
            const auctionStartTime = new Date(a.start_time)
            const auctionEndTime = new Date(a.end_time)
            const isPending = auctionStartTime > now
            const isEnded = auctionEndTime <= now

            let statusLabel = a.status
            let statusColor = 'from-slate-600 to-slate-800'

            if (isPending) {
              statusLabel = 'Starting Soon'
              statusColor = 'from-indigo-600 to-blue-600'
            } else if (isEnded) {
              statusLabel = 'Finished'
              statusColor = 'from-slate-800 to-slate-950'
            } else {
              statusLabel = 'Live Now'
              statusColor = 'from-emerald-500 to-teal-600'
            }

            return (
              <Link
                key={a.id}
                to={`/auctions/${a.id}`}
                className="group relative glass-card !rounded-[2rem] border-white/5 hover:border-indigo-500/30 hover:shadow-[0_0_40px_rgba(99,102,241,0.1)] transition-all duration-500 block animate-float"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="h-48 overflow-hidden relative">
                  {a.image_path ? (
                    <img
                      src={`${API_BASE}${a.image_path}`}
                      alt={a.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-900/50 text-slate-700">
                      <span className="text-4xl font-black">?</span>
                    </div>
                  )}
                  <div className="absolute top-4 left-4 flex gap-1.5">
                    <span className={`px-3 py-1 rounded-full text-[8px] font-bold uppercase tracking-[0.2em] shadow-xl text-white bg-gradient-to-br ${statusColor}`}>
                      {statusLabel}
                    </span>
                    <span className="px-3 py-1 rounded-full text-[8px] font-bold uppercase tracking-[0.2em] shadow-xl text-white bg-slate-900/80 backdrop-blur-md border border-white/10">
                      {a.category}
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  <h2 className="font-bold text-white text-lg group-hover:text-indigo-400 transition-colors truncate tracking-tight">{a.title}</h2>

                  <div className="flex justify-between items-end mt-4">
                    <div>
                      <span className="text-slate-500 text-[8px] font-bold uppercase tracking-[0.2em] block mb-0.5">Current Price</span>
                      <p className="text-2xl font-bold text-white tabular-nums">
                        ₹{Number(a.current_price).toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div className="text-right">
                      {isPending ? (
                        <>
                          <span className="text-indigo-400 text-[8px] font-bold uppercase tracking-[0.2em] block mb-0.5">Starts On</span>
                          <p className="text-[10px] font-semibold text-slate-400">
                            {formatDateTime(a.start_time).date}
                          </p>
                          <p className="text-[9px] font-bold text-indigo-400/80 uppercase tracking-tighter">
                            {formatDateTime(a.start_time).time}
                          </p>
                        </>
                      ) : (
                        <>
                          <span className="text-slate-500 text-[8px] font-bold uppercase tracking-[0.2em] block mb-0.5">{isEnded ? 'Auction Ended' : 'Deadline'}</span>
                          <p className="text-[10px] font-semibold text-slate-400">
                            {formatDateTime(a.end_time).date}
                          </p>
                          {!isEnded && (
                            <p className="text-[9px] font-bold text-indigo-400/80 uppercase tracking-tighter">
                              {formatDateTime(a.end_time).time}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 pt-5 border-t border-white/5 flex items-center justify-between">
                    <span className="text-indigo-400 text-[9px] font-bold uppercase tracking-widest flex items-center gap-2 group-hover:translate-x-2 transition-transform">
                      View Details <span>→</span>
                    </span>
                    <div className="flex gap-1 group-hover:scale-110 transition-transform">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="w-1 h-1 rounded-full bg-indigo-500/30 group-hover:bg-indigo-500 transition-colors"></div>
                      ))}
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

