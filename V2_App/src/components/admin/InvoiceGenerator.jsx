import { useState, useEffect } from 'react'
import { 
  FileText, Download, Send, Plus, Trash2, Loader2, 
  User, Calendar, Euro, AlertCircle, CheckCircle, Eye 
} from 'lucide-react'
import { createInvoice, previewNextInvoiceNumber } from '../../lib/billing'
import { downloadInvoicePdf } from '../../lib/pdfGenerator'
import { supabase } from '../../lib/supabaseClient'
import { format, addDays } from 'date-fns'

export default function InvoiceGenerator({ onInvoiceCreated }) {
  const [clients, setClients] = useState([])
  const [bookings, setBookings] = useState([])
  const [selectedClient, setSelectedClient] = useState(null)
  const [selectedBookings, setSelectedBookings] = useState([])
  const [nextNumber, setNextNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingClients, setLoadingClients] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  // Custom lines (for manual entries)
  const [customLines, setCustomLines] = useState([])

  // Invoice metadata
  const [dueDate, setDueDate] = useState(format(addDays(new Date(), 5), 'yyyy-MM-dd'))
  const [notes, setNotes] = useState('')

  useEffect(() => {
    loadClients()
    loadNextNumber()
  }, [])

  useEffect(() => {
    if (selectedClient) {
      loadClientBookings(selectedClient.id)
    } else {
      setBookings([])
      setSelectedBookings([])
    }
  }, [selectedClient])

  const loadNextNumber = async () => {
    const num = await previewNextInvoiceNumber()
    setNextNumber(num)
  }

  const loadClients = async () => {
    try {
      setLoadingClients(true)
      const { data } = await supabase
        .from('profiles')
        .select('id, email, full_name, address')
        .order('full_name')
      setClients(data || [])
    } catch (err) {
      console.error('Error loading clients:', err)
    } finally {
      setLoadingClients(false)
    }
  }

  const loadClientBookings = async (userId) => {
    const { data } = await supabase
      .from('bookings')
      .select('*')
      .eq('user_id', userId)
      .is('invoice_id', null) // Not yet invoiced
      .order('created_at', { ascending: false })
    setBookings(data || [])
  }

  const toggleBookingSelection = (bookingId) => {
    setSelectedBookings(prev => 
      prev.includes(bookingId)
        ? prev.filter(id => id !== bookingId)
        : [...prev, bookingId]
    )
  }

  const addCustomLine = () => {
    setCustomLines(prev => [...prev, {
      id: Date.now(),
      description: '',
      quantity: 1,
      unitPrice: 0
    }])
  }

  const updateCustomLine = (id, field, value) => {
    setCustomLines(prev => prev.map(line => 
      line.id === id ? { ...line, [field]: value } : line
    ))
  }

  const removeCustomLine = (id) => {
    setCustomLines(prev => prev.filter(line => line.id !== id))
  }

  // Calculate totals
  const calculateTotals = () => {
    let subtotal = 0

    // From selected bookings
    selectedBookings.forEach(bookingId => {
      const booking = bookings.find(b => b.id === bookingId)
      if (booking) {
        subtotal += parseFloat(booking.price_estimated) || 0
      }
    })

    // From custom lines
    customLines.forEach(line => {
      subtotal += (parseFloat(line.unitPrice) || 0) * (parseInt(line.quantity) || 1)
    })

    return {
      subtotal,
      total: subtotal // No tax for micro-entreprise
    }
  }

  const handleCreateInvoice = async (sendEmail = false) => {
    if (!selectedClient) {
      setError('Veuillez sélectionner un client')
      return
    }

    if (selectedBookings.length === 0 && customLines.length === 0) {
      setError('Veuillez sélectionner des réservations ou ajouter des lignes')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { subtotal, total } = calculateTotals()

      // Build invoice lines
      const lines = []

      // From bookings
      selectedBookings.forEach(bookingId => {
        const booking = bookings.find(b => b.id === bookingId)
        if (booking) {
          lines.push({
            description: `Course du ${format(new Date(booking.scheduled_date || booking.created_at), 'dd/MM/yyyy')}`,
            quantity: 1,
            unitPrice: parseFloat(booking.price_estimated) || 0,
            total: parseFloat(booking.price_estimated) || 0,
            bookingId: booking.id
          })
        }
      })

      // From custom lines
      customLines.forEach(line => {
        if (line.description) {
          const qty = parseInt(line.quantity) || 1
          const price = parseFloat(line.unitPrice) || 0
          lines.push({
            description: line.description,
            quantity: qty,
            unitPrice: price,
            total: qty * price
          })
        }
      })

      // Create invoice
      const invoice = await createInvoice({
        userId: selectedClient.id,
        bookingIds: selectedBookings,
        clientName: selectedClient.full_name || selectedClient.email,
        clientEmail: selectedClient.email,
        clientAddress: selectedClient.address || '',
        subtotal,
        total,
        dueDate: dueDate,
        notes: notes,
        lines
      })

      // Generate and download PDF
      const invoiceWithLines = { ...invoice, lines }
      downloadInvoicePdf(invoiceWithLines)

      setSuccess(`Facture ${invoice.number} créée avec succès !`)
      
      // Reset form
      setSelectedClient(null)
      setSelectedBookings([])
      setCustomLines([])
      setNotes('')
      loadNextNumber()
      
      onInvoiceCreated?.()

      setTimeout(() => setSuccess(null), 3000)

    } catch (err) {
      console.error('Error creating invoice:', err)
      setError(err.message || 'Erreur lors de la création')
    } finally {
      setLoading(false)
    }
  }

  const { subtotal, total } = calculateTotals()

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
          <FileText className="w-5 h-5 mr-2 text-blue-500" />
          Créer une Facture
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Prochain numéro : <span className="font-mono font-medium text-purple-600">{nextNumber}</span>
        </p>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Error/Success Messages */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-center">
            <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="p-4 bg-green-50 border border-green-100 rounded-xl text-green-600 text-sm flex items-center">
            <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" />
            {success}
          </div>
        )}

        {/* Client Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
            <User className="w-4 h-4 mr-1" />
            Client
          </label>
          <select
            value={selectedClient?.id || ''}
            onChange={(e) => {
              const client = clients.find(c => c.id === e.target.value)
              setSelectedClient(client || null)
            }}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            disabled={loadingClients}
          >
            <option value="">Sélectionner un client...</option>
            {clients.map(client => (
              <option key={client.id} value={client.id}>
                {client.full_name || client.email}
              </option>
            ))}
          </select>
        </div>

        {/* Bookings Selection */}
        {selectedClient && bookings.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Réservations à facturer
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {bookings.map(booking => (
                <label
                  key={booking.id}
                  className={`flex items-center p-3 border rounded-xl cursor-pointer transition-colors ${
                    selectedBookings.includes(booking.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedBookings.includes(booking.id)}
                    onChange={() => toggleBookingSelection(booking.id)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="ml-3 flex-1 text-sm text-gray-700">
                    {format(new Date(booking.scheduled_date || booking.created_at), 'dd/MM/yyyy')}
                  </span>
                  <span className="font-medium text-gray-900">
                    {parseFloat(booking.price_estimated || 0).toFixed(2)} €
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Custom Lines */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Lignes personnalisées
            </label>
            <button
              onClick={addCustomLine}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
            >
              <Plus className="w-4 h-4 mr-1" />
              Ajouter
            </button>
          </div>
          
          {customLines.map(line => (
            <div key={line.id} className="flex items-center gap-2 mb-2">
              <input
                type="text"
                value={line.description}
                onChange={(e) => updateCustomLine(line.id, 'description', e.target.value)}
                placeholder="Description"
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                value={line.quantity}
                onChange={(e) => updateCustomLine(line.id, 'quantity', e.target.value)}
                className="w-16 px-2 py-2 border border-gray-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                min={1}
              />
              <input
                type="number"
                value={line.unitPrice}
                onChange={(e) => updateCustomLine(line.id, 'unitPrice', e.target.value)}
                placeholder="Prix"
                className="w-24 px-2 py-2 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                step="0.01"
              />
              <button
                onClick={() => removeCustomLine(line.id)}
                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Due Date & Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              Date d'échéance
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes optionnelles..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Totals */}
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="flex justify-between items-center text-lg">
            <span className="font-medium text-gray-700">Total</span>
            <span className="font-bold text-gray-900 flex items-center">
              <Euro className="w-5 h-5 mr-1" />
              {total.toFixed(2)}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">TVA non applicable, art. 293 B du CGI</p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => handleCreateInvoice(false)}
            disabled={loading || !selectedClient}
            className="flex-1 flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : (
              <Download className="w-5 h-5 mr-2" />
            )}
            Générer PDF
          </button>
        </div>
      </div>
    </div>
  )
}
