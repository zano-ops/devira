import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Quote, Profile } from '../types'

function fmt(n: number) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}
function fmtDate(s: string) { return new Date(s).toLocaleDateString('fr-FR') }
function addDays(s: string, d: number) {
  const dt = new Date(s); dt.setDate(dt.getDate() + d); return fmtDate(dt.toISOString())
}

const BLUE = '#1E3A5F'
const ML = 14
const MR = 14

function buildDoc(quote: Quote, profile: Profile): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const q = quote.quote_json
  const W = 210
  const CW = W - ML - MR
  const discount = quote.discount_percent || 0
  const sousTotal = q.lignes.reduce((s, l) => s + l.quantite * l.prix_unitaire_ht, 0)
  const remise = discount > 0 ? sousTotal * discount / 100 : 0

  // Calculer TVA par taux
  const tvaByRate: Record<number, number> = {}
  q.lignes.forEach(l => {
    const rate = l.tva_rate ?? q.taux_tva
    const lineBase = l.total_ht * (1 - discount / 100)
    tvaByRate[rate] = parseFloat(((tvaByRate[rate] || 0) + lineBase * rate / 100).toFixed(2))
  })
  const totalTva = Object.values(tvaByRate).reduce((s, v) => s + v, 0)
  const ttc = parseFloat((sousTotal - remise + totalTva).toFixed(2))
  const validite = q.validite_jours || 30

  let y = 14

  // ── COMPANY NAME ──
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.setTextColor(BLUE)
  doc.text(profile.company_name || 'Votre Entreprise', ML, y)
  y += 6

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor('#555555')
  const companyLines: string[] = [
    profile.owner_name,
    profile.address,
    [profile.zip_code, profile.city].filter(Boolean).join(' '),
    profile.phone ? `Tél : ${profile.phone}` : '',
    profile.siret ? `SIRET : ${profile.siret}` : '',
  ].filter(Boolean) as string[]
  companyLines.forEach(line => { doc.text(line, ML, y); y += 4 })

  // ── CLIENT (right column) ──
  if (q.client?.nom) {
    let cy = 14
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor('#1a1a1a')
    doc.text(q.client.nom, W - MR, cy, { align: 'right' })
    cy += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor('#555555')
    if (q.client.adresse) { doc.text(q.client.adresse, W - MR, cy, { align: 'right' }); cy += 4 }
    if (q.client.email) { doc.text(q.client.email, W - MR, cy, { align: 'right' }) }
  }

  // ── BLUE DIVIDER ──
  y = Math.max(y + 3, 44)
  doc.setFillColor(BLUE)
  doc.rect(ML, y, CW, 2.5, 'F')
  y += 8

  // ── QUOTE / AVENANT TITLE ──
  const isAvenant = !!quote.avenant_number
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(isAvenant ? 16 : 20)
  doc.setTextColor(BLUE)
  if (isAvenant) {
    doc.text(`AVENANT N°${quote.avenant_number}`, ML, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor('#666666')
    doc.text(`au Devis N° ${quote.parent_quote_number || '—'}`, ML, y)
  } else {
    doc.text(`DEVIS N° ${quote.quote_number}`, ML, y)
  }
  y += 8

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor('#666666')
  doc.text(
    `Date : ${fmtDate(quote.created_at)}   •   Valide jusqu'au : ${addDays(quote.created_at, validite)}   •   Durée : ${q.duree_estimee}`,
    ML, y
  )
  y += 7

  // Titre chantier badge
  doc.setFillColor('#EFF6FF')
  const badgeText = q.titre
  const textW = doc.getStringUnitWidth(badgeText) * 10 / doc.internal.scaleFactor
  doc.roundedRect(ML, y - 4, Math.min(textW + 10, CW), 8, 2, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(BLUE)
  doc.text(badgeText, ML + 5, y + 0.5)
  y += 11

  // Signature badge if signed
  if (q.signature) {
    doc.setFillColor('#ECFDF5')
    doc.roundedRect(ML, y - 4, 90, 8, 2, 2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor('#059669')
    doc.text(`✓ Signé le ${fmtDate(q.signature.signed_at)} par ${q.signature.signed_by}`, ML + 3, y + 0.5)
    y += 11
  }

  // ── ITEMS TABLE ──
  autoTable(doc, {
    startY: y,
    head: [['Désignation / Description', 'Qté', 'Unité', 'P.U. HT', 'Total HT', 'TVA']],
    body: q.lignes.map(l => [
      l.designation,
      String(l.quantite),
      l.unite,
      fmt(l.prix_unitaire_ht),
      fmt(l.quantite * l.prix_unitaire_ht),
      `${l.tva_rate ?? q.taux_tva}%`,
    ]),
    styles: {
      fontSize: 9,
      cellPadding: { top: 3.5, bottom: 3.5, left: 4, right: 4 },
      lineColor: [235, 235, 235],
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: [30, 58, 95],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    alternateRowStyles: { fillColor: [249, 249, 249] },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 14, halign: 'center' },
      2: { cellWidth: 16, halign: 'center' },
      3: { cellWidth: 28, halign: 'right' },
      4: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
      5: { cellWidth: 16, halign: 'center', textColor: [100, 100, 100] },
    },
    margin: { left: ML, right: MR },
    theme: 'grid',
  })

  y = (doc as any).lastAutoTable.finalY + 5

  // ── TOTAUX ──
  const totauxBody: string[][] = [
    ['Sous-total HT', fmt(sousTotal)],
  ]
  if (discount > 0) {
    totauxBody.push([`Remise (${discount}%)`, `- ${fmt(remise)}`])
  }

  // TVA par taux (si plusieurs taux, afficher le détail)
  const tvaRates = Object.keys(tvaByRate).map(Number).sort((a, b) => a - b)
  if (tvaRates.length > 1) {
    tvaRates.forEach(rate => {
      totauxBody.push([`TVA ${rate}%`, fmt(tvaByRate[rate])])
    })
  } else {
    totauxBody.push([`TVA ${q.taux_tva}%`, fmt(totalTva)])
  }

  autoTable(doc, {
    startY: y,
    body: totauxBody,
    styles: {
      fontSize: 9,
      cellPadding: { top: 3, bottom: 3, left: 8, right: 8 },
    },
    columnStyles: {
      0: { cellWidth: 45, textColor: [85, 85, 85] },
      1: { cellWidth: 42, halign: 'right', fontStyle: 'bold', textColor: [26, 26, 26] },
    },
    margin: { left: W - MR - 87, right: MR },
    theme: 'plain',
    tableLineColor: [240, 240, 240],
    tableLineWidth: 0.3,
  })

  // TTC big row
  const ttcY = (doc as any).lastAutoTable.finalY
  doc.setFillColor(30, 58, 95)
  doc.rect(W - MR - 87, ttcY, 87, 12, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(255, 255, 255)
  doc.text('Total TTC', W - MR - 87 + 8, ttcY + 8)
  doc.setTextColor(245, 158, 11)
  doc.setFontSize(13)
  doc.text(fmt(ttc), W - MR - 2, ttcY + 8, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(150, 150, 150)
  doc.text(`Acompte 30 % : ${fmt(ttc * 0.3)}`, W - MR - 2, ttcY + 17, { align: 'right' })

  y = ttcY + 22

  // Notes
  if (q.notes) {
    doc.setFillColor(255, 251, 235)
    doc.roundedRect(ML, y, CW, 10, 2, 2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(146, 64, 14)
    doc.text('Note : ', ML + 3, y + 6)
    doc.setFont('helvetica', 'normal')
    const noteLines = doc.splitTextToSize(q.notes, CW - 18)
    doc.text(noteLines[0] || '', ML + 14, y + 6)
    y += 14
  }

  // ── CONDITIONS ──
  doc.setDrawColor(229, 229, 229)
  doc.setLineWidth(0.3)
  doc.line(ML, y, W - MR, y)
  y += 5

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(BLUE)
  doc.text('CONDITIONS DE PAIEMENT', ML, y)
  y += 4

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor('#555555')
  const conditions = q.conditions || 'Acompte 30 % à la commande, solde à réception des travaux.'
  const condLines = doc.splitTextToSize(conditions, CW)
  doc.text(condLines, ML, y)
  y += condLines.length * 4 + 2
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8)
  doc.text(`Durée de validité : ${validite} jours à compter de la date d'émission.`, ML, y)
  y += 9

  // ── SIGNATURES ──
  const sigW = (CW - 6) / 2
  const sigH = q.signature ? 18 : 26

  // Entreprise box
  doc.setDrawColor(220, 220, 220)
  doc.setLineWidth(0.3)
  doc.roundedRect(ML, y, sigW, sigH, 2, 2)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor('#888888')
  doc.text("Pour l'entreprise (cachet et signature)", ML + 3, y + 5)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(BLUE)
  doc.text(profile.company_name || '', ML + 3, y + 11)
  if (!q.signature) {
    doc.setDrawColor(200, 200, 200)
    doc.line(ML + 3, y + 22, ML + sigW - 3, y + 22)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor('#AAAAAA')
    doc.text('Cachet / Signature artisan', ML + sigW / 2, y + 25, { align: 'center' })
  }

  // Client box
  const sigRX = ML + sigW + 6
  doc.setDrawColor(220, 220, 220)
  doc.roundedRect(sigRX, y, sigW, sigH, 2, 2)

  if (q.signature) {
    // Signed electronically
    doc.setFillColor(236, 253, 245)
    doc.roundedRect(sigRX, y, sigW, sigH, 2, 2, 'F')
    doc.setDrawColor(16, 185, 129)
    doc.roundedRect(sigRX, y, sigW, sigH, 2, 2)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor('#059669')
    doc.text('✓ Signé électroniquement', sigRX + sigW / 2, y + 6, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor('#065F46')
    doc.text(q.signature.signed_by, sigRX + sigW / 2, y + 11, { align: 'center' })
    doc.text(fmtDate(q.signature.signed_at), sigRX + sigW / 2, y + 15, { align: 'center' })
  } else {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor('#888888')
    doc.text('Pour le client — Bon pour accord', sigRX + 3, y + 5)
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(7.5)
    doc.setTextColor('#AAAAAA')
    doc.text('Précédé de « Lu et approuvé »', sigRX + 3, y + 11)
    doc.setDrawColor(200, 200, 200)
    doc.line(sigRX + 3, y + 22, sigRX + sigW - 3, y + 22)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.text('Date et signature client', sigRX + sigW / 2, y + 25, { align: 'center' })
  }

  // ── FOOTER LINE ──
  const footerY = 286
  doc.setFillColor(30, 58, 95)
  doc.rect(0, footerY, W, 1, 'F')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor('#777777')
  const f1 = `${profile.company_name || ''}${profile.address ? ' • ' + profile.address : ''}${profile.city ? ', ' + profile.city : ''}`
  const f2 = profile.siret ? `SIRET : ${profile.siret}` : ''
  const tvaLabel = Object.keys(tvaByRate).length > 1
    ? `TVA mixte • DevisPro BTP`
    : `TVA ${q.taux_tva}% • DevisPro BTP`
  doc.text(f1.trim(), ML, footerY + 5)
  if (f2) doc.text(f2, W / 2, footerY + 5, { align: 'center' })
  doc.text(tvaLabel, W - MR, footerY + 5, { align: 'right' })

  return doc
}

export function downloadQuotePdf(quote: Quote, profile: Profile): Promise<void> {
  return new Promise((resolve) => {
    const doc = buildDoc(quote, profile)
    doc.save(`Devis-${quote.quote_number}.pdf`)
    resolve()
  })
}

export async function getQuotePdfBase64(quote: Quote, profile: Profile): Promise<string> {
  const doc = buildDoc(quote, profile)
  return doc.output('datauristring').split(',')[1]
}
