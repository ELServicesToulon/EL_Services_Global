import { supabase } from './supabaseClient'

/**
 * Récupère les factures d'un utilisateur
 * @param {string} userId - L'ID de l'utilisateur
 * @returns {Promise<Array>} Liste des factures
 */
export async function fetchInvoices(userId) {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching invoices:', error)
    throw error
  }

  return data || []
}

/**
 * Télécharge le PDF d'une facture
 * @param {string} pdfUrl - URL du PDF stocké
 * @param {string} invoiceNumber - Numéro de facture pour le nom du fichier
 */
export async function downloadInvoicePdf(pdfUrl, invoiceNumber) {
  try {
    const response = await fetch(pdfUrl)
    const blob = await response.blob()
    
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `facture_${invoiceNumber}.pdf`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  } catch (error) {
    console.error('Error downloading PDF:', error)
    throw error
  }
}

/**
 * Envoie une facture par email via Edge Function
 * @param {string} invoiceId - ID de la facture
 * @param {string} email - Email du destinataire
 */
export async function sendInvoiceByEmail(invoiceId, email) {
  const { data, error } = await supabase.functions.invoke('send-invoice-email', {
    body: { invoiceId, email }
  })

  if (error) {
    console.error('Error sending invoice email:', error)
    throw error
  }

  return data
}
