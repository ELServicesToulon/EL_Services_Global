import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTour } from '../hooks/useTour';
import { MapPin, Navigation, Clock, CheckCircle, AlertTriangle, Package, Loader2, ArrowRight } from 'lucide-react';

export default function DeliveryTour() {
    const navigate = useNavigate();
    const { tour, loading } = useTour();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!tour) return <div>Tournée introuvable.</div>;

    const completedCount = tour.stops.filter(s => s.status === 'completed').length;
    const progress = Math.round((completedCount / tour.stops.length) * 100);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pb-20 font-sans transition-colors duration-300">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-gray-200 dark:border-slate-700 z-50 px-4 py-4 shadow-sm">
                <div className="flex justify-between items-center max-w-2xl mx-auto">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Tournée du Jour</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{tour.date} • {tour.courierName}</p>
                    </div>
                    <div className="text-right">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            {completedCount}/{tour.stops.length} Stops
                        </span>
                    </div>
                </div>
                {/* Progress Bar */}
                <div className="mt-4 h-1.5 w-full bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden max-w-2xl mx-auto">
                    <div
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </header>

            {/* Main Content */}
            <main className="pt-28 px-4 max-w-2xl mx-auto space-y-4">

                {/* Stops List */}
                {tour.stops.map((stop, index) => {
                    const isDone = stop.status === 'completed';
                    const isIssue = stop.status === 'issue';
                    const isNext = !isDone && !isIssue && index === tour.stops.findIndex(s => s.status === 'pending');

                    return (
                        <div
                            key={stop.id}
                            onClick={() => navigate(`/delivery/${stop.id}`)}
                            className={`relative group p-4 bg-white dark:bg-slate-800 rounded-2xl border transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer
                ${isNext ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-blue-500/10' : 'border-gray-200 dark:border-slate-700'}
                ${isDone ? 'opacity-75 grayscale-[0.5]' : ''}
              `}
                        >
                            {/* Connector Line (visual) - simplified */}
                            {index !== tour.stops.length - 1 && (
                                <div className="absolute left-[27px] bottom-[-24px] w-0.5 h-6 bg-gray-200 dark:bg-slate-700 -z-10 group-hover:bg-blue-200 dark:group-hover:bg-slate-600 transition-colors"></div>
                            )}

                            <div className="flex items-start gap-4">
                                {/* Icon Column */}
                                <div className="flex-shrink-0 mt-1">
                                    {isDone ? (
                                        <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                                            <CheckCircle className="w-5 h-5" />
                                        </div>
                                    ) : isIssue ? (
                                        <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400">
                                            <AlertTriangle className="w-5 h-5" />
                                        </div>
                                    ) : (
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center 
                        ${stop.type === 'pickup' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'}`}>
                                            {stop.type === 'pickup' ? <Package className="w-5 h-5" /> : <MapPin className="w-5 h-5" />}
                                        </div>
                                    )}
                                </div>

                                {/* Content Column */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <h3 className={`text-base font-semibold truncate ${isDone ? 'text-gray-500 dark:text-gray-400 line-through' : 'text-gray-900 dark:text-white'}`}>
                                            {stop.name}
                                        </h3>
                                        <span className="text-xs font-mono text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded-md ml-2 flex-shrink-0">
                                            {stop.timeWindow}
                                        </span>
                                    </div>

                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
                                        {stop.address}
                                    </p>

                                    {/* Badges / Extras */}
                                    <div className="flex items-center gap-2 mt-3">
                                        <span className={`inline-flex items-center text-xs font-medium px-2 py-1 rounded-md 
                      ${stop.type === 'pickup' ? 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300' : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300'}`}>
                                            {stop.type.toUpperCase()}
                                        </span>
                                        {stop.status === 'issue' && (
                                            <span className="inline-flex items-center text-xs font-medium px-2 py-1 rounded-md bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300">
                                                PROBLÈME
                                            </span>
                                        )}
                                        {stop.notes && (
                                            <span className="text-xs text-gray-400 italic">
                                                Has notes
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Chevron */}
                                <div className="self-center">
                                    <ArrowRight className="w-5 h-5 text-gray-300 dark:text-slate-600" />
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Action Button */}
                <div className="pt-6 pb-8">
                    <button
                        onClick={() => navigate(`/delivery/report/${tour.id}`)}
                        className="w-full flex items-center justify-center gap-2 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold shadow-lg shadow-gray-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                        {progress === 100 ? 'Voir le Rapport de Tournée' : 'Consulter le Rapport / Terminer'}
                    </button>
                </div>

            </main>
        </div>
    );
}
