import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api'

export default function EditAuction() {
    const { id } = useParams()
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [startingPrice, setStartingPrice] = useState('')
    const [minIncrement, setMinIncrement] = useState('')
    const [startDate, setStartDate] = useState('')
    const [startTime, setStartTime] = useState('')
    const [endDate, setEndDate] = useState('')
    const [endTime, setEndTime] = useState('')

    const [images, setImages] = useState([])
    const [category, setCategory] = useState('Others')
    const [currentImagePaths, setCurrentImagePaths] = useState([])
    const categories = ["Electronics", "Automotive", "Fashion", "Collectibles", "Real Estate", "Home & Garden", "Art", "Others"]

    const [message, setMessage] = useState('')
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState(false)

    const navigate = useNavigate()
    const token = localStorage.getItem('token')

    const pad = (num) => String(num).padStart(2, '0');
    const getDateStr = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    };
    const getTimeStr = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    useEffect(() => {
        if (!token) {
            navigate('/login', { replace: true })
            return
        }

        const fetchData = async () => {
            try {
                const [sellerRes, auctionRes] = await Promise.all([
                    api.getSellerMe(),
                    api.getAuction(id)
                ])

                setLoading(false)

                if (!sellerRes.ok) {
                    navigate('/dashboard', { replace: true })
                    return
                }

                if (auctionRes.ok) {
                    const a = auctionRes.data
                    if (a.seller_id !== sellerRes.data.id) {
                        navigate('/dashboard', { replace: true })
                        return
                    }
                    setTitle(a.title)
                    setDescription(a.description)
                    setStartingPrice(a.starting_price.toString())
                    setMinIncrement(a.min_increment.toString())
                    setStartDate(getDateStr(a.start_time))
                    setStartTime(getTimeStr(a.start_time))
                    setEndDate(getDateStr(a.end_time))
                    setEndTime(getTimeStr(a.end_time))
                    setCategory(a.category || 'Others')
                    setCurrentImagePaths(a.image_paths || [])

                } else {
                    setMessage('Auction not found')
                }
            } catch (err) {
                setLoading(false)
                setMessage('Error loading auction data')
            }
        }

        fetchData()
    }, [id, token, navigate])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setMessage('')

        const start = new Date(`${startDate}T${startTime}`).toISOString()
        const end = new Date(`${endDate}T${endTime}`).toISOString()

        if (new Date(start) >= new Date(end)) {
            setMessage('End time must be after start time')
            return
        }

        setUpdating(true)
        const formData = new FormData()
        formData.append('title', title.trim())
        formData.append('description', description.trim())
        formData.append('starting_price', parseFloat(startingPrice))
        formData.append('min_increment', parseFloat(minIncrement))
        formData.append('start_time', start)
        formData.append('end_time', end)
        formData.append('category', category)


        for (let i = 0; i < images.length; i++) {
            formData.append('images', images[i])
        }

        const { ok, data } = await api.updateAuction(id, formData)
        setUpdating(false)
        if (ok) {
            setMessage('Auction updated successfully!')
            setTimeout(() => navigate(`/auctions/${id}`), 1500)
        } else {
            setMessage(data.detail || 'Failed to update auction')
        }
    }

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500 font-bold uppercase tracking-[0.3em] gap-6">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            Loading...
        </div>
    )

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    return (
        <div className="max-w-4xl mx-auto px-6 py-12">
            <header className="mb-12 text-center">
                <h1 className="text-5xl font-bold gradient-text tracking-tighter mb-4">EDIT AUCTION.</h1>
                <p className="text-slate-500 font-semibold uppercase tracking-[0.3em] text-[10px]">Update your auction details</p>
            </header>

            <div className="glass-card !rounded-[3rem] p-12 border-white/5 relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-br from-indigo-500/20 to-purple-600/20 rounded-[3rem] opacity-0 group-hover:opacity-100 transition-opacity blur-2xl"></div>

                <form onSubmit={handleSubmit} className="relative z-10 space-y-10">
                    <div className="grid lg:grid-cols-2 gap-10">
                        {/* Core Data */}
                        <div className="space-y-8">
                            <div>
                                <label className="text-[9px] font-bold uppercase text-slate-500 tracking-widest block mb-3 px-1">Item Title</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="input-field"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-[9px] font-bold uppercase text-slate-500 tracking-widest block mb-3 px-1">Item Description</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="input-field min-h-[160px] resize-none"
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

                        {/* Timing & Capital */}
                        <div className="space-y-8">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="text-[9px] font-bold uppercase text-slate-500 tracking-widest block mb-3 px-1">Starting Price (₹)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={startingPrice}
                                        onChange={(e) => setStartingPrice(e.target.value)}
                                        className="input-field"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] font-bold uppercase text-slate-500 tracking-widest block mb-3 px-1">Min. Increment (₹)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={minIncrement}
                                        onChange={(e) => setMinIncrement(e.target.value)}
                                        className="input-field"
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
                                <label className="text-[9px] font-bold uppercase text-slate-500 tracking-widest block mb-3 px-1">Photos</label>
                                <div className="grid grid-cols-4 gap-4 mb-6">
                                    {currentImagePaths.map((path, idx) => (
                                        <div key={idx} className="aspect-square glass-card !rounded-2xl border-white/5 overflow-hidden group/img relative">
                                            <img src={`${API_URL}${path}`} className="w-full h-full object-cover grayscale opacity-50 group-hover/img:grayscale-0 group-hover/img:opacity-100 transition-all" alt="" />
                                            <div className="absolute inset-0 bg-indigo-500/10 opacity-0 group-hover/img:opacity-100 transition-opacity pointer-events-none" />
                                        </div>
                                    ))}
                                </div>

                                <div className="relative group/upload">
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*"
                                        onChange={(e) => setImages(Array.from(e.target.files))}
                                        className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
                                    />
                                    <div className="w-full py-8 border-2 border-dashed border-white/10 rounded-[2rem] bg-slate-950/40 group-hover/upload:border-indigo-500/50 group-hover/upload:bg-indigo-500/5 transition-all text-center">
                                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 group-hover/upload:text-indigo-400">
                                            {images.length > 0 ? `${images.length} New files staged` : 'Add more photos'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <footer className="pt-10 border-t border-white/5 flex flex-col md:flex-row gap-6 items-center">
                        <button
                            type="submit"
                            disabled={updating}
                            className="btn-primary w-full md:w-auto !px-16 !py-5 text-xs tracking-[0.3em] uppercase"
                        >
                            {updating ? 'SAVING...' : 'SAVE CHANGES'}
                        </button>

                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            className="btn-secondary w-full md:w-auto !px-12 !py-5 text-xs tracking-[0.2em] uppercase"
                        >
                            Cancel
                        </button>

                        {message && (
                            <p className={`flex-1 text-center md:text-left text-[10px] font-black uppercase tracking-widest ${message.includes('successfully') ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {message}
                            </p>
                        )}
                    </footer>
                </form>
            </div>
        </div>
    )
}

