import { useState, useEffect } from 'react'
import { MapPin, Navigation, Package, CheckCircle, Clock } from 'lucide-react'
import DeliveryCard from '../components/DeliveryCard'

// Mock Data matching step 2 schema
const MOCK_STOPS = [
    {
        id: 's1',
        sequence_order: 1,
        client_nom: 'Pharmacie de Portissol',
        address_full: '123 Avenue de la Plage, 83110 Sanary-sur-Mer',
        status: 'LIVRE',
        time_window: '09:00 - 10:00'
    },
    {
        id: 's2',
        sequence_order: 2,
        client_nom: 'Maison de Retraite Les Mimosas',
        address_full: '45 Chemin des Oliviers, 83150 Bandol',
        status: 'A_LIVRER',
        time_window: '10:30 - 11:30'
    },
    {
        id: 's3',
        sequence_order: 3,
        client_nom: 'Cabinet Infirmier Sud',
        address_full: '12 Rue du Port, 83110 Sanary-sur-Mer',
        status: 'A_LIVRER',
        time_window: '11:45 - 12:15'
    }
]

export default function TourneesList() {
    const [stops, setStops] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Simulate fetch from Supabase
        setTimeout(() => {
            setStops(MOCK_STOPS)
            setLoading(false)
        }, 800)
    }, [])

    const handleStatusChange = (id, newStatus) => {
        setStops(stops.map(s => s.id === id ? { ...s, status: newStatus } : s))
    }

    if (loading) {
        return (
            <div className="flex flex-col gap-4 mt-8 animate-pulse">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-32 bg-slate-200 rounded-xl"></div>
                ))}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Ma Tournée</h2>
                    <p className="text-slate-500">{stops.filter(s => s.status !== 'LIVRE').length} livraisons restantes</p>
                </div>
                <div className="text-right">
                    <span className="text-xs font-bold bg-brand-100 text-brand-600 px-2 py-1 rounded uppercase tracking-wider">
                        En Cours
                    </span>
                </div>
            </div>

            <div className="space-y-4">
                {stops.filter(s => s.status !== 'LIVRE').map((stop) => (
                    <DeliveryCard
                        key={stop.id}
                        stop={stop}
                        onValidate={(id) => handleStatusChange(id, 'LIVRE')}
                        onFail={(id, reason) => handleStatusChange(id, 'ECHEC_' + reason)}
                    />
                ))}

                {/* Historique des livrés (Vue simplifiée) */}
                {stops.filter(s => s.status === 'LIVRE').length > 0 && (
                    <div className="pt-8 border-t border-slate-200">
                        <h3 className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-4">Déjà Livré</h3>
                        <div className="space-y-2 opacity-60 grayscale">
                            {stops.filter(s => s.status === 'LIVRE').map(stop => (
                                <div key={stop.id} className="bg-white p-3 rounded-lg border border-slate-100 flex items-center justify-between">
                                    <span className="font-medium text-slate-700">{stop.client_nom}</span>
                                    <span className="text-green-600 text-sm font-bold flex items-center gap-1">
                                        <CheckCircle size={14} /> OK
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
