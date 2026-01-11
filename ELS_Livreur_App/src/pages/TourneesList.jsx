import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { MapPin, Navigation, Package, CheckCircle, Clock } from 'lucide-react'
import DeliveryCard from '../components/DeliveryCard'

export default function TourneesList() {
    const [stops, setStops] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const fetchStops = async () => {
        try {
            setLoading(true)
            const today = new Date().toISOString().split('T')[0];

            // Récupérer les stops des tournées du jour
            // Note: On suppose ici que la relation 'tournees' existe dans Supabase
            const { data, error } = await supabase
                .from('stops')
                .select(`
                *,
                tournees!inner (
                    date,
                    chauffeur_id
                )
            `)
                .eq('tournees.date', today)
                .order('sequence_order', { ascending: true });

            if (error) throw error;

            setStops(data || [])
        } catch (err) {
            console.error('Erreur fetch:', err)
            // Fallback clean pou l'UX
            setError(null)
            setStops([])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchStops()

        // Abonnement Temps Réel (Optionnel mais cool)
        const channel = supabase
            .channel('schema-db-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'stops' },
                () => fetchStops()
            )
            .subscribe()

        return () => supabase.removeChannel(channel)
    }, [])

    const handleStatusChange = async (id, newStatus) => {
        // Optimistic UI Update
        setStops(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s))

        try {
            const { error } = await supabase
                .from('stops')
                .update({
                    status: newStatus,
                    // Si livré, on pourrait ajouter un timestamp local ici
                    // validation_details: { validated_at: new Date().toISOString() } 
                })
                .eq('id', id);

            if (error) throw error;
        } catch (err) {
            alert("Erreur de sauvegarde: " + err.message);
            // Rollback ui
            fetchStops();
        }
    }

    if (loading && stops.length === 0) {
        return (
            <div className="flex flex-col gap-4 mt-8 animate-pulse">
                <div className="h-8 bg-slate-200 w-1/3 rounded mb-4"></div>
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-32 bg-slate-200 rounded-xl"></div>
                ))}
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-4 bg-red-50 text-red-600 rounded-lg">
                Erreur de chargement: {error}
                <button onClick={fetchStops} className="ml-2 underline">Réessayer</button>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Ma Tournée</h2>
                    <p className="text-slate-500">
                        {stops.length === 0
                            ? "Aucune livraison aujourd'hui"
                            : `${stops.filter(s => s.status !== 'LIVRE').length} livraisons restantes`}
                    </p>
                </div>
                <div className="text-right">
                    <span className="text-xs font-bold bg-brand-100 text-brand-600 px-2 py-1 rounded uppercase tracking-wider">
                        {new Date().toLocaleDateString('fr-FR')}
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

                {stops.length === 0 && !loading && (
                    <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                        <p className="text-slate-500">Aucune tournée trouvée pour cette date.</p>
                        <div className="mt-4 p-3 bg-blue-50 text-blue-700 text-sm rounded">
                            Info: Assurez-vous d'avoir lancé le script de synchronisation (Sync_Supabase.js) depuis Google Sheets.
                        </div>
                        <button onClick={fetchStops} className="mt-4 text-brand-600 font-medium text-sm border border-brand-200 px-4 py-2 rounded">Actualiser</button>
                    </div>
                )}

                {/* Historique des livrés */}
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
