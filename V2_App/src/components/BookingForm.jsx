import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Calendar, Clock, MapPin, Package, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'

export default function BookingForm({ onBookingCreated }) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    // Form State
    const [date, setDate] = useState('')
    const [timeSlot, setTimeSlot] = useState('Matin')
    const [pickupAddr, setPickupAddr] = useState('')
    const [dropoffAddr, setDropoffAddr] = useState('') // Default addresses could be loaded from profile later
    const [packages, setPackages] = useState(1)
    const [isUrgent, setIsUrgent] = useState(false)
    const [notes, setNotes] = useState('')
    
    // Antigravity V2 State
    const [isAntigravity, setIsAntigravity] = useState(false)
    const [gravityOffset, setGravityOffset] = useState(20) // Default 20% comfort

    // Set default date to tomorrow
    useEffect(() => {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        setDate(tomorrow.toISOString().split('T')[0])
    }, [])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) throw new Error("Vous devez être connecté.")

            // First check if profile exists, if not trigger creates it but race condition might exist
            // We'll proceed assuming profile exists due to our trigger.

            const { error: insertError } = await supabase
                .from('bookings')
                .insert([
                    {
                        user_id: user.id,
                        scheduled_date: date,
                        time_slot: timeSlot,
                        pickup_address: pickupAddr,
                        delivery_address: dropoffAddr,
                        packages_count: packages,
                        is_urgent: isUrgent,
                        notes: notes,
                        status: 'pending',
                        // Champs V2 Antigravity (Rétro-compatible: null si non utilisé)
                        treadmill_model: isAntigravity ? 'AG-5000' : null,
                        gravity_offset: isAntigravity ? gravityOffset : 0
                    }
                ])

            if (insertError) throw insertError

            // Success
            setNotes('')
            setIsUrgent(false)
            if (onBookingCreated) onBookingCreated()

        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center">
                <Package className="w-5 h-5 mr-2 text-blue-600" />
                Nouvelle Demande de Livraison
            </h2>

            {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">

                {/* Date & Creneau */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                            <input
                                type="date"
                                required
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Créneau</label>
                        <div className="relative">
                            <Clock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                            <select
                                value={timeSlot}
                                onChange={(e) => setTimeSlot(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm bg-white"
                            >
                                <option value="Matin">Matin (08h - 12h)</option>
                                <option value="Après-midi">Après-midi (13h - 17h)</option>
                                <option value="Soir">Soir (18h - 20h)</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Adresses */}
                <div className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Adresse d'Enlèvement</label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Ex: Clinique Saint-Jean, Toulon"
                                value={pickupAddr}
                                onChange={(e) => setPickupAddr(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Adresse de Livraison</label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                required
                                placeholder="Ex: Laboratoire BioSud, Hyères"
                                value={dropoffAddr}
                                onChange={(e) => setDropoffAddr(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                            />
                        </div>
                    </div>
                </div>

                {/* Options */}
                <div className="space-y-4 pt-2 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <label className="text-sm text-gray-700 mr-2">Colis:</label>
                            <input
                                type="number"
                                min="1"
                                max="20"
                                value={packages}
                                onChange={(e) => setPackages(parseInt(e.target.value))}
                                className="w-16 pl-2 pr-1 py-1 border border-gray-200 rounded-md text-sm text-center"
                            />
                        </div>

                        <label className="flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isUrgent}
                                onChange={(e) => setIsUrgent(e.target.checked)}
                                className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
                            />
                            <span className="ml-2 text-sm text-gray-700 flex items-center">
                                Urgent
                                {isUrgent && <AlertCircle className="w-3 h-3 text-red-500 ml-1" />}
                            </span>
                        </label>
                    </div>

                    {/* Section Antigravité (New Feature V2) */}
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                        <label className="flex items-center cursor-pointer mb-2">
                            <input
                                type="checkbox"
                                checked={isAntigravity}
                                onChange={(e) => setIsAntigravity(e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm font-medium text-blue-800 flex items-center">
                                🚀 Séance Antigravité (Tapis V2)
                            </span>
                        </label>

                        {isAntigravity && (
                            <div className="ml-6 space-y-2 animate-fadeIn">
                                <div>
                                    <label className="block text-xs font-semibold text-blue-700 mb-1">
                                        Allègement Gravité: {gravityOffset}%
                                    </label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        step="5"
                                        value={gravityOffset}
                                        onChange={(e) => setGravityOffset(parseInt(e.target.value))}
                                        className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer"
                                    />
                                    <div className="flex justify-between text-xs text-blue-400">
                                        <span>0% (Normal)</span>
                                        <span>100% (Apesanteur)</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Action */}
                <button
                    type="submit"
                    disabled={loading}
                    className={`w-full py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm transition-all duration-200 flex justify-center items-center ${isUrgent ? 'bg-red-600 hover:bg-red-700 ring-2 ring-red-100' : 'bg-blue-600 hover:bg-blue-700 ring-2 ring-blue-100'}`}
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirmer la demande"}
                </button>

            </form>
        </div>
    )
}
