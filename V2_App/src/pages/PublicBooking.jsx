import { useState, useEffect } from 'react'
import { TARIFS, FORFAIT_RESIDENT, computePrice, formatCurrency } from '../lib/pricing'
import { Truck, Clock, Calendar, Check, X, ShieldCheck, MapPin, Plus, Minus, Info } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import CapsuleCalendar from '../components/CapsuleCalendar'

export default function PublicBooking() {
    const navigate = useNavigate()
    const [showConfigModal, setShowConfigModal] = useState(false)
    const [showResidentModal, setShowResidentModal] = useState(false)

    // Booking State
    const [config, setConfig] = useState({
        stops: 1,
        isReturn: false,
        isSaturday: false,
        isUrgent: false,
        residentMode: null // 'standard' | 'urgence'
    })

    const [priceResult, setPriceResult] = useState(null)

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
        <div className="min-h-screen bg-gray-50 text-slate-800 font-sans">

            {/* Header / Nav */}
            <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center space-x-2 cursor-pointer" onClick={() => navigate('/')}>
                        <div className="bg-blue-600 p-1.5 rounded-lg">
                            <Truck className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-blue-500">
                            Mediconvoi
                        </span>
                    </div>
                    <button className="text-sm font-medium text-gray-500 hover:text-blue-600">Connexion Client</button>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 py-8">
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-bold text-slate-900">Réserver une course</h1>
                    <p className="text-gray-500 mt-2">Choisissez le type de prestation adaptée à vos besoins</p>
                </div>

                {/* Tariffs Grid - Mimicking Google Apps Script Layout */}
                <div className="grid md:grid-cols-2 gap-8 mb-12">

                    {/* Colonne Tournées */}
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden relative group hover:ring-2 hover:ring-blue-500/20 transition-all">
                        <div className="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>
                        <div className="p-6">
                            <div className="flex items-center space-x-3 mb-6">
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                                    <Truck className="h-6 w-6" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold">Tournées</h2>
                                    <p className="text-xs text-gray-400">Officines & EHPAD</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <TariffRow
                                    label="Normal"
                                    price={TARIFS.Normal.base}
                                    desc="1 retrait + 1 livraison (Lun-Ven)"
                                    onClick={() => openConfigModal('Normal')}
                                />
                                <TariffRow
                                    label="Samedi"
                                    price={TARIFS.Samedi.base}
                                    desc="Majoré le weekend"
                                    onClick={() => openConfigModal('Samedi')}
                                />
                                <TariffRow
                                    label="Urgent"
                                    price={TARIFS.Urgent.base}
                                    desc="Intervention < 45mn"
                                    isUrgent
                                    onClick={() => openConfigModal('Urgent')}
                                />

                                <div className="mt-6 pt-4 border-t border-gray-100">
                                    <div className="flex justify-between items-center text-sm text-gray-500">
                                        <span>Suppléments par arrêt</span>
                                        <div className="flex space-x-1">
                                            {TARIFS.Normal.arrets.slice(0, 3).map((p, i) => (
                                                <span key={i} className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">+{formatCurrency(p)}</span>
                                            ))}
                                            <span className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">...</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Colonne Résident */}
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden relative group hover:ring-2 hover:ring-green-500/20 transition-all">
                        <div className="absolute top-0 left-0 w-full h-1 bg-green-500"></div>
                        <div className="p-6">
                            <div className="flex items-center space-x-3 mb-6">
                                <div className="p-3 bg-green-50 text-green-600 rounded-xl">
                                    <ShieldCheck className="h-6 w-6" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold">Forfait Résident</h2>
                                    <p className="text-xs text-gray-400">PUI Sainte Musse / Domicile</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <TariffRow
                                    label="Standard"
                                    price={FORFAIT_RESIDENT.STANDARD_PRICE}
                                    desc={FORFAIT_RESIDENT.STANDARD_LABEL}
                                    onClick={() => openResidentModal('standard')}
                                />
                                <TariffRow
                                    label="Urgence"
                                    price={FORFAIT_RESIDENT.URGENCE_PRICE}
                                    desc={FORFAIT_RESIDENT.URGENCE_LABEL}
                                    isUrgent
                                    onClick={() => openResidentModal('urgence')}
                                />
                            </div>

                            <div className="mt-8 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <h3 className="text-sm font-bold text-slate-700 mb-2">Demande d'intégration EHPAD</h3>
                                <p className="text-xs text-gray-500 mb-3">Vous gérez un établissement ? Contactez-nous pour intégrer nos tournées régulières.</p>
                                <button className="w-full py-2 bg-white border border-gray-300 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-colors">
                                    Formulaire de demande
                                </button>
                            </div>
                        </div>
                    </div>

                </div>

                <div className="text-center text-xs text-gray-400">
                    <p>TVA non applicable (art. 293B du CGI)</p>
                </div>

            </main>

            {/* CONFIG MODAL */}
            {showConfigModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in max-h-[90vh] overflow-y-auto">
                        <div className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white flex justify-between items-start sticky top-0 z-10">
                            <div>
                                <h3 className="text-lg font-bold">Configurer la tournée</h3>
                                <p className="text-slate-400 text-sm">Ajustez le nombre d'arrêts</p>
                            </div>
                            <button onClick={() => setShowConfigModal(false)} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-8">
                            {/* Counter */}
                            <div className="flex items-center justify-between">
                                <label className="font-medium text-slate-700">Arrêts (départ inclus)</label>
                                <div className="flex items-center space-x-4 bg-gray-50 rounded-xl p-1 border border-gray-200">
                                    <button
                                        onClick={() => setConfig(c => ({ ...c, stops: Math.max(1, c.stops - 1) }))}
                                        className="w-10 h-10 flex items-center justify-center bg-white rounded-lg shadow-sm border border-gray-100 hover:bg-gray-50 active:scale-95 transition-all text-slate-600"
                                    >
                                        <Minus className="h-4 w-4" />
                                    </button>
                                    <span className="text-xl font-bold w-6 text-center">{config.stops}</span>
                                    <button
                                        onClick={() => setConfig(c => ({ ...c, stops: c.stops + 1 }))}
                                        className="w-10 h-10 flex items-center justify-center bg-white rounded-lg shadow-sm border border-gray-100 hover:bg-gray-50 active:scale-95 transition-all text-blue-600"
                                    >
                                        <Plus className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Return Switch */}
                            <div className="flex items-center justify-between">
                                <div className="flex flex-col">
                                    <label className="font-medium text-slate-700">Retour pharmacie</label>
                                    <span className="text-xs text-gray-500">Ajoute une étape de retour</span>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={config.isReturn}
                                        onChange={(e) => setConfig(c => ({ ...c, isReturn: e.target.checked }))}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>

                            {/* Result Preview */}
                            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm text-slate-600">Estimation</span>
                                    <span className="text-2xl font-bold text-blue-700">{priceResult ? formatCurrency(priceResult.total) : '...'}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs text-slate-400">
                                    <span>{config.stops} arrêt(s){config.isReturn ? ' + retour' : ''}</span>
                                    <span></span>
                                </div>
                            </div>

                            {/* Calendar Section */}
                            <div className="pt-4 border-t border-gray-100">
                                <h4 className="text-sm font-bold text-slate-700 mb-4">Choisir une date</h4>
                                <CapsuleCalendar
                                    onSelectDate={(date) => console.log('Selected date:', date)}
                                    selectedDate={null}
                                />
                            </div>

                            <button className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-600/30 transform transition-all active:scale-[0.98]">
                                Confirmer la réservation
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* RESIDENT MODAL */}
            {showResidentModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                        <div className="p-6 bg-gradient-to-br from-emerald-900 to-emerald-800 text-white flex justify-between items-start">
                            <div>
                                <h3 className="text-lg font-bold">Confirmer Forfait Résident</h3>
                                <p className="text-emerald-200 text-sm">{config.residentMode === 'standard' ? 'Standard' : 'Urgence'}</p>
                            </div>
                            <button onClick={() => setShowResidentModal(false)} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            <p className="text-sm text-gray-600 leading-relaxed">
                                Ce forfait inclut la gestion complète du dossier résident : retrait des documents, passage à la PUI Sainte Musse et livraison.
                            </p>

                            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex justify-between items-center">
                                <span className="font-medium text-emerald-900">Total Forfait</span>
                                <span className="text-2xl font-bold text-emerald-700">{priceResult ? formatCurrency(priceResult.total) : '...'}</span>
                            </div>

                            <button className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-600/30 transform transition-all active:scale-[0.98]">
                                Choisir un créneau
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function TariffRow({ label, price, desc, isUrgent, onClick }) {
    return (
        <div
            onClick={onClick}
            className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all border ${isUrgent ? 'bg-red-50 border-red-100 hover:bg-red-100' : 'bg-gray-50 border-gray-100 hover:bg-blue-50 hover:border-blue-100'}`}
        >
            <div>
                <div className={`font-bold ${isUrgent ? 'text-red-700' : 'text-slate-700'}`}>{label}</div>
                <div className="text-xs text-slate-500 mt-0.5">{desc}</div>
            </div>
            <div className="text-right">
                <div className={`font-bold ${isUrgent ? 'text-red-700' : 'text-slate-900'}`}>{formatCurrency(price)}</div>
                <div className="text-[10px] text-gray-400">/ course</div>
            </div>
        </div>
    )
}
