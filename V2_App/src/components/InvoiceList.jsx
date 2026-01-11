import { useState, useEffect } from 'react'
import { FileText, Download, Mail, Loader2, AlertCircle } from 'lucide-react'
import { fetchInvoices, downloadInvoicePdf, sendInvoiceByEmail } from '../lib/invoices'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function InvoiceList({ userId, userEmail }) {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sendingId, setSendingId] = useState(null)
  const [downloadingId, setDownloadingId] = useState(null)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    if (userId) {
      loadInvoices()
    }
  }, [userId])

  const loadInvoices = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await fetchInvoices(userId)
      setInvoices(data)
    } catch (err) {
      setError('Impossible de charger les factures')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (invoice) => {
    if (!invoice.pdf_url) {
      showToast('PDF non disponible', 'error')
      return
    }
    
    try {
      setDownloadingId(invoice.id)
      await downloadInvoicePdf(invoice.pdf_url, invoice.number)
      showToast('Téléchargement démarré', 'success')
    } catch {
      showToast('Erreur lors du téléchargement', 'error')
    } finally {
      setDownloadingId(null)
    }
  }

  const handleSendEmail = async (invoice) => {
    try {
      setSendingId(invoice.id)
      await sendInvoiceByEmail(invoice.id, userEmail)
      showToast('Facture envoyée par email', 'success')
    } catch {
      showToast('Erreur lors de l\'envoi', 'error')
    } finally {
      setSendingId(null)
    }
  }

  const showToast = (message, type) => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <span className="ml-2 text-gray-500">Chargement des factures...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-center py-8 text-red-500">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <FileText className="w-5 h-5 mr-2 text-blue-500" />
            Mes Factures
          </h3>
        </div>

        {invoices.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <FileText className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p>Aucune facture pour le moment</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="px-6 py-4 hover:bg-gray-50 transition-colors flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <span className="font-medium text-gray-800">
                      {invoice.number}
                    </span>
                    <span className="text-sm text-gray-400">
                      {format(new Date(invoice.created_at), 'dd MMM yyyy', { locale: fr })}
                    </span>
                  </div>
                  <div className="text-lg font-semibold text-gray-900 mt-1">
                    {formatAmount(invoice.amount)}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleDownload(invoice)}
                    disabled={downloadingId === invoice.id}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Télécharger PDF"
                  >
                    {downloadingId === invoice.id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Download className="w-5 h-5" />
                    )}
                  </button>
                  <button
                    onClick={() => handleSendEmail(invoice)}
                    disabled={sendingId === invoice.id}
                    className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Envoyer par email"
                  >
                    {sendingId === invoice.id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Mail className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-4 right-4 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium animate-fade-in z-50 ${
            toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'
          }`}
        >
          {toast.message}
        </div>
      )}
    </>
  )
}
