import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useNavigate } from 'react-router-dom'
import { LogOut, Calendar, Package, User } from 'lucide-react'

export default function Dashboard() {
    const [user, setUser] = useState(null)
    const navigate = useNavigate()

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) navigate('/')
            else setUser(user)
        })
    }, [navigate])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        navigate('/')
    }

    if (!user) return null

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
            {/* Navbar */}
            <nav className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                                EL Services
                            </h1>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="hidden md:flex items-center text-sm font-medium text-gray-500 bg-gray-50 px-3 py-1 rounded-full">
                                <User size={16} className="mr-2 text-primary" />
                                {user.email}
                            </div>
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-2 text-gray-500 hover:text-red-500 transition-colors text-sm font-medium px-3 py-2 rounded-lg hover:bg-gray-50 group"
                            >
                                <LogOut size={18} className="group-hover:translate-x-1 transition-transform" />
                                <span className="hidden sm:inline">Déconnexion</span>
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <h2 className="text-3xl font-bold text-gray-900">Tableau de bord</h2>
                    <p className="mt-2 text-gray-600">Bienvenue dans votre espace client.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Action Card: Nouvelle Réservation */}
                    <div
                        onClick={() => navigate('/booking')}
                        className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer group"
                    >
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform">
                            <Calendar size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">Nouvelle Réservation</h3>
                        <p className="text-sm text-gray-500 mt-2">Planifiez une nouvelle livraison ou tournée.</p>
                    </div>

                    {/* Action Card: Mes Commandes */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer group">
                        <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary mb-4 group-hover:scale-110 transition-transform">
                            <Package size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">Mes Commandes</h3>
                        <p className="text-sm text-gray-500 mt-2">Suivez l'état de vos livraisons en cours.</p>
                    </div>
                </div>

                <div className="mt-10">
                    <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-8 text-center">
                        <h3 className="text-xl font-semibold text-indigo-900 mb-2">Construction en cours 🚧</h3>
                        <p className="text-indigo-700">
                            Nous construisons activement cette nouvelle plateforme.
                            <br />Revenez bientôt pour voir les fonctionnalités s'activer !
                        </p>
                    </div>
                </div>
            </main>
        </div>
    )
}
