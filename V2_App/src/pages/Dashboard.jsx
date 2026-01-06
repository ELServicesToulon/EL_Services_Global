import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import BookingForm from '../components/BookingForm'
import BookingList from '../components/BookingList'
import InvoiceList from '../components/InvoiceList'
import EditBookingModal from '../components/EditBookingModal'
import { LogOut, Truck, User, Bell, FileText } from 'lucide-react'

import logo from '../assets/logo.png'

export default function Dashboard() {
    const navigate = useNavigate()
    const [user, setUser] = useState(null)
    const [bookings, setBookings] = useState([])
    const [loadingBookings, setLoadingBookings] = useState(true)
    const [editingBooking, setEditingBooking] = useState(null)

    // Check Auth & Fetch Data
    useEffect(() => {
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                navigate('/')
            } else {
                setUser(session.user)
                fetchBookings(session.user.id)
            }
        }
        getSession()
    }, [navigate])

    const fetchBookings = async (userId) => {
        setLoadingBookings(true)
        const { data, error } = await supabase
            .from('bookings')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })

        if (!error) {
            setBookings(data)
        }
        setLoadingBookings(false)
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        navigate('/')
    }

    return (
        <div className="min-h-screen bg-gray-50 flex font-sans">

            {/* Sidebar (Simple for V1) */}
            <aside className="w-64 bg-slate-900 hidden md:flex flex-col text-white">
                <div className="p-6 flex items-center space-x-3">
                    <img src={logo} alt="Mediconvoi" className="h-8 w-auto" />
                    <span className="font-bold text-lg tracking-tight">Mediconvoi</span>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-2">
                    <a href="#" className="flex items-center px-4 py-3 bg-blue-600/10 text-blue-400 rounded-xl transition-colors">
                        <Truck className="w-5 h-5 mr-3" />
                        Commandes
                    </a>
                    {/* Placeholder links */}
                    <a href="#" className="flex items-center px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors">
                        <User className="w-5 h-5 mr-3" />
                        Mon Profil
                    </a>
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
                    >
                        <LogOut className="w-4 h-4 mr-3" />
                        Déconnexion
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                {/* Header Mobile/Desktop */}
                <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
                    <div className="px-6 py-4 flex justify-between items-center">
                        <h1 className="text-xl font-bold text-gray-800">Tableau de bord</h1>
                        <div className="flex items-center space-x-4">
                            <button className="p-2 text-gray-400 hover:bg-gray-100 rounded-full relative">
                                <Bell className="w-5 h-5" />
                                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                            </button>
                            <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">
                                {user?.email?.charAt(0).toUpperCase()}
                            </div>
                        </div>
                    </div>
                </header>

                <div className="p-6 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Colonne Gauche: Liste des Commandes */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-gray-800">Mes dernières courses</h2>
                            <button onClick={() => user && fetchBookings(user.id)} className="text-sm text-blue-600 hover:text-blue-700 font-medium">Actualiser</button>
                        </div>

                        <BookingList 
                            bookings={bookings} 
                            loading={loadingBookings} 
                            onEdit={(booking) => setEditingBooking(booking)}
                        />

                        {/* Section Factures */}
                        <div className="mt-8">
                            <InvoiceList userId={user?.id} userEmail={user?.email} />
                        </div>
                    </div>

                    {/* Colonne Droite: Formulaire */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-24">
                            <BookingForm onBookingCreated={() => user && fetchBookings(user.id)} />
                        </div>
                    </div>

                </div>
            </main>

            {/* Modale d'édition */}
            <EditBookingModal
                booking={editingBooking}
                isOpen={!!editingBooking}
                onClose={() => setEditingBooking(null)}
                onUpdate={() => user && fetchBookings(user.id)}
            />
        </div>
    )
}
