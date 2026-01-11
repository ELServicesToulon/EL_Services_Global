import { supabase } from './supabaseClient'

// ============================================
// INVOICE NUMBERING SETTINGS
// ============================================

/**
 * Get current invoice numbering settings
 * @returns {Promise<{prefix: string, year: number, sequence: number}>}
 */
export async function getInvoiceSettings() {
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'next_invoice_number')
    .single()

  if (error) {
    console.error('Error fetching invoice settings:', error)
    // Return defaults if not found
    return { prefix: 'FACT', year: new Date().getFullYear(), sequence: 1 }
  }

  return data.value
}

/**
 * Update the next invoice number manually
 * @param {{prefix?: string, year?: number, sequence?: number}} updates
 */
export async function updateInvoiceSettings(updates) {
  const current = await getInvoiceSettings()
  const newValue = { ...current, ...updates }

  const { error } = await supabase
    .from('settings')
    .upsert({
      key: 'next_invoice_number',
      value: newValue,
      updated_at: new Date().toISOString()
    })

  if (error) {
    console.error('Error updating invoice settings:', error)
    throw error
  }

  return newValue
}

/**
 * Generate the next invoice number and increment the sequence
 * Handles year rollover automatically
 * @returns {Promise<string>} The generated invoice number (e.g., "FACT-2026-0042")
 */
export async function generateInvoiceNumber() {
  const settings = await getInvoiceSettings()
  const currentYear = new Date().getFullYear()

  // Reset sequence if year changed
  let sequence = settings.sequence
  let year = settings.year

  if (year !== currentYear) {
    year = currentYear
    sequence = 1
  }

  // Format: PREFIX-YEAR-NNNN
  const invoiceNumber = `${settings.prefix}-${year}-${String(sequence).padStart(4, '0')}`

  // Increment and save
  await updateInvoiceSettings({
    year: year,
    sequence: sequence + 1
  })

  return invoiceNumber
}

/**
 * Preview what the next invoice number will be (without incrementing)
 * @returns {Promise<string>}
 */
export async function previewNextInvoiceNumber() {
  const settings = await getInvoiceSettings()
  const currentYear = new Date().getFullYear()

  const year = settings.year !== currentYear ? currentYear : settings.year
  const sequence = settings.year !== currentYear ? 1 : settings.sequence

  return `${settings.prefix}-${year}-${String(sequence).padStart(4, '0')}`
}

// ============================================
// INVOICE CRUD OPERATIONS
// ============================================

/**
 * Create a new invoice
 * @param {Object} invoiceData
 */
export async function createInvoice(invoiceData) {
  const number = await generateInvoiceNumber()

  const invoice = {
    number,
    user_id: invoiceData.userId,
    booking_ids: invoiceData.bookingIds || [],
    client_name: invoiceData.clientName,
    client_email: invoiceData.clientEmail,
    client_address: invoiceData.clientAddress,
    client_siret: invoiceData.clientSiret || null,
    subtotal: invoiceData.subtotal,
    discount_amount: invoiceData.discountAmount || 0,
    discount_type: invoiceData.discountType || null,
    tax_rate: invoiceData.taxRate || 0,
    tax_amount: invoiceData.taxAmount || 0,
    total: invoiceData.total,
    period_start: invoiceData.periodStart || null,
    period_end: invoiceData.periodEnd || null,
    due_date: invoiceData.dueDate || null,
    notes: invoiceData.notes || null,
    status: 'draft'
  }

  const { data, error } = await supabase
    .from('invoices')
    .insert(invoice)
    .select()
    .single()

  if (error) {
    console.error('Error creating invoice:', error)
    throw error
  }

  // Insert invoice lines if provided
  if (invoiceData.lines && invoiceData.lines.length > 0) {
    const lines = invoiceData.lines.map(line => ({
      invoice_id: data.id,
      description: line.description,
      quantity: line.quantity || 1,
      unit_price: line.unitPrice,
      total: line.total,
      booking_id: line.bookingId || null
    }))

    const { error: linesError } = await supabase
      .from('invoice_lines')
      .insert(lines)

    if (linesError) {
      console.error('Error creating invoice lines:', linesError)
      // Don't throw, invoice was created
    }
  }

  return data
}

/**
 * Get all invoices (for admin)
 */
export async function getAllInvoices() {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching invoices:', error)
    throw error
  }

  return data || []
}

/**
 * Get invoices for a specific user
 */
export async function getInvoicesByUser(userId) {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching user invoices:', error)
    throw error
  }

  return data || []
}

/**
 * Get a single invoice with its lines
 */
export async function getInvoiceWithLines(invoiceId) {
  const { data: invoice, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .single()

  if (error) {
    console.error('Error fetching invoice:', error)
    throw error
  }

  const { data: lines } = await supabase
    .from('invoice_lines')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('created_at', { ascending: true })

  return { ...invoice, lines: lines || [] }
}

/**
 * Update invoice status
 */
export async function updateInvoiceStatus(invoiceId, status) {
  const updates = { status }

  if (status === 'sent') {
    updates.sent_at = new Date().toISOString()
  } else if (status === 'paid') {
    updates.paid_at = new Date().toISOString()
  }

  const { error } = await supabase
    .from('invoices')
    .update(updates)
    .eq('id', invoiceId)

  if (error) {
    console.error('Error updating invoice status:', error)
    throw error
  }
}

/**
 * Update invoice PDF URL
 */
export async function updateInvoicePdfUrl(invoiceId, pdfUrl) {
  const { error } = await supabase
    .from('invoices')
    .update({ pdf_url: pdfUrl })
    .eq('id', invoiceId)

  if (error) {
    console.error('Error updating invoice PDF URL:', error)
    throw error
  }
}

// ============================================
// BILLING STATISTICS
// ============================================

/**
 * Get billing statistics for admin dashboard
 */
export async function getBillingStats() {
  const { data, error } = await supabase
    .from('invoices')
    .select('total, status, created_at')

  if (error) {
    console.error('Error fetching billing stats:', error)
    return { total: 0, paid: 0, pending: 0, count: 0 }
  }

  const stats = {
    total: 0,
    paid: 0,
    pending: 0,
    count: data?.length || 0
  }

  data?.forEach(inv => {
    stats.total += parseFloat(inv.total) || 0
    if (inv.status === 'paid') {
      stats.paid += parseFloat(inv.total) || 0
    } else if (inv.status !== 'cancelled') {
      stats.pending += parseFloat(inv.total) || 0
    }
  })

  return stats
}
