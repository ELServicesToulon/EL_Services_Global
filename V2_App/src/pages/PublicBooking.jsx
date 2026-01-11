import { useState, useEffect } from 'react'
import { TARIFS, FORFAIT_RESIDENT, computePrice, formatCurrency } from '../lib/pricing'
import { getSlotPeriodsForDate } from '../lib/slots'
import { supabase } from '../lib/supabaseClient'
import { Truck, Clock, Calendar, Check, X, ShieldCheck, MapPin, Plus, Minus, Info, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import CapsuleCalendar from '../components/CapsuleCalendar'
import { motion } from 'framer-motion'

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
        <motion.div
            className="min-h-screen bg-slate-900 text-white font-sans antialiased overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
        >
            {/* Aurora Gradients */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-purple-500 to-indigo-500 rounded-full blur-3xl opacity-40"></div>
                <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-gradient-to-bl from-pink-500 to-red-500 rounded-full blur-3xl opacity-40"></div>
            </div>


            {/* Header / Nav */}
            <header className="bg-slate-900/90 backdrop-blur-md shadow-md border-b border-white/10 sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <motion.div
                        className="flex items-center space-x-2 cursor-pointer transition-transform hover:scale-105"
                        onClick={() => navigate('/')}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <div
                            className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-500"
                        />
                        <span className="font-bold text-lg">LOGOMARK</span>
                    </motion.div>
                    <nav className="space-x-4">
                        <motion.button
                            className="py-2 px-4 rounded-md bg-white/5 hover:bg-white/10 transition-colors"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            Sign In
                        </motion.button>
                    </nav>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 relative z-10">
                {/* Hero Section */}
                <section className="mb-16">
                    <motion.h1
                        className="text-6xl font-extrabold mb-4 tracking-tight leading-tight"
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.2 }}
                    >
                        Book Your Ride. <br />
                        <span className="text-purple-400">Effortless.</span>
                    </motion.h1>
                    <motion.p
                        className="text-lg text-slate-400 mb-8"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                    >
                        Seamless scheduling for your transportation needs.
                    </motion.p>
                </section>

                {/* Booking Options - Bento Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Standard Booking */}
                    <motion.div
                        className="bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/10 hover:border-purple-400 transition-colors"
                        whileHover={{ y: -5 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => openConfigModal('Standard')}
                    >
                        <div className="flex items-center space-x-3 mb-4">
                            <Truck className="w-6 h-6 text-purple-400" />
                            <h3 className="text-xl font-semibold">Standard</h3>
                        </div>
                        <p className="text-slate-400">Quick and reliable transport.</p>
                    </motion.div>

                    {/* Saturday Booking */}
                    <motion.div
                        className="bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/10 hover:border-purple-400 transition-colors"
                        whileHover={{ y: -5 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => openConfigModal('Samedi')}
                    >
                        <div className="flex items-center space-x-3 mb-4">
                            <Calendar className="w-6 h-6 text-pink-400" />
                            <h3 className="text-xl font-semibold">Saturday</h3>
                        </div>
                        <p className="text-slate-400">Weekend transport option.</p>
                    </motion.div>

                    {/* Urgent Booking */}
                    <motion.div
                        className="bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/10 hover:border-purple-400 transition-colors"
                        whileHover={{ y: -5 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => openConfigModal('Urgent')}
                    >
                        <div className="flex items-center space-x-3 mb-4">
                            <Clock className="w-6 h-6 text-red-400" />
                            <h3 className="text-xl font-semibold">Urgent</h3>
                        </div>
                        <p className="text-slate-400">Fast delivery for critical needs.</p>
                    </motion.div>

                    {/* Resident Standard */}
                    <motion.div
                        className="bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/10 hover:border-purple-400 transition-colors"
                        whileHover={{ y: -5 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => openResidentModal('standard')}
                    >
                        <div className="flex items-center space-x-3 mb-4">
                            <ShieldCheck className="w-6 h-6 text-green-400" />
                            <h3 className="text-xl font-semibold">Resident Standard</h3>
                        </div>
                        <p className="text-slate-400">Standard resident booking.</p>
                    </motion.div>

                    {/* Resident Urgent */}
                    <motion.div
                        className="bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/10 hover:border-purple-400 transition-colors"
                        whileHover={{ y: -5 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => openResidentModal('urgence')}
                    >
                        <div className="flex items-center space-x-3 mb-4">
                            <MapPin className="w-6 h-6 text-orange-400" />
                            <h3 className="text-xl font-semibold">Resident Urgent</h3>
                        </div>
                        <p className="text-slate-400">Urgent resident booking.</p>
                    </motion.div>
                </div>
            </main>


            {/* Modals */}
            {showConfigModal && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <motion.div
                        className="bg-slate-800 rounded-2xl shadow-lg p-8 max-w-md w-full border border-white/10"
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0.8 }}
                    >
                        <h2 className="text-2xl font-bold mb-4">Configure Your Booking</h2>

                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-2">Select Date</label>
                            <CapsuleCalendar onDateSelect={(date) => setConfig(c => ({ ...c, selectedDate: date }))} />
                        </div>

                        {config.selectedDate && (
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">Select Time Slot</label>
                                {loadingSlots ? (
                                    <div className="flex items-center justify-center"><Loader2 className="animate-spin" /></div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-2">
                                        {slotPeriods.map(slot => (
                                            <button
                                                key={slot}
                                                className={`rounded-md py-2 px-4 text-sm ${config.selectedSlot === slot ? 'bg-purple-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'} transition-colors`}
                                                onClick={() => setConfig(c => ({ ...c, selectedSlot: slot }))}
                                            >
                                                {slot}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-2">Number of Stops</label>
                            <div className="flex items-center space-x-2">
                                <button
                                    className="rounded-full p-2 bg-slate-700 hover:bg-slate-600 transition-colors"
                                    onClick={() => setConfig(c => ({ ...c, stops: Math.max(1, c.stops - 1) }))}
                                >
                                    <Minus className="w-4 h-4" />
                                </button>
                                <span>{config.stops}</span>
                                <button
                                    className="rounded-full p-2 bg-slate-700 hover:bg-slate-600 transition-colors"
                                    onClick={() => setConfig(c => ({ ...c, stops: c.stops + 1 }))}
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-2">Return Trip?</label>
                            <button
                                className={`rounded-md py-2 px-4 text-sm ${config.isReturn ? 'bg-purple-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'} transition-colors`}
                                onClick={() => setConfig(c => ({ ...c, isReturn: !config.isReturn }))}
                            >
                                {config.isReturn ? 'Yes' : 'No'}
                            </button>
                        </div>

                        {priceResult && (
                            <div className="mb-4">
                                <p className="text-lg font-semibold">Estimated Price: {formatCurrency(priceResult.total)}</p>
                                {priceResult.isFixed && <p className="text-sm text-slate-400">Fixed Price</p>}
                            </div>
                        )}

                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-2">Email</label>
                            <input
                                type="email"
                                className="w-full rounded-md bg-slate-700 border-none text-white py-2 px-3"
                                value={userEmail}
                                onChange={e => setUserEmail(e.target.value)}
                            />
                        </div>

                        {message && (
                            <div className={`rounded-md py-2 px-4 mb-4 ${message.type === 'error' ? 'bg-red-500' : 'bg-green-500'} text-white`}>
                                {message.text}
                            </div>
                        )}

                        <div className="flex justify-end space-x-2">
                            <button
                                className="rounded-md py-2 px-4 bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
                                onClick={() => setShowConfigModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="rounded-md py-2 px-4 bg-purple-500 hover:bg-purple-600 text-white transition-colors"
                                onClick={handleSubmitBooking}
                                disabled={submitting}
                            >
                                {submitting ? <Loader2 className="animate-spin" /> : 'Book Now'}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}

            {showResidentModal && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <motion.div
                        className="bg-slate-800 rounded-2xl shadow-lg p-8 max-w-md w-full border border-white/10"
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0.8 }}
                    >
                        <h2 className="text-2xl font-bold mb-4">Resident Booking</h2>

                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-2">Select Date</label>
                            <CapsuleCalendar onDateSelect={(date) => setConfig(c => ({ ...c, selectedDate: date }))} />
                        </div>

                        {config.selectedDate && (
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2">Select Time Slot</label>
                                {loadingSlots ? (
                                    <div className="flex items-center justify-center"><Loader2 className="animate-spin" /></div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-2">
                                        {slotPeriods.map(slot => (
                                            <button
                                                key={slot}
                                                className={`rounded-md py-2 px-4 text-sm ${config.selectedSlot === slot ? 'bg-purple-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'} transition-colors`}
                                                onClick={() => setConfig(c => ({ ...c, selectedSlot: slot }))}
                                            >
                                                {slot}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {priceResult && (
                            <div className="mb-4">
                                <p className="text-lg font-semibold">Estimated Price: {formatCurrency(priceResult.total)}</p>
                                {priceResult.isFixed && <p className="text-sm text-slate-400">Fixed Price</p>}
                            </div>
                        )}

                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-2">Email</label>
                            <input
                                type="email"
                                className="w-full rounded-md bg-slate-700 border-none text-white py-2 px-3"
                                value={userEmail}
                                onChange={e => setUserEmail(e.target.value)}
                            />
                        </div>

                        {message && (
                            <div className={`rounded-md py-2 px-4 mb-4 ${message.type === 'error' ? 'bg-red-500' : 'bg-green-500'} text-white`}>
                                {message.text}
                            </div>
                        )}

                        <div className="flex justify-end space-x-2">
                            <button
                                className="rounded-md py-2 px-4 bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
                                onClick={() => setShowResidentModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="rounded-md py-2 px-4 bg-purple-500 hover:bg-purple-600 text-white transition-colors"
                                onClick={handleSubmitBooking}
                                disabled={submitting}
                            >
                                {submitting ? <Loader2 className="animate-spin" /> : 'Book Now'}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}


        </motion.div>
    )
}