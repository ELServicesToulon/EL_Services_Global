import { useState, useEffect } from 'react'
import { TARIFS, FORFAIT_RESIDENT, computePrice, formatCurrency } from '../lib/pricing'
import { getSlotPeriodsForDate } from '../lib/slots'
import { supabase } from '../lib/supabaseClient'
import { Truck, Clock, Calendar, Check, X, ShieldCheck, MapPin, Plus, Minus, Info, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import CapsuleCalendar from '../components/CapsuleCalendar'

export default function PublicBooking() {
    const navigate = useNavigate()
    const [showConfigModal, setShowConfigModal] = useState(false)
    const [showResidentModal, setShowResidentModal] = useState(false)

    // Slot availability state
    const [slotPeriods, setSlotPeriods] = useState([])
    const [loadingSlots, setLoadingSlots] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [userEmail, setUserEmail] = useState('')
    const [message, setMessage] = useState(null)

    // Booking State
    const [config, setConfig] = useState({
        stops: 1,
        isReturn: false,
        isSaturday: false,
        isUrgent: false,
        residentMode: null, // 'standard' | 'urgence'
        selectedDate: null,
        selectedSlot: null
    })

    const [priceResult, setPriceResult] = useState(null)

    // Fetch slot availability when date changes
    useEffect(() => {
        if (config.selectedDate) {
            setLoadingSlots(true)
            setConfig(c => ({ ...c, selectedSlot: null }))
            getSlotPeriodsForDate(config.selectedDate)
                .then(periods => setSlotPeriods(periods))
                .catch(err => console.error('Error fetching slots:', err))
                .finally(() => setLoadingSlots(false))
        }
    }, [config.selectedDate])

    useEffect(() => {
        if (config.residentMode) {
            setPriceResult({
                total: config.residentMode === 'standard' ? FORFAIT_RESIDENT.STANDARD_PRICE : FORFAIT_RESIDENT.URGENCE_PRICE,
                isFixed: true
            })
        } else {
            const res = computePrice(config)
            setPriceResult(res)
        }
    }, [config])

    // Submit booking to Supabase
    const handleSubmitBooking = async () => {
        if (!config.selectedDate || !config.selectedSlot) {
            setMessage({ type: 'error', text: 'Veuillez choisir une date et un créneau' })
            return
        }
        if (!userEmail || !userEmail.includes('@')) {
            setMessage({ type: 'error', text: 'Veuillez entrer un email valide' })
            return
        }

        setSubmitting(true)
        setMessage(null)

        // Check if user is logged in
        const { data: { session } } = await supabase.auth.getSession()

        const booking = {
            user_id: session?.user?.id || null,
            email: userEmail,
            scheduled_date: config.selectedDate,
            time_slot: config.selectedSlot,
            stops_count: config.stops,
            has_return: config.isReturn,
            is_urgent: config.isUrgent,
            is_saturday: config.isSaturday,
            resident_mode: config.residentMode,
            price_estimated: priceResult?.total || 0,
            status: 'pending'
        }

        const { error } = await supabase.from('bookings').insert(booking)

        setSubmitting(false)

        if (error) {
            console.error('Booking error:', error)
            setMessage({ type: 'error', text: 'Erreur lors de la réservation. Réessayez.' })
        } else {
            setMessage({ type: 'success', text: 'Réservation confirmée ! Un email vous sera envoyé.' })
            // Reset form after 2s
            setTimeout(() => {
                setShowConfigModal(false)
                setConfig({ stops: 1, isReturn: false, isSaturday: false, isUrgent: false, residentMode: null, selectedDate: null, selectedSlot: null })
                setUserEmail('')
                setMessage(null)
            }, 2000)
        }
    }

    const openConfigModal = (type) => {
        const isSat = type === 'Samedi'
        const isUrg = type === 'Urgent'
        setConfig(prev => ({ ...prev, isSaturday: isSat, isUrgent: isUrg, residentMode: null }))
        setShowConfigModal(true)
    }

    const openResidentModal = (mode) => {
        setConfig(prev => ({ ...prev, residentMode: mode }))
        setShowResidentModal(true)
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 text-slate-800 font-sans antialiased">

            {/* Header / Nav */}
            <header className="bg-white/90 backdrop-blur-md shadow-md border-b border-gray-200/60 sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center space-x-2 cursor-pointer transition-transform hover:scale-105" onClick={() => navigate('/')}>
                        <div className="bg-blue-600 p-1.5 rounded-lg shadow-sm">
                            <Truck className="h-5 w-5 text-white" />
                        </div>
                        <span className="font-semibold text-lg text-gray-700">My Awesome Service</span>
                    </div>
                    <div>
                        {/* Placeholder for navigation items */}
                        {/* <button className="text-blue-600 hover:text-blue-800 font-medium">Login</button> */}
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="py-12 md:py-20">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h1 className="text-4xl md:text-5xl font-extrabold text-gray-800 mb-4 tracking-tight">
                        Réservez Votre Transport Facilement et Rapidement
                    </h1>
                    <p className="text-lg text-gray-600 mb-8">
                        Planifiez votre prochain transport en quelques clics. Choisissez parmi nos options flexibles et profitez d'un service de qualité.
                    </p>
                    <div className="space-x-4">
                        <button
                            onClick={() => openConfigModal(null)}
                            className="transition-colors duration-300 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50">
                            Réserver un Transport Standard
                        </button>
                        <button
                            onClick={() => openResidentModal('standard')}
                            className="transition-colors duration-300 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-xl shadow-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50">
                            Forfait Résident
                        </button>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-12 bg-white/80 backdrop-blur-sm shadow-inner">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-3xl font-semibold text-gray-800 mb-8 text-center">Pourquoi Choisir Notre Service ?</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

                        <div className="p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300">
                            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 text-indigo-600 mb-4">
                                <Clock className="h-6 w-6" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-700 mb-2">Ponctualité Garantie</h3>
                            <p className="text-gray-600">Nous respectons vos délais. Soyez assuré d'un service ponctuel et fiable.</p>
                        </div>

                        <div className="p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300">
                            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 mb-4">
                                <Check className="h-6 w-6" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-700 mb-2">Réservation Facile</h3>
                            <p className="text-gray-600">Notre plateforme intuitive vous permet de réserver en quelques étapes simples.</p>
                        </div>

                        <div className="p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300">
                            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-orange-100 text-orange-600 mb-4">
                                <MapPin className="h-6 w-6" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-700 mb-2">Large Couverture</h3>
                            <p className="text-gray-600">Nous desservons une vaste zone géographique pour répondre à tous vos besoins de transport.</p>
                        </div>

                    </div>
                </div>
            </section>

            {/* Modals */}
            {showConfigModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full mx-4">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-semibold text-gray-800">Configuration de la Réservation</h2>
                            <button onClick={() => setShowConfigModal(false)} className="text-gray-500 hover:text-gray-700">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        {/* Calendar */}
                        <div className="mb-4">
                            <label htmlFor="date" className="block text-gray-700 text-sm font-bold mb-2">Sélectionner une date:</label>
                            <CapsuleCalendar onDateSelect={(date) => setConfig(c => ({ ...c, selectedDate: date }))} />
                        </div>

                        {/* Slot selection */}
                        {config.selectedDate && (
                            <div className="mb-4">
                                <label htmlFor="slot" className="block text-gray-700 text-sm font-bold mb-2">Sélectionner un créneau:</label>
                                {loadingSlots ? (
                                    <div className="text-center"><Loader2 className="inline-block animate-spin" /> Chargement des créneaux...</div>
                                ) : (
                                    <select
                                        id="slot"
                                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                        value={config.selectedSlot || ''}
                                        onChange={(e) => setConfig(c => ({ ...c, selectedSlot: e.target.value }))}
                                    >
                                        <option value="" disabled>Choisissez un créneau</option>
                                        {slotPeriods.map(slot => (
                                            <option key={slot} value={slot}>{slot}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        )}

                        {/* Stops Count */}
                        <div className="mb-4">
                            <label htmlFor="stops" className="block text-gray-700 text-sm font-bold mb-2">Nombre d'arrêts:</label>
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => setConfig(c => ({ ...c, stops: Math.max(1, c.stops - 1) }))}
                                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                                >
                                    <Minus />
                                </button>
                                <input
                                    type="number"
                                    id="stops"
                                    className="shadow appearance-none border rounded w-16 py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-center"
                                    value={config.stops}
                                    readOnly
                                />
                                <button
                                    onClick={() => setConfig(c => ({ ...c, stops: c.stops + 1 }))}
                                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                                >
                                    <Plus />
                                </button>
                            </div>
                        </div>

                        {/* Return Trip */}
                        <div className="mb-4">
                            <label className="inline-flex items-center">
                                <input
                                    type="checkbox"
                                    className="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-0"
                                    checked={config.isReturn}
                                    onChange={() => setConfig(c => ({ ...c, isReturn: !c.isReturn }))}
                                />
                                <span className="ml-2 text-gray-700 font-medium">Voyage Retour</span>
                            </label>
                        </div>

                        {/* Price estimate */}
                        {priceResult && (
                            <div className="mb-4 border-t pt-4">
                                <p className="text-gray-700">
                                    Prix estimé: <span className="font-semibold">{formatCurrency(priceResult.total)}</span>
                                    {priceResult.isFixed && <span className="text-sm text-green-600"> (Forfait)</span>}
                                </p>
                            </div>
                        )}

                        {/* Email Input */}
                        <div className="mb-6">
                            <label htmlFor="email" className="block text-gray-700 text-sm font-bold mb-2">Email:</label>
                            <input
                                type="email"
                                id="email"
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                placeholder="Votre email"
                                value={userEmail}
                                onChange={(e) => setUserEmail(e.target.value)}
                            />
                        </div>

                        {/* Submit Button */}
                        <button
                            onClick={handleSubmitBooking}
                            disabled={submitting}
                            className={`transition-colors duration-300 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-xl shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {submitting ? <Loader2 className="inline-block animate-spin mr-2" /> : <Check className="inline-block mr-2" />}
                            Confirmer la Réservation
                        </button>

                        {/* Message */}
                        {message && (
                            <div className={`mt-4 p-3 rounded-md ${message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                {message.text}
                            </div>
                        )}

                    </div>
                </div>
            )}

            {/* Resident Modal */}
            {showResidentModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full mx-4">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-semibold text-gray-800">Forfait Résident</h2>
                            <button onClick={() => setShowResidentModal(false)} className="text-gray-500 hover:text-gray-700">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <p className="text-gray-700 mb-4">Choisissez votre type de forfait résident:</p>

                        <button
                            onClick={() => {
                                setConfig(prev => ({ ...prev, residentMode: 'standard', selectedDate: new Date().toISOString().slice(0, 10) }))
                                setShowResidentModal(false)
                                setShowConfigModal(true)
                            }}
                            className="transition-colors duration-300 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-xl shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 block w-full text-center mb-2"
                        >
                            Forfait Standard
                        </button>

                        <button
                            onClick={() => {
                                setConfig(prev => ({ ...prev, residentMode: 'urgence', selectedDate: new Date().toISOString().slice(0, 10) }))
                                setShowResidentModal(false)
                                setShowConfigModal(true)
                            }}
                            className="transition-colors duration-300 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-xl shadow-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 block w-full text-center"
                        >
                            Forfait Urgence
                        </button>

                    </div>
                </div>
            )}

            {/* Footer */}
            <footer className="bg-white border-t border-gray-200 py-6 mt-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-500">
                    <p>&copy; {new Date().getFullYear()} My Awesome Service. Tous droits réservés.</p>
                </div>
            </footer>

        </div>
    )
}