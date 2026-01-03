import React, { useState } from 'react';
import { X, Minus, Plus, MapPin, Clock, Euro } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export function BookingModal({ date, isOpen, onClose }) {
    const [stops, setStops] = useState(1);
    const [returnToPharmacy, setReturnToPharmacy] = useState(false);
    const [showSlots, setShowSlots] = useState(false);

    // Hardcoded logic based on screenshots
    const basePrice = 15;
    const stopPrice = 5;
    const estimatedPrice = basePrice + (stops > 1 ? (stops - 1) * stopPrice : 0);
    const estimatedTime = 30 + (stops * 15) + (returnToPharmacy ? 20 : 0);
    const estimatedDist = 9 + (stops * 2) + (returnToPharmacy ? 9 : 0);

    // Time slots
    const slots = ["08:30", "08:45", "09:00", "09:15", "09:30", "09:45", "10:00"];

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
                                    <h4 className="font-semibold text-gray-700">Créneaux disponibles</h4>
                                    <div className="grid grid-cols-3 gap-3">
                                        {slots.map(time => (
                                            <button
                                                key={time}
                                                className="py-2 px-4 rounded-full border border-gray-200 hover:border-brand-purple hover:bg-purple-50 text-brand-purple font-medium transition-all"
                                            >
                                                {time}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
