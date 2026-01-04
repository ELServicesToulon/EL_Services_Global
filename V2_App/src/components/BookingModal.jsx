import React, { useState, useEffect } from 'react';
import { X, Minus, Plus, MapPin, Clock, Euro, Loader, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { fetchSlots } from '../lib/api';

export function BookingModal({ date, isOpen, onClose }) {
    const [stops, setStops] = useState(1);
    const [returnToPharmacy, setReturnToPharmacy] = useState(false);
    const [showSlots, setShowSlots] = useState(false);

    // API State
    const [availableSlots, setAvailableSlots] = useState([]);
    const [isLoadingSlots, setIsLoadingSlots] = useState(false);
    const [slotError, setSlotError] = useState(null);
    const [selectedSlot, setSelectedSlot] = useState(null);

    // Hardcoded logic based on screenshots (pricing)
    const basePrice = 15;
    const stopPrice = 5;
    const estimatedPrice = basePrice + (stops > 1 ? (stops - 1) * stopPrice : 0);
    const estimatedTime = 30 + (stops * 15) + (returnToPharmacy ? 20 : 0);
    const estimatedDist = 9 + (stops * 2) + (returnToPharmacy ? 9 : 0);

    // Load slots when date changes or modal opens
    useEffect(() => {
        if (isOpen && date && showSlots) {
            loadSlots();
        }
    }, [isOpen, date, showSlots]);

    const loadSlots = async () => {
        setIsLoadingSlots(true);
        setSlotError(null);
        try {
            const dateStr = format(date, 'yyyy-MM-dd');
            const data = await fetchSlots(dateStr);
            console.log("Slots loaded:", data);
            setAvailableSlots(data);
        } catch (err) {
            console.error(err);
            setSlotError("Impossible de charger les créneaux.");
        } finally {
            setIsLoadingSlots(false);
        }
    };

    const handleConfirm = () => {
        if (!selectedSlot) return;
        // Ici on pourrait déclencher l'action de réservation réelle via une prop onBook(slot, details)
        alert(`Réservation confirmée pour ${selectedSlot} (${stops} arrêts)`);
        onClose();
    };

    // Calculate slot style based on status
    const getSlotStyle = (slot) => {
        // slot: { time: "08:00", status: "open"|"closed", taken: bool, inPast: bool }
        const isSelected = selectedSlot === slot.time;
        const isDisabled = slot.status === 'closed' || slot.taken || slot.inPast;

        if (isDisabled) {
            return "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed";
        }
        if (isSelected) {
            return "border-brand-purple bg-brand-purple text-white shadow-md transform scale-105";
        }
        return "border-gray-200 hover:border-brand-purple hover:bg-purple-50 text-brand-purple";
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/20 backdrop-blur-sm"
                    onClick={onClose}
                />

                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden relative z-10"
                >
                    {/* Header */}
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <div>
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Mediconvoi</span>
                            <h3 className="text-xl font-bold text-gray-800">
                                Configurer la tournée du <span className="text-brand-purple">{date && format(date, 'd MMMM', { locale: fr })}</span>
                            </h3>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-400">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="p-6 max-h-[70vh] overflow-y-auto">

                        {/* Info Box */}
                        <div className="bg-gray-50 p-4 rounded-xl text-sm text-gray-600 mb-6">
                            Choisissez le nombre d'arrêts et précisez si la tournée revient à l'officine.
                            Le tarif et la durée s'ajustent automatiquement.
                        </div>

                        {/* Controls */}
                        <div className="space-y-6">
                            {/* Stops */}
                            <div className="flex items-center justify-between">
                                <label className="font-semibold text-gray-700">Arrêts prévus (départ inclus)</label>
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => setStops(Math.max(1, stops - 1))}
                                        className="w-10 h-10 rounded-full bg-brand-blue text-white flex items-center justify-center hover:bg-blue-600 font-bold"
                                    >
                                        <Minus size={18} />
                                    </button>
                                    <span className="text-xl font-bold w-4 text-center">{stops}</span>
                                    <button
                                        onClick={() => setStops(stops + 1)}
                                        className="w-10 h-10 rounded-full bg-brand-blue text-white flex items-center justify-center hover:bg-blue-600 font-bold"
                                    >
                                        <Plus size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Return Toggle */}
                            <div className="flex items-center justify-between">
                                <label className="font-semibold text-gray-700">Retour à la pharmacie</label>
                                <button
                                    onClick={() => setReturnToPharmacy(!returnToPharmacy)}
                                    className={`w-14 h-8 rounded-full p-1 transition-colors ${returnToPharmacy ? 'bg-brand-purple' : 'bg-gray-300'}`}
                                >
                                    <div className={`w-6 h-6 bg-white rounded-full transition-transform ${returnToPharmacy ? 'translate-x-6' : 'translate-x-0'}`} />
                                </button>
                            </div>

                            {/* Estimates Grid */}
                            <div className="grid grid-cols-3 gap-4 py-6 border-t border-b border-gray-100">
                                <div className="text-center">
                                    <div className="text-gray-400 text-xs uppercase font-semibold mb-1">Durée</div>
                                    <div className="text-brand-purple font-bold text-lg">{estimatedTime} min</div>
                                </div>
                                <div className="text-center border-l border-gray-100">
                                    <div className="text-gray-400 text-xs uppercase font-semibold mb-1">Prix Est.</div>
                                    <div className="text-brand-purple font-bold text-lg">~{estimatedPrice},00 €</div>
                                </div>
                                <div className="text-center border-l border-gray-100">
                                    <div className="text-gray-400 text-xs uppercase font-semibold mb-1">Distance</div>
                                    <div className="text-brand-purple font-bold text-lg">~{estimatedDist} km</div>
                                </div>
                            </div>

                            {/* View Slots Button */}
                            {!showSlots ? (
                                <button
                                    onClick={() => setShowSlots(true)}
                                    className="w-full py-4 bg-gradient-to-r from-brand-purple to-brand-blue text-white font-bold rounded-xl shadow-lg hover:opacity-90 transition-all transform hover:scale-[1.02]"
                                >
                                    Voir les créneaux
                                </button>
                            ) : (
                                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                                    <h4 className="font-semibold text-gray-700 flex justify-between items-center">
                                        Critères disponibles
                                        {isLoadingSlots && <Loader className="animate-spin text-brand-purple" size={16} />}
                                    </h4>

                                    {slotError && (
                                        <div className="text-red-500 text-sm bg-red-50 p-2 rounded">{slotError}</div>
                                    )}

                                    <div className="grid grid-cols-3 gap-3">
                                        {!isLoadingSlots && availableSlots.length === 0 && !slotError && (
                                            <div className="col-span-3 text-center text-gray-400 text-sm py-4">Aucun créneau disponible ce jour.</div>
                                        )}
                                        {availableSlots.map((slot, i) => (
                                            <button
                                                key={i}
                                                disabled={slot.status === 'closed' || slot.taken || slot.inPast}
                                                onClick={() => setSelectedSlot(slot.time)}
                                                className={`py-2 px-2 rounded-lg border text-sm font-medium transition-all ${getSlotStyle(slot)}`}
                                            >
                                                {slot.time}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Confirmation Button */}
                                    {selectedSlot && (
                                        <motion.button
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            onClick={handleConfirm}
                                            className="w-full mt-4 py-4 bg-green-600 text-white font-bold rounded-xl shadow-lg hover:bg-green-700 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Check size={20} />
                                            Confirmer pour {selectedSlot}
                                        </motion.button>
                                    )}
                                </div>
                            )}

                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
