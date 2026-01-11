import jsPDF from 'jspdf'
import 'jspdf-autotable'

// Company info (should come from config/env)
const COMPANY = {
  name: 'Mediconvoi',
  address: '80 Avenue du Général de Gaulle, 83160 La Valette-du-Var',
  email: 'mediconvoi@gmail.com',
  phone: '',
  siret: '48091306000020',
  tvaNotice: 'TVA non applicable, art. 293 B du CGI',
  bank: 'Banque Populaire Méditerranée',
  iban: 'FR76 4061 8804 7600 0403 5757 187',
  bic: 'BPMED'
}

/**
 * Format amount to French currency format
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount)
}

/**
 * Format date to French format
 */
function formatDate(date) {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

/**
 * Generate a PDF invoice
 * @param {Object} invoice - Invoice data with lines
 * @returns {jsPDF} The PDF document
 */
export function generateInvoicePdf(invoice) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = 20

  // ===== HEADER =====
  // Company name
  doc.setFontSize(22)
  doc.setTextColor(142, 68, 173) // Purple
  doc.text(COMPANY.name, 20, y)

  // Company info (right side)
  doc.setFontSize(9)
  doc.setTextColor(100)
  const companyLines = [
    COMPANY.address,
    `SIRET: ${COMPANY.siret}`,
    COMPANY.email
  ]
  companyLines.forEach((line, i) => {
    doc.text(line, pageWidth - 20, y + (i * 4), { align: 'right' })
  })

  y += 25

  // ===== INVOICE TITLE =====
  doc.setFillColor(244, 246, 247)
  doc.rect(0, y, pageWidth, 12, 'F')
  doc.setFontSize(12)
  doc.setTextColor(142, 68, 173)
  doc.text(`FACTURE N° ${invoice.number}`, pageWidth / 2, y + 8, { align: 'center' })

  y += 25

  // ===== CLIENT & INVOICE INFO =====
  // Client box
  doc.setFontSize(9)
  doc.setTextColor(93, 173, 226) // Blue
  doc.text('DESTINATAIRE', 20, y)
  
  doc.setFontSize(11)
  doc.setTextColor(44, 62, 80)
  doc.text(invoice.client_name || '', 20, y + 6)
  
  doc.setFontSize(9)
  doc.setTextColor(100)
  if (invoice.client_address) {
    const addressLines = doc.splitTextToSize(invoice.client_address, 80)
    doc.text(addressLines, 20, y + 12)
  }

  // Invoice metadata (right side)
  const metaStartX = pageWidth - 70
  doc.setFontSize(9)
  doc.setTextColor(100)
  doc.text('Date:', metaStartX, y)
  doc.text('Échéance:', metaStartX, y + 6)
  doc.text('Période:', metaStartX, y + 12)

  doc.setTextColor(44, 62, 80)
  doc.text(formatDate(invoice.created_at), metaStartX + 25, y)
  doc.text(formatDate(invoice.due_date), metaStartX + 25, y + 6)
  
  const period = invoice.period_start && invoice.period_end
    ? `${formatDate(invoice.period_start)} - ${formatDate(invoice.period_end)}`
    : ''
  doc.text(period, metaStartX + 25, y + 12)

  y += 35

  // ===== TOTAL BOX =====
  doc.setFillColor(244, 246, 247)
  doc.roundedRect(pageWidth - 70, y - 5, 55, 25, 3, 3, 'F')
  
  doc.setFontSize(10)
  doc.setTextColor(52, 73, 94)
  doc.text('Net à payer', pageWidth - 65, y + 3)
  
  doc.setFontSize(16)
  doc.setTextColor(142, 68, 173)
  doc.text(formatCurrency(invoice.total), pageWidth - 65, y + 14)

  y += 30

  // ===== LINES TABLE =====
  const lines = invoice.lines || []
  const tableData = lines.map(line => [
    line.description,
    line.quantity?.toString() || '1',
    formatCurrency(line.unit_price),
    formatCurrency(line.total)
  ])

  doc.autoTable({
    startY: y,
    head: [['Description', 'Qté', 'Prix unitaire', 'Total']],
    body: tableData,
    theme: 'plain',
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [142, 68, 173],
      fontStyle: 'bold',
      fontSize: 9
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [52, 73, 94]
    },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 35, halign: 'right' },
      3: { cellWidth: 35, halign: 'right' }
    },
    margin: { left: 20, right: 20 }
  })

  y = doc.lastAutoTable.finalY + 15

  // ===== TOTALS =====
  const totalsX = pageWidth - 80
  doc.setFontSize(9)
  
  // Subtotal
  doc.setTextColor(100)
  doc.text('Sous-total:', totalsX, y)
  doc.setTextColor(44, 62, 80)
  doc.text(formatCurrency(invoice.subtotal), pageWidth - 20, y, { align: 'right' })

  // Discount (if any)
  if (invoice.discount_amount && invoice.discount_amount > 0) {
    y += 6
    doc.setTextColor(100)
    doc.text('Remise:', totalsX, y)
    doc.setTextColor(204, 0, 0)
    doc.text(`-${formatCurrency(invoice.discount_amount)}`, pageWidth - 20, y, { align: 'right' })
  }

  // TVA notice
  y += 6
  doc.setTextColor(100)
  doc.setFontSize(8)
  doc.text(COMPANY.tvaNotice, totalsX, y)

  // Total
  y += 10
  doc.setFontSize(11)
  doc.setTextColor(142, 68, 173)
  doc.text('TOTAL:', totalsX, y)
  doc.text(formatCurrency(invoice.total), pageWidth - 20, y, { align: 'right' })

  y += 20

  // ===== PAYMENT INFO =====
  doc.setDrawColor(244, 246, 247)
  doc.line(20, y, pageWidth - 20, y)
  y += 10

  doc.setFontSize(10)
  doc.setTextColor(44, 62, 80)
  doc.text('Informations de règlement', 20, y)

  y += 8
  doc.setFontSize(9)
  doc.setTextColor(100)
  doc.text(`Banque: ${COMPANY.bank}`, 20, y)
  doc.text(`IBAN: ${COMPANY.iban}`, 20, y + 5)
  doc.text(`BIC: ${COMPANY.bic}`, 20, y + 10)

  // Notes
  if (invoice.notes) {
    y += 25
    doc.setFontSize(8)
    doc.setTextColor(150)
    doc.text('Notes:', 20, y)
    const noteLines = doc.splitTextToSize(invoice.notes, pageWidth - 40)
    doc.text(noteLines, 20, y + 5)
  }

  return doc
}

/**
 * Generate and download invoice PDF
 */
export function downloadInvoicePdf(invoice) {
  const doc = generateInvoicePdf(invoice)
  doc.save(`${invoice.number}.pdf`)
}

/**
 * Generate invoice PDF as blob for upload
 */
export function getInvoicePdfBlob(invoice) {
  const doc = generateInvoicePdf(invoice)
  return doc.output('blob')
}

/**
 * Generate invoice PDF as base64
 */
export function getInvoicePdfBase64(invoice) {
  const doc = generateInvoicePdf(invoice)
  return doc.output('datauristring')
}
