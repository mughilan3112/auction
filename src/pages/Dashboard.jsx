import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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


export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [seller, setSeller] = useState(null)
  const [myAuctions, setMyAuctions] = useState([])
  const [wonAuctions, setWonAuctions] = useState([])
  const [soldAuctions, setSoldAuctions] = useState([])
  const [storeName, setStoreName] = useState('')
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editStoreName, setEditStoreName] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingAuctions, setLoadingAuctions] = useState(false)
  const navigate = useNavigate()
  const token = localStorage.getItem('token')

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true })
      return
    }
    api.getMe().then(({ ok, data }) => {
      if (!ok) {
        navigate('/login', { replace: true })
        return
      }
      setUser(data)
      setEditName(data.name)
      setEditEmail(data.email)
      
      // Fetch won auctions for all users
      fetchWonAuctions()
      
      if (data.role === 'seller') {
        fetchSellerData()
        fetchSoldAuctions()
      }
    })
  }, [token, navigate])

  const fetchSellerData = async () => {
    setLoadingAuctions(true)
    const [sellerRes, auctionsRes] = await Promise.all([
      api.getSellerMe(),
      api.listMyAuctions()
    ])
    if (sellerRes.ok) {
      setSeller(sellerRes.data)
      setEditStoreName(sellerRes.data.store_name)
    }
    if (auctionsRes.ok) setMyAuctions(auctionsRes.data)
    setLoadingAuctions(false)
  }

  const fetchWonAuctions = async () => {
    const { ok, data } = await api.getMyWonAuctions()
    if (ok) setWonAuctions(data)
  }

  const fetchSoldAuctions = async () => {
    const { ok, data } = await api.getMySoldAuctions()
    if (ok) setSoldAuctions(data)
  }

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    if (!editName.trim() || !editEmail.trim()) return
    setLoading(true)

    const updates = [api.updateUser({ name: editName.trim(), email: editEmail.trim() })]

    if (user.role === 'seller' && editStoreName.trim()) {
      updates.push(api.updateSeller({ store_name: editStoreName.trim() }))
    }

    const results = await Promise.all(updates)
    const allOk = results.every(r => r.ok)

    setLoading(false)
    if (allOk) {
      setUser(prev => ({ ...prev, name: editName.trim(), email: editEmail.trim() }))
      if (seller) {
        setSeller(prev => ({ ...prev, store_name: editStoreName.trim() }))
      }
      setIsEditingProfile(false)
      setMessage('Profile updated!')
      setTimeout(() => setMessage(''), 3000)
    } else {
      const error = results.find(r => !r.ok)?.data?.detail || 'Update failed'
      alert(error)
    }
  }


  const handleBecomeSeller = async (e) => {
    e.preventDefault()
    if (!storeName.trim()) {
      setMessage('Enter a store name')
      return
    }
    setLoading(true)
    setMessage('')
    const { ok, data } = await api.createSeller({ store_name: storeName.trim() })
    setLoading(false)
    if (ok) {
      setMessage('Seller profile created!')
      setUser((u) => (u ? { ...u, role: 'seller' } : u))
      fetchSellerData()
    } else {
      setMessage(data.detail || 'Failed to create seller')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this auction?')) return
    const { ok, data } = await api.deleteAuction(id)
    if (ok) {
      setMyAuctions((prev) => prev.filter((a) => a.id !== id))
    } else {
      alert(data.detail || 'Failed to delete auction')
    }
  }

  if (!user) return null

  return (
    <div className="max-w-6xl mx-auto px-6 pb-24 space-y-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 py-6 border-b border-white/5">
        <div>
          <h1 className="text-4xl font-bold gradient-text tracking-tighter">MY DASHBOARD.</h1>
          <p className="text-slate-500 mt-1 font-semibold uppercase tracking-[0.2em] text-[10px]">Account Status: Active</p>
        </div>
        <div className="flex gap-4">
          <div className="px-6 py-2 glass-card border-white/10 !rounded-2xl flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[10px] font-bold uppercase text-slate-300 tracking-widest">{user.role} Account</span>
          </div>
        </div>
      </header>

      <div className="grid lg:grid-cols-12 gap-10">
        {/* Left Column - Intelligence Profile */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-card p-8 relative group border-white/5">
            <div className="absolute -inset-0.5 bg-gradient-to-br from-indigo-500/20 to-purple-600/20 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity blur-xl"></div>

            <button
              onClick={() => setIsEditingProfile(!isEditingProfile)}
              className="absolute top-8 right-8 w-10 h-10 flex items-center justify-center bg-slate-800 rounded-2xl text-slate-400 hover:text-white hover:bg-indigo-600 transition-all z-10"
            >
              {isEditingProfile ? '✕' : '✏️'}
            </button>

            <div className="relative">
              <div className="flex flex-col items-center text-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl flex items-center justify-center text-white text-3xl font-bold shadow-[0_0_20px_rgba(99,102,241,0.2)] mb-4 animate-float">
                  {user.name.charAt(0).toUpperCase()}
                </div>

                {isEditingProfile ? (
                  <form onSubmit={handleUpdateProfile} className="w-full space-y-5">
                    <div className="text-left">
                      <label className="text-[9px] font-bold uppercase text-slate-500 tracking-widest block mb-2 px-1">My Name</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="input-field"
                        placeholder="Full Name"
                      />
                    </div>
                    <div className="text-left">
                      <label className="text-[9px] font-bold uppercase text-slate-500 tracking-widest block mb-2 px-1">Email Address</label>
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        className="input-field"
                        placeholder="Email Address"
                      />
                    </div>
                    {user.role === 'seller' && (
                      <div className="text-left">
                        <label className="text-[9px] font-bold uppercase text-slate-500 tracking-widest block mb-2 px-1">Shop Name</label>
                        <input
                          type="text"
                          value={editStoreName}
                          onChange={(e) => setEditStoreName(e.target.value)}
                          className="input-field"
                          placeholder="Store Name"
                        />
                      </div>
                    )}
                    <button type="submit" disabled={loading} className="btn-primary w-full py-4 text-xs tracking-[0.2em] shadow-lg shadow-indigo-500/20">
                      {loading ? 'Processing...' : 'Sync Profile'}
                    </button>
                  </form>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold text-white tracking-tight leading-none mb-1">{user.name}</h2>
                    <p className="text-slate-500 text-xs font-medium tracking-wide mb-4">{user.email}</p>

                    <div className="w-full grid grid-cols-2 gap-4 mt-4 py-6 border-y border-white/5">
                      <div className="text-center">
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Status</p>
                        <p className="text-xs font-semibold text-emerald-400 uppercase tracking-tighter">Verified</p>
                      </div>
                      <div className="text-center border-l border-white/5">
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Rating</p>
                        <p className="text-xs font-semibold text-indigo-400 uppercase tracking-tighter">Excellent</p>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {!isEditingProfile && seller && (
                <div className="p-6 bg-slate-900/50 rounded-2xl border border-white/5 text-center">
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">My Shop</p>
                  <p className="text-lg font-bold gradient-text uppercase tracking-tighter">{seller.store_name}</p>
                </div>
              )}
            </div>
          </div>

          {!seller && user.role !== 'seller' && (
            <div className="glass-card p-10 border-dashed border-indigo-500/20 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="text-8xl">💎</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2 relative z-10">Start Selling</h3>
              <p className="text-slate-500 text-sm mb-8 font-medium relative z-10">Sell your items on our platform and reach more buyers.</p>

              <form onSubmit={handleBecomeSeller} className="space-y-4 relative z-10">
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="input-field"
                  placeholder="Designate Store Name"
                />
                <button type="submit" disabled={loading} className="btn-secondary w-full py-4 text-[10px] tracking-widest uppercase">
                  {loading ? 'Initializing...' : 'Authorize Seller Status'}
                </button>
              </form>
              {message && (
                <p className={`mt-4 text-[10px] font-semibold text-center uppercase tracking-widest ${message.includes('created') ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {message}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right Column - Inventory & Global Fleet */}
        <div className="lg:col-span-8 space-y-10">
          {user.role === 'seller' && (
            <div className="space-y-8">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                  My Items
                  <span className="text-[9px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-3 py-1 rounded-full uppercase tracking-widest">
                    {myAuctions.length} Items
                  </span>
                </h2>
              </div>

              {loadingAuctions ? (
                <div className="glass-card p-24 text-center">
                  <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-slate-500 font-semibold uppercase tracking-widest text-xs">Synchronizing Inventory...</p>
                </div>
              ) : myAuctions.length === 0 ? (
                <div className="glass-card p-24 text-center border-dashed border-slate-800">
                  <div className="text-6xl mb-6 opacity-30">📂</div>
                  <h3 className="text-slate-400 font-bold text-xl uppercase tracking-tighter">No auctions here</h3>
                  <p className="text-slate-600 text-sm mt-2 max-w-xs mx-auto font-medium">You haven't listed any items yet. Start selling today.</p>
                </div>
              ) : (
                <div className="grid gap-6">
                  {myAuctions.map((a, index) => (
                    <div
                      key={a.id}
                      className="group glass-card p-4 border-white/5 hover:border-indigo-500/30 hover:bg-slate-900/60 transition-all flex items-center gap-6 animate-float"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div className="w-24 h-24 bg-slate-900 rounded-[1.2rem] overflow-hidden shrink-0 border border-white/5 relative">
                        {a.image_path ? (
                          <img
                            src={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${a.image_path}`}
                            alt={a.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-800 font-black text-4xl">?</div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      </div>

                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-start justify-between gap-6">
                          <div>
                            <Link to={`/auctions/${a.id}`} className="text-lg font-bold text-white hover:text-indigo-400 transition-colors block truncate tracking-tight mb-1">
                              {a.title}
                            </Link>
                            <div className="flex flex-wrap items-center gap-y-2 gap-x-5">
                              <div className="flex flex-col">
                                <span className="text-[8px] font-bold uppercase tracking-widest text-slate-600 mb-0.5">Current Price</span>
                                <span className="text-base font-bold text-indigo-400 tracking-tighter">₹{a.current_price.toLocaleString('en-IN')}</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[8px] font-bold uppercase tracking-widest text-slate-600 mb-0.5">Timeline</span>
                                <div className="flex flex-col">
                                  <span className="text-[10px] font-semibold text-slate-400 capitalize whitespace-nowrap">
                                    {a.status === 'pending' ? 'Starts ' + formatDateTime(a.start_time).date : (a.status === 'active' ? 'Ends ' + formatDateTime(a.end_time).date : 'Legacy Record')}
                                  </span>
                                  {a.status !== 'closed' && (
                                    <span className="text-[9px] font-bold text-indigo-400/80 uppercase tracking-tighter">
                                      {a.status === 'pending' ? formatDateTime(a.start_time).time : formatDateTime(a.end_time).time}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-3 self-end mb-1">
                                <span className={`px-4 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest ${a.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                  a.status === 'pending' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                                    'bg-slate-800 text-slate-400 border border-white/5'
                                  }`}>
                                  {a.status}
                                </span>
                                {a.winner_name && (
                                  <span className="px-4 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full text-[9px] font-black uppercase tracking-widest">
                                    Secured By: {a.winner_name}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Link
                              to={`/edit/${a.id}`}
                              className="w-10 h-10 flex items-center justify-center bg-slate-900 border border-white/5 rounded-xl hover:border-indigo-500 hover:text-indigo-400 transition-all group/btn"
                              title="Update Records"
                            >
                              <span className="text-base opacity-50 group-hover/btn:opacity-100 transition-opacity">✏️</span>
                            </Link>

                            <button
                              onClick={() => handleDelete(a.id)}
                              className="w-10 h-10 flex items-center justify-center bg-slate-900 border border-white/5 rounded-xl hover:border-rose-500 hover:text-rose-400 transition-all group/btn"
                              title="Decommission"
                            >
                              <span className="text-base opacity-30 group-hover/btn:opacity-100 transition-opacity">🗑️</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Won Auctions Section - For all users */}
          {wonAuctions.length > 0 && (
            <div className="space-y-8 mt-10">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                  🏆 Auctions Won
                  <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full uppercase tracking-widest">
                    {wonAuctions.length} Won
                  </span>
                </h2>
              </div>

              <div className="grid gap-6">
                {wonAuctions.map((w, index) => (
                  <div
                    key={w.id}
                    className="group glass-card p-4 border-white/5 hover:border-emerald-500/30 hover:bg-slate-900/60 transition-all animate-float"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    {/* Product Image */}
                    <div className="flex items-start gap-6 mb-4">
                      <div className="w-24 h-24 bg-slate-900 rounded-[1.2rem] overflow-hidden shrink-0 border border-white/5 relative">
                        {w.auction_info?.image_path ? (
                          <img
                            src={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${w.auction_info.image_path}`}
                            alt={w.auction_info?.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-800 font-black text-4xl">🏷️</div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-white truncate tracking-tight mb-2">
                          {w.auction_info?.title}
                        </h3>
                        <p className="text-sm text-slate-400 line-clamp-2 mb-3">
                          {w.auction_info?.description}
                        </p>
                        
                        {/* Price Info */}
                        <div className="flex gap-6 items-center">
                          <div>
                            <span className="text-[8px] font-bold uppercase tracking-widest text-slate-600 block mb-1">Winning Bid</span>
                            <span className="text-xl font-bold text-emerald-400">₹{w.final_price.toLocaleString('en-IN')}</span>
                          </div>
                          <div>
                            <span className="text-[8px] font-bold uppercase tracking-widest text-slate-600 block mb-1">Starting Price</span>
                            <span className="text-sm font-semibold text-slate-400">₹{w.auction_info?.starting_price.toLocaleString('en-IN')}</span>
                          </div>
                          <div>
                            <span className="text-[8px] font-bold uppercase tracking-widest text-slate-600 block mb-1">Category</span>
                            <span className="text-sm font-semibold text-indigo-400">{w.auction_info?.category || 'Others'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-white/5 pt-4 grid md:grid-cols-2 gap-4">
                      {/* Seller Info */}
                      <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-2">Seller Details</p>
                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-white">{w.seller_info?.seller_name}</p>
                          <p className="text-xs text-slate-400">{w.seller_info?.seller_email}</p>
                          {w.seller_info?.store_name && (
                            <p className="text-xs text-indigo-400 font-semibold">🏪 {w.seller_info.store_name}</p>
                          )}
                        </div>
                      </div>

                      {/* Purchase Date */}
                      <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-2">Won On</p>
                        <p className="text-sm font-semibold text-emerald-400">
                          {new Date(w.declared_at).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {new Date(w.declared_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sold Auctions Section - For sellers */}
          {user?.role === 'seller' && soldAuctions.length > 0 && (
            <div className="space-y-8 mt-10">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                  💰 Auctions Sold
                  <span className="text-[9px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-3 py-1 rounded-full uppercase tracking-widest">
                    {soldAuctions.length} Sold
                  </span>
                </h2>
              </div>

              <div className="grid gap-6">
                {soldAuctions.map((w, index) => (
                  <div
                    key={w.id}
                    className="group glass-card p-4 border-white/5 hover:border-purple-500/30 hover:bg-slate-900/60 transition-all animate-float"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    {/* Product Image */}
                    <div className="flex items-start gap-6 mb-4">
                      <div className="w-24 h-24 bg-slate-900 rounded-[1.2rem] overflow-hidden shrink-0 border border-white/5 relative">
                        {w.auction_info?.image_path ? (
                          <img
                            src={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${w.auction_info.image_path}`}
                            alt={w.auction_info?.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-800 font-black text-4xl">🏷️</div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-white truncate tracking-tight mb-2">
                          {w.auction_info?.title}
                        </h3>
                        <p className="text-sm text-slate-400 line-clamp-2 mb-3">
                          {w.auction_info?.description}
                        </p>
                        
                        {/* Price Info */}
                        <div className="flex gap-6 items-center">
                          <div>
                            <span className="text-[8px] font-bold uppercase tracking-widest text-slate-600 block mb-1">Sold For</span>
                            <span className="text-xl font-bold text-purple-400">₹{w.final_price.toLocaleString('en-IN')}</span>
                          </div>
                          <div>
                            <span className="text-[8px] font-bold uppercase tracking-widest text-slate-600 block mb-1">Starting Price</span>
                            <span className="text-sm font-semibold text-slate-400">₹{w.auction_info?.starting_price.toLocaleString('en-IN')}</span>
                          </div>
                          <div>
                            <span className="text-[8px] font-bold uppercase tracking-widest text-slate-600 block mb-1">Category</span>
                            <span className="text-sm font-semibold text-indigo-400">{w.auction_info?.category || 'Others'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-white/5 pt-4 grid md:grid-cols-2 gap-4">
                      {/* Buyer Info */}
                      <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-2">Buyer Details</p>
                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-white">{w.buyer_info?.buyer_name}</p>
                          <p className="text-xs text-slate-400">{w.buyer_info?.buyer_email}</p>
                        </div>
                      </div>

                      {/* Sale Date */}
                      <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-2">Sold On</p>
                        <p className="text-sm font-semibold text-purple-400">
                          {new Date(w.declared_at).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {new Date(w.declared_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

