import { useState, useEffect } from 'react'
import { X, Calendar, Clock, Loader2, AlertTriangle, RotateCcw, Zap } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { format, addDays } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function EditBookingModal({ booking, isOpen, onClose, onUpdate }) {
  const [formData, setFormData] = useState({
    scheduled_at: '',
    is_urgent: false,
    has_return: false,
    notes: ''
  })
  const [loading, setLoading] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState(null)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  useEffect(() => {
    if (booking) {
      setFormData({
        scheduled_at: booking.scheduled_at ? format(new Date(booking.scheduled_at), "yyyy-MM-dd'T'HH:mm") : '',
        is_urgent: booking.is_urgent || false,
        has_return: booking.has_return || false,
        notes: booking.notes || ''
      })
      setError(null)
      setShowCancelConfirm(false)
    }
  }, [booking])

  if (!isOpen || !booking) return null

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          scheduled_at: formData.scheduled_at,
          is_urgent: formData.is_urgent,
          has_return: formData.has_return,
          notes: formData.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', booking.id)

      if (updateError) throw updateError

      onUpdate?.()
      onClose()
    } catch (err) {
      setError(err.message || 'Erreur lors de la modification')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    setCancelling(true)
    setError(null)

    try {
      const { error: cancelError } = await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', booking.id)

      if (cancelError) throw cancelError

      onUpdate?.()
      onClose()
    } catch (err) {
      setError(err.message || 'Erreur lors de l\'annulation')
    } finally {
      setCancelling(false)
    }
  }

  const minDate = format(addDays(new Date(), 1), "yyyy-MM-dd'T'00:00")

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">
            Modifier la réservation
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Date & Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Date et heure
            </label>
            <input
              type="datetime-local"
              name="scheduled_at"
              value={formData.scheduled_at}
              onChange={handleChange}
              min={minDate}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              required
            />
          </div>

          {/* Options */}
          <div className="space-y-3">
            <label className="flex items-center p-3 bg-amber-50 border border-amber-100 rounded-xl cursor-pointer hover:bg-amber-100 transition-colors">
              <input
                type="checkbox"
                name="is_urgent"
                checked={formData.is_urgent}
                onChange={handleChange}
                className="w-5 h-5 text-amber-500 border-gray-300 rounded focus:ring-amber-500"
              />
              <Zap className="w-4 h-4 ml-3 text-amber-500" />
              <span className="ml-2 text-sm font-medium text-gray-700">Course urgente</span>
            </label>

            <label className="flex items-center p-3 bg-blue-50 border border-blue-100 rounded-xl cursor-pointer hover:bg-blue-100 transition-colors">
              <input
                type="checkbox"
                name="has_return"
                checked={formData.has_return}
                onChange={handleChange}
                className="w-5 h-5 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
              />
              <RotateCcw className="w-4 h-4 ml-3 text-blue-500" />
              <span className="ml-2 text-sm font-medium text-gray-700">Retour inclus</span>
            </label>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (optionnel)
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={2}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
              placeholder="Instructions particulières..."
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col space-y-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-medium rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Enregistrer les modifications'
              )}
            </button>

            {!showCancelConfirm ? (
              <button
                type="button"
                onClick={() => setShowCancelConfirm(true)}
                className="w-full py-3 px-4 text-red-500 hover:bg-red-50 font-medium rounded-xl transition-colors"
              >
                Annuler cette réservation
              </button>
            ) : (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-3">
                <p className="text-sm text-red-700">
                  Êtes-vous sûr de vouloir annuler cette réservation ?
                </p>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="flex-1 py-2 px-3 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center"
                  >
                    {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmer'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCancelConfirm(false)}
                    className="flex-1 py-2 px-3 bg-gray-100 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Non
                  </button>
                </div>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
