import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'

function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

export default function Auctions() {
  const [auctions, setAuctions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.listAuctions().then(({ ok, data }) => {
      setLoading(false)
      if (ok) setAuctions(data)
      else setError('Failed to load auctions')
    })
  }, [])

  if (loading) {
    return (
      <div className="text-center py-12 text-slate-500">
        Loading auctions...
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-600">
        {error}
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Active auctions</h1>
      {auctions.length === 0 ? (
        <div className="card p-12 text-center text-slate-500">
          No active auctions yet. Create one if you're a seller!
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {auctions.map((a) => (
            <Link
              key={a.id}
              to={`/auctions/${a.id}`}
              className="card p-5 hover:shadow-md hover:border-brand-200 transition block"
            >
              <h2 className="font-semibold text-slate-800 truncate">{a.title}</h2>
              <p className="text-brand-600 font-bold mt-1">
                ${Number(a.current_price).toFixed(2)}
              </p>
              <p className="text-slate-500 text-sm mt-2">
                Ends {formatDate(a.end_time)}
              </p>
              <span className="inline-block mt-2 text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                {a.status}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
