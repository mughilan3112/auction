import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api'

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export default function AuctionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [auction, setAuction] = useState(null)
  const [winner, setWinner] = useState(null)
  const [bidAmount, setBidAmount] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [bidding, setBidding] = useState(false)
  const token = localStorage.getItem('token')

  useEffect(() => {
    api.getAuction(id).then(({ ok, data }) => {
      setLoading(false)
      if (ok) setAuction(data)
    })
  }, [id])

  useEffect(() => {
    if (!auction || auction.status !== 'closed') return
    api.getWinner(id).then(({ ok, data }) => {
      if (ok) setWinner(data)
    })
  }, [id, auction?.status])

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
      setAuction((a) => (a ? { ...a, current_price: amount } : a))
      setBidAmount((amount + (auction?.min_increment ?? 0)).toFixed(2))
    } else {
      setMessage(data.detail || 'Failed to place bid')
    }
  }

  if (loading || !auction) {
    return (
      <div className="text-center py-12 text-slate-500">
        {loading ? 'Loading...' : 'Auction not found'}
      </div>
    )
  }

  const isActive = auction.status === 'active'
  const minBid = Number(auction.current_price) + Number(auction.min_increment)
  const ended = new Date(auction.end_time) <= new Date()

  return (
    <div className="max-w-2xl mx-auto">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="text-slate-600 hover:text-brand-600 mb-4 text-sm font-medium"
      >
        ← Back to auctions
      </button>
      <div className="card p-6">
        <h1 className="text-2xl font-bold text-slate-800">{auction.title}</h1>
        <p className="text-slate-600 mt-2 whitespace-pre-wrap">{auction.description}</p>
        <div className="mt-6 flex flex-wrap gap-6 text-slate-700">
          <div>
            <span className="text-slate-500 text-sm">Current price</span>
            <p className="text-xl font-bold text-brand-600">
              ${Number(auction.current_price).toFixed(2)}
            </p>
          </div>
          <div>
            <span className="text-slate-500 text-sm">Min increment</span>
            <p>${Number(auction.min_increment).toFixed(2)}</p>
          </div>
          <div>
            <span className="text-slate-500 text-sm">Ends</span>
            <p>{formatDate(auction.end_time)}</p>
          </div>
          <div>
            <span className="text-slate-500 text-sm">Status</span>
            <p>
              <span className={`font-medium ${isActive ? 'text-green-600' : 'text-slate-600'}`}>
                {auction.status}
              </span>
            </p>
          </div>
        </div>

        {winner && (
          <div className="mt-6 p-4 bg-brand-50 rounded-lg border border-brand-100">
            <h3 className="font-semibold text-slate-800">Winner declared</h3>
            <p className="text-slate-600 text-sm">
              Final price: ${Number(winner.final_price).toFixed(2)}
            </p>
          </div>
        )}

        {isActive && !ended && (
          <form onSubmit={handlePlaceBid} className="mt-6 pt-6 border-t border-slate-100">
            <h3 className="font-semibold text-slate-800 mb-3">Place a bid</h3>
            <p className="text-slate-600 text-sm mb-2">
              Minimum bid: ${minBid.toFixed(2)}
            </p>
            <div className="flex gap-3 flex-wrap">
              <input
                type="number"
                step={auction.min_increment}
                min={minBid}
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                className="input-field flex-1 min-w-[120px]"
                placeholder="Amount"
              />
              <button type="submit" disabled={bidding || !token} className="btn-primary">
                {bidding ? 'Placing...' : 'Place bid'}
              </button>
            </div>
            {message && (
              <p className={`mt-2 text-sm ${message.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
                {message}
              </p>
            )}
            {!token && (
              <p className="mt-2 text-sm text-amber-600">
                Log in to place a bid.
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
