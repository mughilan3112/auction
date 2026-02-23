import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [seller, setSeller] = useState(null)
  const [storeName, setStoreName] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
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
      if (data.role === 'seller') {
        api.getSellerMe().then(({ ok: ok2, data: sellerData }) => {
          if (ok2) setSeller(sellerData)
        })
      }
    })
  }, [token, navigate])

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
      api.getSellerMe().then(({ ok: ok2, data: sellerData }) => {
        if (ok2) setSeller(sellerData)
      })
    } else {
      setMessage(data.detail || 'Failed to create seller')
    }
  }

  if (!user) return null

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Dashboard</h1>
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Profile</h2>
        <div className="space-y-2 text-slate-700">
          <p><span className="font-medium">Name:</span> {user.name}</p>
          <p><span className="font-medium">Email:</span> {user.email}</p>
          <p><span className="font-medium">Role:</span> {user.role}</p>
          {seller && (
            <p><span className="font-medium">Store:</span> {seller.store_name}</p>
          )}
        </div>
      </div>

      {user.role !== 'seller' && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Become a seller</h2>
          <p className="text-slate-600 text-sm mb-4">
            Sellers can create and manage auctions.
          </p>
          <form onSubmit={handleBecomeSeller} className="flex gap-3 flex-wrap">
            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="input-field flex-1 min-w-[200px]"
              placeholder="Store name"
            />
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Creating...' : 'Create seller profile'}
            </button>
          </form>
          {message && (
            <p className={`mt-3 text-sm ${message.includes('created') ? 'text-green-600' : 'text-red-600'}`}>
              {message}
            </p>
          )}
        </div>
      )}

      {user.role === 'seller' && (
        <div className="mt-6">
          <Link to="/create" className="btn-primary inline-block">
            Create new auction
          </Link>
        </div>
      )}
    </div>
  )
}
