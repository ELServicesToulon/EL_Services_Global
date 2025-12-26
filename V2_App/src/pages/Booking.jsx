import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar, MapPin, Truck, AlertCircle, Check } from 'lucide-react'

export default function Booking() {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [user, setUser] = useState(null)

    // Form State
    const [date, setDate] = useState('')
    const [time, setTime] = useState('09:00')
    const [details, setDetails] = useState('')
    const [isUrgent, setIsUrgent] = useState(false)
    const [success, setSuccess] = useState(false)

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) navigate('/')
            else setUser(user)
        })
    }, [navigate])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)

        try {
            // 1. Calcul DateTime
            const scheduledAt = new Date(`${date}T${time}:00`).toISOString()

            // 2. Insert Supabase
            const { error } = await supabase.from('bookings').insert({
                user_id: user.id,
                scheduled_at: scheduledAt,
                details: details,
                is_urgent: isUrgent,
                status: 'pending',
                price: isUrgent ? 45.00 : 35.00 // Prix arbitraire pour démo
            })

            if (error) throw error

            setSuccess(true)
            // Redirect after 2 seconds
            setTimeout(() => navigate('/dashboard'), 2000)

        } catch (err) {
            alert('Erreur: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-sm w-full animate-fade-in-up">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Check size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Réservation Confirmée !</h2>
                    <p className="text-gray-500">Votre demande a été enregistrée.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            <div className="max-w-3xl mx-auto px-4 py-8">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center text-gray-500 hover:text-primary transition-colors mb-6 font-medium"
                >
                    <ArrowLeft size={20} className="mr-2" /> Retour au tableau de bord
                </button>

                <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
                    <div className="bg-primary p-6 sm:p-10 text-white">
                        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                            <Truck className="opacity-90" /> Nouvelle Course
                        </h1>
                        <p className="opacity-90">Remplissez les détails pour commander un coursier.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 sm:p-10 space-y-8">

                        {/* DATE & HEURE */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                    <Calendar size={18} className="text-secondary" /> Date
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Heure de collecte</label>
                                <input
                                    type="time"
                                    required
                                    value={time}
                                    onChange={(e) => setTime(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none transition-all"
                                />
                            </div>
                        </div>

                        {/* DETAILS */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                <MapPin size={18} className="text-secondary" /> Détails (Adresses, Instructions)
                            </label>
                            <textarea
                                required
                                rows="3"
                                value={details}
                                onChange={(e) => setDetails(e.target.value)}
                                placeholder="Ex: Pharmacie du Port vers EHPAD Les Oliviers. 2 cartons."
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none transition-all"
                            ></textarea>
                        </div>

                        {/* URGENCE */}
                        <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 flex items-start gap-4 cursor-pointer hover:bg-orange-100/50 transition-colors" onClick={() => setIsUrgent(!isUrgent)}>
                            <div className={`mt-1 w-6 h-6 rounded border flex items-center justify-center transition-colors ${isUrgent ? 'bg-orange-500 border-orange-500' : 'bg-white border-gray-300'}`}>
                                {isUrgent && <Check size={14} className="text-white" />}
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-gray-800 flex items-center gap-2">
                                    <AlertCircle size={16} className="text-orange-500" /> Commande Urgente
                                </h4>
                                <p className="text-sm text-gray-600 mt-1">Cochez si la livraison doit être effectuée en priorité (Majoration applicable).</p>
                            </div>
                        </div>

                        {/* SUBMIT */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-primary to-secondary hover:brightness-110 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all transform active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <span>Envoi en cours...</span>
                            ) : (
                                <>Valider la réservation</>
                            )}
                        </button>

                    </form>
                </div>
            </div>
        </div>
    )
}
