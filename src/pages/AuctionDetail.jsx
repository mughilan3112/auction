import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '../api'

function formatDateTime(iso) {
  if (!iso) return { date: '—', time: '—' }
  const d = new Date(iso)
  return {
    date: d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }),
    time: d.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }
}

export default function AuctionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [auction, setAuction] = useState(null)
  const [winner, setWinner] = useState(null)
  const [user, setUser] = useState(null)
  const [seller, setSeller] = useState(null)
  const [bidAmount, setBidAmount] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [bidding, setBidding] = useState(false)
  const [activeImageIdx, setActiveImageIdx] = useState(0)
  const [now, setNow] = useState(new Date())
  const token = localStorage.getItem('token')

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      const [auctionRes, userRes, sellerRes] = await Promise.all([
        api.getAuction(id),
        token ? api.getMe() : Promise.resolve({ ok: false }),
        token ? api.getSellerMe() : Promise.resolve({ ok: false })
      ])

      setLoading(false)
      if (auctionRes.ok) {
        setAuction(auctionRes.data)
      }
      if (userRes.ok) setUser(userRes.data)
      if (sellerRes.ok) setSeller(sellerRes.data)
    }
    fetchData()
  }, [id, token])

  useEffect(() => {
    if (!auction || auction.status !== 'closed') return
    // Use embedded winner_info from auction document instead of separate API call
    if (auction.winner_info) {
      setWinner(auction.winner_info)
    }
  }, [auction?.winner_info, auction?.status])

  useEffect(() => {
    if (auction?.min_increment != null && auction?.current_price != null) {
      const min = Number(auction.current_price) + Number(auction.min_increment)
      if (!bidAmount || Number(bidAmount) < min) {
        setBidAmount(min.toFixed(2))
      }
    }
  }, [auction?.current_price, auction?.min_increment])

  const handlePlaceBid = async (e) => {
    e.preventDefault()
    if (!token) {
      setMessage('Please log in to place a bid')
      navigate('/login')
      return
    }
    const amount = parseFloat(bidAmount)
    if (isNaN(amount) || amount <= 0) {
      setMessage('Enter a valid bid amount')
      return
    }
    setMessage('')
    setBidding(true)
    const { ok, data } = await api.placeBid(id, amount)
    setBidding(false)
    if (ok) {
      setMessage('Bid placed successfully!')
      setAuction((a) => {
        if (!a) return a
        const updated = { ...a, current_price: amount }
        // If backend supplies embedded bids, append new bid locally to keep UI in sync
        const newBid = {
          bidder_id: data.bidder_id,
          amount: data.amount,
          bid_time: data.bid_time,
        }
        if (Array.isArray(updated.bids)) {
          updated.bids = [...updated.bids, newBid]
        }
        // Update stats if present
        if (updated.stats && typeof updated.stats.total_bids === 'number') {
          updated.stats = { ...updated.stats, total_bids: updated.stats.total_bids + 1 }
          if (!updated.stats.highest_bid || data.amount > updated.stats.highest_bid) {
            updated.stats.highest_bid = data.amount
          }
        }
        return updated
      })
      setBidAmount((amount + (auction?.min_increment ?? 0)).toFixed(2))
    } else {
      setMessage(data.detail || 'Failed to place bid')
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this auction?')) return
    const { ok, data } = await api.deleteAuction(id)
    if (ok) {
      navigate('/dashboard')
    } else {
      alert(data.detail || 'Failed to delete auction')
    }
  }

  if (loading || !auction) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500 font-bold uppercase tracking-[0.3em] gap-6">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        {loading ? 'Loading Details...' : 'Auction not found'}
      </div>
    )
  }

  const auctionStartTime = new Date(auction.start_time)
  const auctionEndTime = new Date(auction.end_time)
  const isActuallyPending = auctionStartTime > now
  const isActuallyEnded = auctionEndTime <= now
  const isOwner = seller && auction.seller_id === seller.id
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const images = auction.image_paths && auction.image_paths.length > 0 ? auction.image_paths : [];

  return (
    <div className="max-w-6xl mx-auto px-6 pb-20 space-y-8 pt-4">
      {/* Dynamic Command Bar */}
      <div className="flex justify-between items-center glass-card border-white/10 !rounded-[1.5rem] p-3 pr-5">
        <button
          onClick={() => navigate(-1)}
          className="btn-secondary group flex items-center gap-2 !px-6 !py-2.5 text-[10px]"
        >
          <span className="transition-transform group-hover:-translate-x-1">←</span>
          Back
        </button>

        {isOwner && (
          <div className="flex gap-3">
            <Link
              to={`/edit/${id}`}
              className="px-6 py-2.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 rounded-xl text-[9px] font-bold uppercase tracking-[0.2em] hover:bg-indigo-500 hover:text-white transition-all flex items-center gap-2"
            >
              <span>✏️</span> Edit
            </Link>
            <button
              onClick={handleDelete}
              className="px-6 py-2.5 bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded-xl text-[9px] font-bold uppercase tracking-[0.2em] hover:bg-rose-500 hover:text-white transition-all flex items-center gap-2"
            >
              <span>🗑️</span> Delete
            </button>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-12 gap-10 items-start">
        {/* Visual Showcase - Left Side */}
        <div className="lg:col-span-7 space-y-6">
          <div className="relative group aspect-[16/10] glass-card !rounded-[2.5rem] border-white/10 overflow-hidden shadow-xl animate-float">
            {images.length > 0 ? (
              <>
                <img
                  src={`${API_BASE}${images[activeImageIdx]}`}
                  alt={auction.title}
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent" />

                {images.length > 1 && (
                  <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setActiveImageIdx(prev => (prev === 0 ? images.length - 1 : prev - 1))}
                      className="w-10 h-10 bg-slate-950/80 backdrop-blur-xl rounded-2xl flex items-center justify-center text-white border border-white/10 hover:border-indigo-500 transition-all font-black"
                    >
                      ←
                    </button>
                    <button
                      onClick={() => setActiveImageIdx(prev => (prev === images.length - 1 ? 0 : prev + 1))}
                      className="w-10 h-10 bg-slate-950/80 backdrop-blur-xl rounded-2xl flex items-center justify-center text-white border border-white/10 hover:border-indigo-500 transition-all font-black"
                    >
                      →
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-700">
                <span className="text-8xl font-black italic opacity-20 mb-3">AU</span>
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-800">No Image</p>
              </div>
            )}

            <div className="absolute bottom-6 left-6 flex gap-3">
              <div className="px-4 py-1.5 bg-slate-950/80 backdrop-blur-md border border-white/10 rounded-full">
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{auction.category}</p>
              </div>
            </div>
          </div>

          {images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-3 no-scrollbar">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImageIdx(i)}
                  className={`relative w-16 h-16 rounded-[1.2rem] overflow-hidden border-2 shrink-0 transition-all duration-500 ${i === activeImageIdx ? 'border-indigo-500 scale-105 shadow-md shadow-indigo-500/20' : 'border-white/5 opacity-40 hover:opacity-100'
                    }`}
                >
                  <img src={`${API_BASE}${img}`} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Intelligence & Data - Right Side */}
        <div className="lg:col-span-5 space-y-6">
          <header className="space-y-3">
            <div className="flex items-center gap-2">
              {isActuallyPending ? (
                <div className="flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/30 rounded-full text-indigo-400 font-bold text-[9px] uppercase tracking-widest">
                  <div className="w-1 h-1 bg-indigo-500 rounded-full animate-pulse" />
                  Scheduled
                </div>
              ) : isActuallyEnded ? (
                <div className="px-3 py-1 bg-slate-800 border border-white/10 rounded-full text-slate-400 font-bold text-[9px] uppercase tracking-widest">
                  Archived Record
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 font-bold text-[9px] uppercase tracking-widest">
                  <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                  Auction Live
                </div>
              )}
            </div>

            <h1 className="text-4xl font-bold text-white tracking-tighter leading-tight">{auction.title}</h1>
            <p className="text-slate-500 font-medium text-sm leading-relaxed">
              {auction.description}
            </p>
          </header>

          <div className="grid grid-cols-2 gap-4">
            <div className="glass-card !rounded-[2rem] p-5 border-white/5 bg-slate-900/40">
              <p className="text-slate-500 text-[8px] font-bold uppercase tracking-widest mb-1 px-1">Current Price</p>
              <p className="text-2xl font-bold text-indigo-400 tracking-tighter tabular-nums">₹{Number(auction.current_price).toLocaleString('en-IN')}</p>
            </div>
            <div className="glass-card !rounded-[2rem] p-5 border-white/5 bg-slate-900/40">
              <p className="text-slate-500 text-[8px] font-bold uppercase tracking-widest mb-1 px-1">{isActuallyPending ? 'Opens On' : 'Deadline'}</p>
              <div className="flex flex-col">
                <p className="text-base font-bold text-white leading-tight uppercase tracking-tighter">
                  {isActuallyPending ? formatDateTime(auction.start_time).date : formatDateTime(auction.end_time).date}
                </p>
                <p className="text-[10px] font-bold text-indigo-400/80 uppercase tracking-widest mt-0.5">
                  {isActuallyPending ? formatDateTime(auction.start_time).time : formatDateTime(auction.end_time).time}
                </p>
              </div>
            </div>
          </div>

          {!isActuallyPending && auction.stats && (
            <div className="p-6 glass-card bg-slate-950/80 border-indigo-500/20 !rounded-[2.5rem] space-y-6 shadow-xl">
              <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                <div className="w-8 h-8 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400 text-lg font-bold">📊</div>
                <h3 className="text-lg font-bold text-white uppercase tracking-tighter">Auction Stats</h3>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest mb-1">Bids</p>
                  <p className="text-2xl font-bold text-white">{auction.stats.total_bids}</p>
                </div>
                <div className="text-center border-x border-white/5">
                  <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest mb-1">Avg.</p>
                  <p className="text-2xl font-bold text-white">₹{auction.stats.average_bid.toFixed(0)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest mb-1">Highest</p>
                  <p className="text-2xl font-bold text-indigo-400">₹{auction.stats.highest_bid.toFixed(0)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Embedded bids list (if available) */}
          {Array.isArray(auction.bids) && auction.bids.length > 0 && (
            <div className="p-6 glass-card bg-slate-950/80 border-white/5 !rounded-[2.5rem] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white uppercase tracking-tighter">Recent Bids</h3>
                <p className="text-sm text-slate-400">Total: {auction.bids.length}</p>
              </div>

              <div className="divide-y divide-white/5 max-h-64 overflow-y-auto no-scrollbar">
                {auction.bids.slice().reverse().map((b, i) => {
                  const time = b.bid_time ? new Date(b.bid_time) : null
                  const bidderLabel = user && b.bidder_id === user.id ? 'You' : (b.bidder_id ? String(b.bidder_id).slice(-6) : '—')
                  const bidLabel = b.bid_number ? `Bid ${b.bid_number}` : `#${i + 1}`
                  return (
                    <div key={i} className="py-3 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold text-white">₹{Number(b.amount).toLocaleString('en-IN')}</div>
                        <div className="text-[11px] text-slate-400">{bidderLabel} • {time ? time.toLocaleString() : '—'}</div>
                      </div>
                      <div className="text-xs text-slate-500">{bidLabel}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Action Interface */}
          {isActuallyPending ? (
            <div className="glass-card !rounded-[2.5rem] p-10 bg-indigo-600 text-white text-center relative overflow-hidden shadow-xl animate-float">
              <div className="absolute top-0 right-0 p-8 opacity-10 text-[8rem] font-bold italic select-none rotate-12">SOON</div>
              <p className="text-[9px] font-bold uppercase tracking-[0.3em] opacity-80 mb-3 px-2">Next Auction</p>
              <h3 className="text-3xl font-bold uppercase tracking-tight mb-6">Starts At</h3>
              <div className="inline-flex flex-col items-center px-8 py-4 bg-white/20 border border-white/30 rounded-[1.5rem]">
                <span className="text-2xl font-bold tracking-tighter">{formatDateTime(auction.start_time).date}</span>
                <span className="text-xs font-bold uppercase tracking-[0.2em] opacity-80 mt-1">{formatDateTime(auction.start_time).time}</span>
              </div>
            </div>
          ) : !isActuallyEnded ? (
            isOwner ? (
              <div className="p-10 glass-card !rounded-[2.5rem] border-dashed border-slate-800 text-center">
                <p className="text-indigo-400 font-black text-[10px] uppercase tracking-[0.2em] mb-2">Owner Designation</p>
                <p className="text-slate-500 font-medium text-xs">Operation controls are localized in the upper command bar.</p>
              </div>
            ) : (
              <form onSubmit={handlePlaceBid} className="space-y-4">
                <div className="glass-card !rounded-[2.5rem] p-6 border-indigo-500/30 bg-gradient-to-br from-indigo-900/40 to-slate-900 animate-float shadow-xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-white text-sm">B</div>
                    <span className="text-indigo-400 font-bold text-[9px] uppercase tracking-widest">Place Your Bid</span>
                  </div>

                  <div className="flex flex-col gap-4">
                    <div className="relative group">
                      <label className="absolute -top-2.5 left-5 px-3 bg-slate-900 text-[8px] font-bold uppercase text-indigo-400 tracking-widest border border-indigo-500/20 rounded-full z-10">Your Bid Amount</label>
                      <input
                        type="number"
                        step={auction.min_increment}
                        min={Number(auction.current_price) + Number(auction.min_increment)}
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        className="w-full pl-9 pr-6 py-5 bg-slate-950/60 border border-white/10 rounded-[2rem] outline-none text-white text-3xl font-bold focus:border-indigo-500/50 focus:bg-slate-950 transition-all"
                        placeholder="0.00"
                      />
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-700 text-xl font-bold">₹</span>
                    </div>

                    <button
                      type="submit"
                      disabled={bidding}
                      className="btn-primary w-full py-5 text-[11px] font-bold tracking-[0.3em] shadow-indigo-500/30 shadow-xl active:scale-95 transition-all text-white bg-indigo-600"
                    >
                      {bidding ? 'BIDDING...' : 'PLACE BID NOW'}
                    </button>
                  </div>
                </div>

                {message && (
                  <div className={`p-4 rounded-[1.5rem] text-[9px] font-bold uppercase text-center border-2 animate-float ${message.includes('success')
                    ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                    : 'bg-rose-500/5 border-rose-500/20 text-rose-400'
                    }`}>
                    {message}
                  </div>
                )}
              </form>
            )
          ) : (
            <div className="glass-card !rounded-[2.5rem] p-10 bg-slate-950 text-white text-center border-white/5 shadow-xl space-y-6">
              <div>
                <h3 className="text-2xl font-bold uppercase tracking-tighter mb-6 text-slate-500">Auction Finished</h3>
                {winner ? (
                  <div className="space-y-3">
                    <p className="text-emerald-400 font-bold text-[9px] uppercase tracking-[0.3em]">Item Sold</p>
                    <p className="text-4xl font-bold gradient-text italic tracking-tighter">₹{Number(winner.final_price).toLocaleString('en-IN')}</p>
                    <div className="pt-4 border-t border-white/5 opacity-50">
                      <p className="text-[9px] font-bold uppercase tracking-widest">Auction Closed</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-rose-400 text-[10px] font-bold uppercase tracking-[0.3em] py-3">No winner found</p>
                )}
              </div>

              {/* Winner Details Section */}
              {winner && winner.buyer_info && winner.seller_info && (
                <div className="pt-6 border-t border-white/5 space-y-4">
                  {/* For Seller: Show Buyer Details */}
                  {user && user._id === auction?.seller_id && (
                    <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 p-5 rounded-2xl border border-emerald-500/20">
                      <p className="text-emerald-400 font-bold text-[8px] uppercase tracking-[0.2em] mb-3">🎯 Buyer Details</p>
                      <div className="space-y-2 text-left">
                        <div>
                          <p className="text-[8px] text-slate-500 uppercase tracking-widest mb-0.5">Name</p>
                          <p className="text-sm font-semibold text-white">{winner.buyer_info.buyer_name}</p>
                        </div>
                        <div>
                          <p className="text-[8px] text-slate-500 uppercase tracking-widest mb-0.5">Email</p>
                          <p className="text-xs font-mono text-slate-300">{winner.buyer_info.buyer_email}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* For Buyer: Show Seller Details */}
                  {user && winner.buyer_info.buyer_id === String(user._id) && (
                    <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 p-5 rounded-2xl border border-purple-500/20">
                      <p className="text-purple-400 font-bold text-[8px] uppercase tracking-[0.2em] mb-3">🏪 Seller Details</p>
                      <div className="space-y-2 text-left">
                        <div>
                          <p className="text-[8px] text-slate-500 uppercase tracking-widest mb-0.5">Name</p>
                          <p className="text-sm font-semibold text-white">{winner.seller_info.seller_name}</p>
                        </div>
                        <div>
                          <p className="text-[8px] text-slate-500 uppercase tracking-widest mb-0.5">Email</p>
                          <p className="text-xs font-mono text-slate-300">{winner.seller_info.seller_email}</p>
                        </div>
                        {winner.seller_info.store_name && (
                          <div>
                            <p className="text-[8px] text-slate-500 uppercase tracking-widest mb-0.5">Store</p>
                            <p className="text-xs font-semibold text-indigo-400">{winner.seller_info.store_name}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* For Other Users: Show Winner Name */}
                  {user && user._id !== auction?.seller_id && winner.buyer_info.buyer_id !== String(user._id) && (
                    <div className="bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 p-5 rounded-2xl border border-indigo-500/20">
                      <p className="text-indigo-400 font-bold text-[8px] uppercase tracking-[0.2em] mb-3">🏆 Winner</p>
                      <div className="space-y-2 text-left">
                        <div>
                          <p className="text-[8px] text-slate-500 uppercase tracking-widest mb-0.5">Winner Name</p>
                          <p className="text-sm font-semibold text-white">{winner.buyer_info.buyer_name}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* For Anonymous Users: Show Winner Name */}
                  {!user && (
                    <div className="bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 p-5 rounded-2xl border border-indigo-500/20">
                      <p className="text-indigo-400 font-bold text-[8px] uppercase tracking-[0.2em] mb-3">🏆 Winner</p>
                      <div className="space-y-2 text-left">
                        <div>
                          <p className="text-[8px] text-slate-500 uppercase tracking-widest mb-0.5">Winner Name</p>
                          <p className="text-sm font-semibold text-white">{winner.buyer_info.buyer_name}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

