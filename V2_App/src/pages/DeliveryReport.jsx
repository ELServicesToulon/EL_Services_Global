import { useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTour } from '../hooks/useTour';
import { sendReport } from '../lib/api';
import { Share2, Printer, CheckCircle, XCircle, Clock, MapPin, ArrowLeft } from 'lucide-react';

export default function DeliveryReport() {
    const { tourId } = useParams();
    const navigate = useNavigate();
    const { tour, loading } = useTour();
    const reportRef = useRef();

    // Auto-sync link to backend
    useEffect(() => {
        if (tour && tour.id === tourId) {
            sendReport({
                reservationId: tour.id,
                reportLink: window.location.href,
                statut: 'SYNC_LINK_ONLY'
            }).catch(err => console.error("Failed to sync link", err));
        }
    }, [tour, tourId]);

    // In real app, fetch by tourId. Here we check if loaded tour matches.
    if (loading) return <div className="p-10 text-center">Chargement...</div>;
    if (!tour || tour.id !== tourId) return <div className="p-10 text-center text-red-500">Rapport introuvable pour ID: {tourId}</div>;

    const completed = tour.stops.filter(s => s.status === 'completed');
    const issues = tour.stops.filter(s => s.status === 'issue' || s.status === 'skipped');
    const pending = tour.stops.filter(s => s.status === 'pending');

    const successRate = Math.round((completed.length / tour.stops.length) * 100);

    const handleCopyLink = () => {
        const url = window.location.href;
        navigator.clipboard.writeText(url);
        alert("Lien copié ! Il a également été transmis au bordereau de facturation.");
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pb-20 font-sans print:bg-white print:pb-0">

            {/* Header (No print) */}
            <div className="sticky top-0 z-40 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-gray-200 dark:border-slate-700 p-4 flex justify-between items-center print:hidden">
                <button onClick={() => navigate('/delivery')} className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900">
                    <ArrowLeft className="w-4 h-4" /> Retour
                </button>
                <div className="flex gap-2">
                    <button onClick={handlePrint} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300">
                        <Printer className="w-5 h-5" />
                    </button>
                    <button onClick={handleCopyLink} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors">
                        <Share2 className="w-4 h-4" />
                        Copier le lien
                    </button>
                </div>
            </div>

            {/* Report Content */}
            <main ref={reportRef} className="max-w-3xl mx-auto p-8 bg-white dark:bg-slate-800 my-8 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 print:shadow-none print:border-none print:my-0 print:p-0">

                {/* Brand Header */}
                <div className="border-b border-gray-100 dark:border-slate-700 pb-6 mb-6 flex justify-between items-end">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Rapport de Tournée</h1>
                        <p className="text-sm text-gray-500">Ref: {tour.id}</p>
                    </div>
                    <div className="text-right">
                        <div className="text-sm font-bold text-blue-600 dark:text-blue-400">MEDICONVOI</div>
                        <div className="text-xs text-gray-400">{new Date().toLocaleDateString()}</div>
                    </div>
                </div>

                {/* Courier Info */}
                <div className="bg-gray-50 dark:bg-slate-900/50 p-4 rounded-xl mb-8 flex items-center justify-between">
                    <div>
                        <span className="text-xs text-gray-500 uppercase tracking-wider">Livreur</span>
                        <p className="font-bold text-lg text-gray-900 dark:text-white">{tour.courierName}</p>
                    </div>
                    <div>
                        <span className="text-xs text-gray-500 uppercase tracking-wider">Date</span>
                        <p className="font-bold text-lg text-gray-900 dark:text-white">{tour.date}</p>
                    </div>
                    <div className="text-right">
                        <span className="text-xs text-gray-500 uppercase tracking-wider">Succès</span>
                        <p className={`font-bold text-lg ${successRate === 100 ? 'text-green-600' : 'text-orange-500'}`}>{successRate}%</p>
                    </div>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-4 mb-8 text-center text-sm">
                    <div className="p-3 bg-green-50 dark:bg-green-900/10 rounded-lg text-green-700 dark:text-green-300">
                        <span className="block font-bold text-xl">{completed.length}</span>
                        Livrés
                    </div>
                    <div className="p-3 bg-red-50 dark:bg-red-900/10 rounded-lg text-red-700 dark:text-red-300">
                        <span className="block font-bold text-xl">{issues.length}</span>
                        Problèmes
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-400">
                        <span className="block font-bold text-xl">{pending.length}</span>
                        Restants
                    </div>
                </div>

                {/* Detailed Logs */}
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Détail des Arrêts</h2>
                <div className="space-y-6 relative border-l-2 border-gray-100 dark:border-slate-700 ml-3 pl-6">

                    {tour.stops.map((stop) => {
                        const isIssue = stop.status === 'issue';
                        const isDone = stop.status === 'completed';

                        return (
                            <div key={stop.id} className="relative">
                                {/* Timeline Dot */}
                                <div className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-white dark:border-slate-800
                            ${isDone ? 'bg-green-500' : isIssue ? 'bg-red-500' : 'bg-gray-300'}`}
                                />

                                <div className="flex justify-between items-start mb-1">
                                    <h3 className="font-bold text-gray-800 dark:text-gray-200">{stop.name}</h3>
                                    <span className="text-xs font-mono text-gray-400">{stop.completedAt ? new Date(stop.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                                </div>

                                <p className="text-sm text-gray-500 mb-2">{stop.address}</p>

                                <div className="flex items-center gap-2 mb-2">
                                    <span className={`text-xs px-2 py-0.5 rounded ${stop.type === 'pickup' ? 'bg-orange-100 text-orange-700' : 'bg-indigo-100 text-indigo-700'}`}>
                                        {stop.type}
                                    </span>
                                    <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase
                                ${isDone ? 'bg-green-100 text-green-700' : isIssue ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
                                        {stop.status}
                                    </span>
                                </div>

                                {/* Annotations Display */}
                                {stop.notes && (
                                    <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800/30 p-3 rounded-lg mt-2">
                                        <p className="text-xs text-yellow-800 dark:text-yellow-200 italic">" {stop.notes} "</p>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                </div>

                <div className="mt-12 text-center pt-8 border-t border-gray-100 dark:border-slate-700">
                    <p className="text-xs text-gray-400">Ce document est généré automatiquement par Mediconvoi V2.</p>
                </div>

            </main>
        </div>
    );
}
