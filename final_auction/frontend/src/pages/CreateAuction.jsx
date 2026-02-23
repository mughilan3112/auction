import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

export default function CreateAuction() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startingPrice, setStartingPrice] = useState('')
  const [minIncrement, setMinIncrement] = useState('')
  const now = new Date()
  const defaultStart = new Date(now.getTime() + 60 * 1000).toISOString().slice(0, 16)
  const defaultEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
  const [startTime, setStartTime] = useState(defaultStart)
  const [endTime, setEndTime] = useState(defaultEnd)
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
      if (!ok || data.role !== 'seller') {
        navigate('/dashboard', { replace: true })
      }
    })
  }, [token, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    const start = new Date(startTime).toISOString()
    const end = new Date(endTime).toISOString()
    if (!start || !end || new Date(start) >= new Date(end)) {
      setMessage('End time must be after start time')
      return
    }
    const startPrice = parseFloat(startingPrice)
    const minInc = parseFloat(minIncrement)
    if (isNaN(startPrice) || startPrice <= 0 || isNaN(minInc) || minInc <= 0) {
      setMessage('Starting price and min increment must be positive numbers')
      return
    }
    if (!title.trim() || title.length < 3) {
      setMessage('Title must be at least 3 characters')
      return
    }
    if (!description.trim() || description.length < 5) {
      setMessage('Description must be at least 5 characters')
      return
    }
    setLoading(true)
    const { ok, data } = await api.createAuction({
      title: title.trim(),
      description: description.trim(),
      starting_price: startPrice,
      min_increment: minInc,
      start_time: start,
      end_time: end,
    })
    setLoading(false)
    if (ok) {
      setMessage('Auction created!')
      navigate(`/auctions/${data.id}`, { replace: true })
    } else {
      setMessage(data.detail || 'Failed to create auction')
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Create auction</h1>
      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field"
              placeholder="Auction title"
              minLength={3}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field min-h-[100px]"
              placeholder="Describe the item"
              minLength={5}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Starting price ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={startingPrice}
                onChange={(e) => setStartingPrice(e.target.value)}
                className="input-field"
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Min increment ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={minIncrement}
                onChange={(e) => setMinIncrement(e.target.value)}
                className="input-field"
                placeholder="0.00"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Start time
              </label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                End time
              </label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="input-field"
                required
              />
            </div>
          </div>
          {message && (
            <p className={`text-sm ${message.includes('created') ? 'text-green-600' : 'text-red-600'}`}>
              {message}
            </p>
          )}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Creating...' : 'Create auction'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
