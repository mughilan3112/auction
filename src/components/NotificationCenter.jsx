import { useState, useEffect } from 'react'
import { api } from '../api'

export default function NotificationCenter() {
    const [notifications, setNotifications] = useState([])
    const [show, setShow] = useState(false)
    const [unreadCount, setUnreadCount] = useState(0)

    useEffect(() => {
        const fetchNotifications = async () => {
            const { ok, data } = await api.listNotifications()
            if (ok) {
                setNotifications(data)
                setUnreadCount(data.filter(n => !n.is_read).length)
            }
        }
        fetchNotifications()
        const interval = setInterval(fetchNotifications, 30000) // update every 30s
        return () => clearInterval(interval)
    }, [])

    const handleRead = async (id) => {
        const { ok } = await api.markNotificationRead(id)
        if (ok) {
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
            setUnreadCount(prev => Math.max(0, prev - 1))
        }
    }

    return (
        <div className="relative">
            <button
                onClick={() => setShow(!show)}
                className={`relative p-2 transition-all duration-300 ${show ? 'text-indigo-400' : 'text-slate-500 hover:text-white'}`}
            >
                <div className="text-xl relative z-10">
                    <span role="img" aria-label="bell">🔔</span>
                </div>
                {unreadCount > 0 && (
                    <>
                        <span className="absolute top-1 right-1 w-4 h-4 bg-indigo-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full z-20 shadow-lg shadow-indigo-500/40">
                            {unreadCount}
                        </span>
                        <span className="absolute top-1 right-1 w-4 h-4 bg-indigo-500 rounded-full animate-ping z-10 opacity-75"></span>
                    </>
                )}
            </button>

            {show && (
                <div className="absolute right-0 mt-6 w-96 glass-card !rounded-[2.5rem] border-white/10 p-6 z-[100] shadow-2xl animate-float">
                    <div className="absolute -inset-0.5 bg-gradient-to-br from-indigo-500/20 to-purple-600/20 rounded-[2.5rem] opacity-50 blur-xl -z-10"></div>

                    <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Notifications</h3>
                        </div>
                        <button onClick={() => setShow(false)} className="text-slate-600 hover:text-white transition-colors text-lg">✕</button>
                    </div>

                    <div className="max-h-[70vh] overflow-y-auto space-y-4 no-scrollbar">
                        {notifications.length === 0 ? (
                            <div className="py-16 text-center space-y-4">
                                <div className="text-4xl opacity-20 grayscale">📭</div>
                                <p className="text-slate-600 text-[10px] font-bold uppercase tracking-[0.3em]">No notifications yet</p>
                            </div>
                        ) : (
                            notifications.map((n) => (
                                <div
                                    key={n.id}
                                    className={`p-5 rounded-[2rem] border transition-all duration-500 cursor-pointer group ${n.is_read
                                        ? 'bg-slate-900/40 border-white/5 opacity-50 hover:opacity-100 hover:border-white/10'
                                        : 'bg-indigo-500/5 border-indigo-500/30 shadow-lg shadow-indigo-500/10'
                                        }`}
                                    onClick={() => !n.is_read && handleRead(n.id)}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${n.is_read ? 'text-slate-500' : 'text-indigo-400'
                                            }`}>
                                            {n.title}
                                        </span>
                                        <span className="text-[8px] font-bold text-slate-700 group-hover:text-slate-500 transition-colors">
                                            {new Date(n.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p className={`text-xs font-medium leading-relaxed ${n.is_read ? 'text-slate-500' : 'text-slate-300'
                                        }`}>
                                        {n.message}
                                    </p>
                                    {!n.is_read && (
                                        <div className="mt-3 flex justify-end">
                                            <div className="text-[8px] font-bold uppercase tracking-widest text-indigo-500/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                                Mark as read →
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

