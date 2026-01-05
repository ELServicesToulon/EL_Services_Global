import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { LayoutDashboard, LogOut, CheckCircle, Clock, Truck, Package, XCircle, Map, User } from 'lucide-react'

import logo from '../assets/logo.png'

const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-indigo-100 text-indigo-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800'
}

const statusLabels = {
    pending: 'En attente',
    confirmed: 'Confirmée',
    in_progress: 'En cours',
    completed: 'Terminée',
    cancelled: 'Annulée'
}

export default function AdminDashboard() {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [bookings, setBookings] = useState([])
    const [filter, setFilter] = useState('all')

    useEffect(() => {
        checkAdminAndFetch()
    }, [navigate])

    const checkAdminAndFetch = async () => {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return navigate('/')

        // Check if user is admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', session.user.id)
            .single()

        if (!profile?.is_admin) {
            alert("Accès refusé. Vous n'êtes pas administrateur.")
            return navigate('/dashboard')
        }

        fetchBookings()
    }

    const fetchBookings = async () => {
        setLoading(true)
        // Join with profiles to get client name
        const { data, error } = await supabase
            .from('bookings')
            .select('*, profiles(full_name, email, company_name)')
            .order('created_at', { ascending: false })

        if (error) console.error('Error fetching bookings:', error)
        else setBookings(data || [])
        setLoading(false)
    }

    const handleStatusUpdate = async (id, newStatus) => {
        const { error } = await supabase
            .from('bookings')
            .update({ status: newStatus })
            .eq('id', id)

        if (!error) {
            fetchBookings() // Refresh list
        } else {
            alert("Erreur lors de la mise à jour")
        }
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        navigate('/')
    }

    const filteredBookings = filter === 'all'
        ? bookings
        : bookings.filter(b => b.status === filter)

    return (
        <div className="min-h-screen bg-gray-100 font-sans flex text-gray-800">
            {/* Sidebar Admin */}
            <aside className="w-20 lg:w-64 bg-slate-900 text-white flex flex-col fixed h-full transition-all duration-300 z-20">
                <div className="p-6 flex items-center justify-center lg:justify-start space-x-3">
                    <img src={logo} alt="Mediconvoi" className="h-8 w-auto hidden lg:block" />
                    <img src={logo} alt="Mediconvoi" className="h-8 w-auto lg:hidden" />
                    <span className="font-bold text-xl tracking-tight hidden lg:block">Admin</span>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-2">
                    <button onClick={() => setFilter('all')} className={`flex items-center w-full px-4 py-3 rounded-xl transition-colors ${filter === 'all' ? 'bg-red-600' : 'hover:bg-slate-800'}`}>
                        <LayoutDashboard className="w-5 h-5 lg:mr-3" />
                        <span className="hidden lg:inline">Vue d'ensemble</span>
                    </button>
                    <button onClick={() => setFilter('pending')} className={`flex items-center w-full px-4 py-3 rounded-xl transition-colors ${filter === 'pending' ? 'bg-slate-800 text-yellow-400' : 'hover:bg-slate-800'}`}>
                        <Clock className="w-5 h-5 lg:mr-3" />
                        <span className="hidden lg:inline">En attente</span>
                    </button>
                    <button className="flex items-center w-full px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors">
                        <User className="w-5 h-5 lg:mr-3" />
                        <span className="hidden lg:inline">Clients</span>
                    </button>
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <button onClick={handleLogout} className="flex items-center justify-center lg:justify-start w-full px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">
                        <LogOut className="w-5 h-5 lg:mr-3" />
                        <span className="hidden lg:inline">Déconnexion</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 ml-20 lg:ml-64 p-8">
                <header className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Gestion des Tournées</h1>
                        <p className="text-gray-500">Gérez les demandes et suivez les livraisons en temps réel.</p>
                    </div>
                    <button className="bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200 text-sm font-medium hover:bg-gray-50 flex items-center">
                        <Map className="w-4 h-4 mr-2" /> Vue Carte (Bientôt)
                    </button>
                </header>

                {/* Stats Cards (Mockup) */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center">
                        <div className="p-3 bg-blue-50 rounded-full mr-4">
                            <Package className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Total Courses</p>
                            <p className="text-2xl font-bold">{bookings.length}</p>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center">
                        <div className="p-3 bg-yellow-50 rounded-full mr-4">
                            <Clock className="w-6 h-6 text-yellow-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">En Attente</p>
                            <p className="text-2xl font-bold">{bookings.filter(b => b.status === 'pending').length}</p>
                        </div>
                    </div>
                </div>

                {/* Bookings Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Client</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Trajet</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date & Créneau</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-8 text-center text-gray-500">Chargement...</td>
                                    </tr>
                                ) : filteredBookings.map((booking) => (
                                    <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-gray-900">{booking.profiles?.company_name || booking.profiles?.full_name || 'Client Inconnu'}</span>
                                                <span className="text-xs text-gray-500">{booking.profiles?.email}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 max-w-xs">
                                            <div className="flex flex-col space-y-1">
                                                <div className="flex items-start text-xs text-gray-500">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1 mr-2 opacity-50"></div>
                                                    {booking.pickup_address || "Standard"}
                                                </div>
                                                <div className="flex items-start text-sm text-gray-800 font-medium">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 mr-2"></div>
                                                    {booking.delivery_address}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900 font-medium">
                                                {format(new Date(booking.scheduled_date), 'dd/MM/yyyy')}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {booking.time_slot}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[booking.status]}`}>
                                                {statusLabels[booking.status]}
                                            </span>
                                            {booking.is_urgent && (
                                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-600">
                                                    URGENT
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <select
                                                className="block w-full text-xs border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-1"
                                                value={booking.status}
                                                onChange={(e) => handleStatusUpdate(booking.id, e.target.value)}
                                            >
                                                <option value="pending">En attente</option>
                                                <option value="confirmed">Confirmée</option>
                                                <option value="in_progress">En cours</option>
                                                <option value="completed">Terminée</option>
                                                <option value="cancelled">Annulée</option>
                                            </select>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    )
}
