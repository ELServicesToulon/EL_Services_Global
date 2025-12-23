import { MapPin, Navigation, Package, XCircle, AlertTriangle } from 'lucide-react'
import { useState } from 'react'

export default function DeliveryCard({ stop, onValidate, onFail }) {
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [failReason, setFailReason] = useState('')

    const handleNavigation = () => {
        // Fallback or explicit coordinates
        const query = stop.gps_lat && stop.gps_lng
            ? `${stop.gps_lat},${stop.gps_lng}`
            : encodeURIComponent(stop.address_full);

        // Universal link for Maps/Waze intent
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${query}`, '_blank');
    }

    const handleFailSubmit = () => {
        if (failReason) {
            onFail(stop.id, failReason);
            setIsMenuOpen(false);
            setFailReason('');
        }
    }

    if (!stop) return null;

    return (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden mb-6">
            {/* Header / Info Pincipale */}
            <div className="p-5 border-b border-slate-50">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-bold text-slate-800 leading-tight">
                        {stop.client_nom}
                    </h3>
                    <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-1 rounded">
                        #{stop.sequence_order}
                    </span>
                </div>
                <p className="text-slate-500 text-base leading-snug flex items-start gap-1.5">
                    <MapPin className="w-5 h-5 text-brand-500 shrink-0 mt-0.5" />
                    {stop.address_full}
                </p>
                {stop.notes && (
                    <div className="mt-3 bg-amber-50 text-amber-800 text-sm p-3 rounded-lg flex gap-2 items-start border border-amber-100">
                        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                        {stop.notes}
                    </div>
                )}
            </div>

            {/* Actions Rapides */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-50">
                <button
                    onClick={handleNavigation}
                    className="flex flex-col items-center justify-center gap-1 py-4 bg-white rounded-xl shadow-sm hover:bg-slate-50 active:scale-95 transition-all text-blue-600 font-semibold"
                >
                    <Navigation className="w-8 h-8 mb-1" />
                    <span>Y aller</span>
                </button>

                {!isMenuOpen ? (
                    <button
                        onClick={() => setIsMenuOpen(true)}
                        className="flex flex-col items-center justify-center gap-1 py-4 bg-brand-600 text-white rounded-xl shadow-sm hover:bg-brand-700 active:scale-95 transition-all font-semibold"
                    >
                        <Package className="w-8 h-8 mb-1" />
                        <span>Livrer</span>
                    </button>
                ) : (
                    <div className="col-span-2 bg-white p-4 rounded-xl animate-in fade-in slide-in-from-bottom-2">
                        <h4 className="text-center font-bold text-slate-800 mb-4">Confirmer le statut</h4>

                        <div className="grid grid-cols-1 gap-3">
                            <button
                                onClick={() => {
                                    onValidate(stop.id);
                                    setIsMenuOpen(false);
                                }}
                                className="w-full bg-green-500 text-white py-4 rounded-xl font-bold text-lg shadow-md hover:bg-green-600 active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                <Package /> COLIS LIVRÉ
                            </button>

                            <div className="border-t border-slate-100 my-2 pt-2">
                                <label className="text-xs font-semibold text-slate-400 uppercase mb-2 block">Signalement problème</label>
                                <select
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg mb-2 text-slate-700"
                                    value={failReason}
                                    onChange={(e) => setFailReason(e.target.value)}
                                >
                                    <option value="">Sélectionner une raison...</option>
                                    <option value="ABSENT">Client Absent</option>
                                    <option value="REFUS">Colis Refusé</option>
                                    <option value="ADRESSE_INCOMPLETE">Adresse Incomplète</option>
                                    <option value="AUTRE">Autre Problème</option>
                                </select>
                                <button
                                    onClick={handleFailSubmit}
                                    disabled={!failReason}
                                    className="w-full bg-red-100 text-red-600 py-3 rounded-lg font-bold disabled:opacity-50 hover:bg-red-200 transition-colors flex items-center justify-center gap-2"
                                >
                                    <XCircle className="w-5 h-5" /> Signaler Échec
                                </button>
                            </div>

                            <button
                                onClick={() => setIsMenuOpen(false)}
                                className="w-full text-slate-400 py-2 text-sm font-medium"
                            >
                                Annuler
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
