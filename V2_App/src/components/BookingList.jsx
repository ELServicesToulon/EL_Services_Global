import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Clock, MapPin, Package, Pencil, CheckCircle, XCircle, Loader, AlertOctagon } from 'lucide-react'

const statusStyles = {
    pending: { bg: 'bg-yellow-50', text: 'text-yellow-700', label: 'En attente', icon: Clock },
    confirmed: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Confirmée', icon: CheckCircle },
    in_progress: { bg: 'bg-indigo-50', text: 'text-indigo-700', label: 'En cours', icon: Loader },
    completed: { bg: 'bg-green-50', text: 'text-green-700', label: 'Livrée', icon: CheckCircle },
    cancelled: { bg: 'bg-red-50', text: 'text-red-700', label: 'Annulée', icon: XCircle }
}

export default function BookingList({ bookings, loading, onEdit }) {

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <Loader className="w-8 h-8 animate-spin mb-2" />
                <p>Chargement des commandes...</p>
            </div>
        )
    }

    if (bookings.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <Package className="w-12 h-12 text-gray-300 mb-2" />
                <p className="text-gray-500 font-medium">Aucune commande en cours</p>
                <p className="text-gray-400 text-sm">Utilisez le formulaire pour commander un transport.</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {bookings.map((booking) => {
                const status = statusStyles[booking.status] || statusStyles.pending

                return (
                    <div key={booking.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200 group">
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center space-x-3">
                                <div className={`px-2.5 py-1 rounded-full text-xs font-bold ${status.bg} ${status.text}`}>
                                    {status.label}
                                </div>
                                {booking.is_urgent && (
                                    <span className="flex items-center text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full">
                                        <AlertOctagon className="w-3 h-3 mr-1" /> URGENT
                                    </span>
                                )}
                                <span className="text-sm text-gray-500">
                                    {format(new Date(booking.scheduled_date), 'EEEE d MMMM', { locale: fr })}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="flex items-start">
                                <div className="mt-1 min-w-[20px]">
                                    <div className="w-2 h-2 rounded-full bg-gray-300 ring-4 ring-gray-50"></div>
                                </div>
                                <div className="ml-3">
                                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Départ</p>
                                    <p className="text-sm text-gray-800 font-medium">
                                        {booking.pickup_address || "Adresse par défaut"}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-0.5 flex items-center">
                                        <Clock className="w-3 h-3 mr-1" /> {booking.time_slot}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start">
                                <div className="mt-1 min-w-[20px]">
                                    <div className="w-2 h-2 rounded-full bg-blue-500 ring-4 ring-blue-50"></div>
                                </div>
                                <div className="ml-3">
                                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Arrivée</p>
                                    <p className="text-sm text-gray-800 font-medium">{booking.delivery_address}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between items-center pt-3 border-t border-gray-50">
                            <div className="flex items-center text-xs text-gray-400">
                                <Package className="w-3.5 h-3.5 mr-1" />
                                {booking.packages_count} colis
                            </div>
                            {/* Bouton Modifier (seulement si pas terminée ou annulée) */}
                            {!['completed', 'cancelled'].includes(booking.status) && onEdit && (
                                <button 
                                    onClick={() => onEdit(booking)}
                                    className="flex items-center px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium"
                                >
                                    <Pencil className="w-4 h-4 mr-1" />
                                    Modifier
                                </button>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
