import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTour } from '../hooks/useTour';
import { ArrowLeft, Phone, Navigation, CheckCircle, AlertTriangle, Package, Camera, Send } from 'lucide-react';

export default function DeliveryStop() {
    const { stopId } = useParams();
    const navigate = useNavigate();
    const { tour, updateStop, loading } = useTour();

    const [notes, setNotes] = useState('');
    const [status, setStatus] = useState('pending');
    // Local state for checkboxes could be complex, for now we assume modifying specific items isn't granular in data yet
    // but let's fake it nicely.

    const stop = tour?.stops.find(s => s.id === stopId);

    useEffect(() => {
        if (stop) {
            setNotes(stop.notes || '');
            setStatus(stop.status);
        }
    }, [stop]);

    if (loading) return null;
    if (!stop) return <div className="p-4">Stop introuvable. <button onClick={() => navigate(-1)} className="underline">Retour</button></div>;

    const handleSave = (newStatus) => {
        updateStop(stopId, {
            status: newStatus,
            notes: notes,
            // In a real app we would save the state of each package here too
        });
        navigate('/delivery'); // Go back to list
    };

    const isCompleted = status === 'completed';

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pb-20 font-sans">

            {/* Navbar */}
            <nav className="sticky top-0 z-50 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border-b border-gray-200 dark:border-slate-700 px-4 py-4 flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                    <ArrowLeft className="w-6 h-6 text-gray-700 dark:text-gray-200" />
                </button>
                <h1 className="text-lg font-bold text-gray-900 dark:text-white truncate flex-1">
                    {stop.name}
                </h1>
                <span className={`text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wider
            ${stop.type === 'pickup' ? 'bg-orange-100 text-orange-700' : 'bg-indigo-100 text-indigo-700'}`}>
                    {stop.type}
                </span>
            </nav>

            <main className="p-4 space-y-6 max-w-lg mx-auto">

                {/* Info Card */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-700 space-y-4">
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Adresse</p>
                        <div className="flex items-start justify-between gap-4">
                            <p className="text-base font-medium text-gray-900 dark:text-white leading-snug">
                                {stop.address}
                            </p>
                            <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(stop.address)}`} target="_blank" rel="noreferrer"
                                className="flex-shrink-0 p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-100 transition-colors">
                                <Navigation className="w-5 h-5" />
                            </a>
                        </div>
                    </div>

                    <div className="h-px bg-gray-100 dark:bg-slate-700" />

                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Contact</p>
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-base font-medium text-gray-900 dark:text-white">{stop.contact}</p>
                                <p className="text-sm text-gray-500">{stop.phone}</p>
                            </div>
                            <a href={`tel:${stop.phone}`} className="flex-shrink-0 p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl hover:bg-green-100 transition-colors">
                                <Phone className="w-5 h-5" />
                            </a>
                        </div>
                    </div>
                </div>

                {/* Tasks / Packages */}
                <div className="space-y-3">
                    <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">
                        À traiter ({stop.packages.length})
                    </h2>
                    {stop.packages.length === 0 ? (
                        <div className="p-4 bg-gray-100 dark:bg-slate-800 rounded-xl text-center text-gray-500 text-sm italic">
                            Aucun colis spécifié.
                        </div>
                    ) : (
                        stop.packages.map(pkg => (
                            <div key={pkg.id} className="flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700">
                                <div className="flex-shrink-0">
                                    <Package className="w-5 h-5 text-indigo-500" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{pkg.description}</p>
                                    <p className="text-xs text-gray-500">{pkg.id}</p>
                                </div>
                                <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" defaultChecked={pkg.status === 'picked_up' || isCompleted} />
                            </div>
                        ))
                    )}
                </div>

                {/* Annotations */}
                <div className="space-y-3">
                    <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">
                        Annotations & Preuves
                    </h2>
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-4 space-y-4">
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Ajouter une note, un code porte, ou un commentaire sur la livraison..."
                            className="w-full min-h-[100px] p-3 rounded-lg bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                        />

                        {/* Photo Button (Mock) */}
                        <button type="button" className="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700">
                            <Camera className="w-4 h-4" />
                            Ajouter une photo
                        </button>
                    </div>
                </div>

                {/* Actions Footer */}
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 flex gap-3 z-50">
                    <button
                        onClick={() => handleSave('issue')}
                        className="flex-1 py-3 px-4 rounded-xl font-bold bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                    >
                        <AlertTriangle className="w-5 h-5" />
                        <span>Problème</span>
                    </button>
                    <button
                        onClick={() => handleSave('completed')}
                        className="flex-[2] py-3 px-4 rounded-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                        <CheckCircle className="w-5 h-5" />
                        <span>Valider le passage</span>
                    </button>
                </div>

            </main>
        </div>
    );
}
