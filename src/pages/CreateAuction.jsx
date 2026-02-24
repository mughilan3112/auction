import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

export default function CreateAuction() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startingPrice, setStartingPrice] = useState('')
  const [minIncrement, setMinIncrement] = useState('')
  const [category, setCategory] = useState('Others')

  const categories = ["Electronics", "Automotive", "Fashion", "Collectibles", "Real Estate", "Home & Garden", "Art", "Others"]


  // Helper to get local YYYY-MM-DDTHH:mm
  const getLocalISO = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${mins}`;
  }

  const now = new Date()
  const defaultStartObj = new Date(now.getTime() + 60 * 1000)
  const defaultEndObj = new Date(now.getTime() + 24 * 60 * 60 * 1000)

  const pad = (num) => String(num).padStart(2, '0')
  const getDateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const getTimeStr = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`

  const [startDate, setStartDate] = useState(getDateStr(defaultStartObj))
  const [startTime, setStartTime] = useState(getTimeStr(defaultStartObj))
  const [endDate, setEndDate] = useState(getDateStr(defaultEndObj))
  const [endTime, setEndTime] = useState(getTimeStr(defaultEndObj))

  const [images, setImages] = useState([])
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

    if (images.length === 0) {
      setMessage('Please select at least one product image')
      return
    }

    const start = new Date(`${startDate}T${startTime}`).toISOString()
    const end = new Date(`${endDate}T${endTime}`).toISOString()
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
    const formData = new FormData()
    formData.append('title', title.trim())
    formData.append('description', description.trim())
    formData.append('starting_price', startPrice)
    formData.append('min_increment', minInc)
    formData.append('start_time', start)
    formData.append('end_time', end)
    formData.append('category', category)


    for (let i = 0; i < images.length; i++) {
      formData.append('images', images[i])
    }

    const { ok, data } = await api.createAuction(formData)
    setLoading(false)
    if (ok) {
      setMessage('Auction created!')
      navigate(`/auctions/${data.id}`, { replace: true })
    } else {
      setMessage(data.detail || 'Failed to create auction')
    }
  }


  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <header className="mb-12 text-center">
        <h1 className="text-5xl font-bold gradient-text tracking-tighter mb-4">POST AUCTION.</h1>
        <p className="text-slate-500 font-semibold uppercase tracking-[0.3em] text-[10px]">Add your item for bidding</p>
      </header>

      <div className="glass-card !rounded-[3rem] p-12 border-white/5 relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-br from-indigo-500/20 to-purple-600/20 rounded-[3rem] opacity-0 group-hover:opacity-100 transition-opacity blur-2xl"></div>

        <form onSubmit={handleSubmit} className="relative z-10 space-y-10">
          <div className="grid lg:grid-cols-2 gap-10">
            {/* Core Identity */}
            <div className="space-y-8">
              <div>
                <label className="text-[9px] font-bold uppercase text-slate-500 tracking-widest block mb-3 px-1">Item Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input-field"
                  placeholder="Asset Title"
                  minLength={3}
                  required
                />
              </div>

              <div>
                <label className="text-[9px] font-bold uppercase text-slate-500 tracking-widest block mb-3 px-1">Item Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input-field min-h-[160px] resize-none"
                  placeholder="Comprehensive Asset Description"
                  minLength={5}
                  required
                />
              </div>

              <div>
                <label className="text-[9px] font-bold uppercase text-slate-500 tracking-widest block mb-3 px-1">Category</label>
                <div className="relative">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="input-field appearance-none cursor-pointer"
                    required
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat} className="bg-slate-900">{cat}</option>
                    ))}
                  </select>
                  <span className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 text-xs">▼</span>
                </div>
              </div>
            </div>

            {/* Financials & Timeline */}
            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-[9px] font-bold uppercase text-slate-500 tracking-widest block mb-3 px-1">Starting Price (₹)</label>
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
                  <label className="text-[9px] font-bold uppercase text-slate-500 tracking-widest block mb-3 px-1">Min. Increment (₹)</label>
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

              <div className="space-y-8">
                <div>
                  <label className="text-[9px] font-bold uppercase text-slate-500 tracking-widest block mb-3 px-1">Start Time</label>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="input-field !py-4"
                      required
                    />
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="input-field !py-4"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-bold uppercase text-slate-500 tracking-widest block mb-3 px-1">End Time</label>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="input-field !py-4"
                      required
                    />
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="input-field !py-4"
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[9px] font-bold uppercase text-slate-500 tracking-widest block mb-3 px-1">Item Images</label>
                <div className="relative group/upload">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => setImages(Array.from(e.target.files))}
                    className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
                    required={images.length === 0}
                  />
                  <div className="w-full py-10 border-2 border-dashed border-white/10 rounded-[2rem] bg-slate-950/40 group-hover/upload:border-indigo-500/50 group-hover/upload:bg-indigo-500/5 transition-all flex flex-col items-center justify-center gap-3">
                    <span className="text-3xl grayscale group-hover/upload:grayscale-0 transition-all">📸</span>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 group-hover/upload:text-indigo-400">
                      {images.length > 0 ? `${images.length} Images selected` : 'Upload item photos'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <footer className="pt-10 border-t border-white/5 flex flex-col md:flex-row gap-6 items-center">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full md:w-auto !px-16 !py-5 text-xs tracking-[0.3em] uppercase"
            >
              {loading ? 'POSTING...' : 'CREATE AUCTION'}
            </button>

            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn-secondary w-full md:w-auto !px-12 !py-5 text-xs tracking-[0.2em] uppercase"
            >
              Cancel
            </button>

            {message && (
              <p className={`flex-1 text-center md:text-left text-[10px] font-black uppercase tracking-widest ${message.includes('created') ? 'text-emerald-400' : 'text-rose-400'}`}>
                {message}
              </p>
            )}
          </footer>
        </form>
      </div>
    </div>
  )
}

