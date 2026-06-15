import type { jsPDF as jsPDFType } from 'jspdf'
import type { Quote, Profile, Invoice } from '../types'

function fmt(n: number) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .replace(/[  ]/g, ' ')
    + ' €'
}
function fmtDate(s: string) { return new Date(s).toLocaleDateString('fr-FR') }
function addDays(s: string, d: number) {
  const dt = new Date(s); dt.setDate(dt.getDate() + d); return fmtDate(dt.toISOString())
}

const BLUE = '#1E3A5F'
const ML = 14
const MR = 14

async function loadImageBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: 'cors', cache: 'force-cache' })
    if (!res.ok) return null
    const blob = await res.blob()
    return new Promise(resolve => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch { return null }
}

async function buildDoc(quote: Quote, profile: Profile): Promise<jsPDFType> {
  const { jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const q = quote.quote_json
  const W = 210
  const CW = W - ML - MR
  const discount = quote.discount_percent || 0
  const sousTotal = q.lignes.reduce((s, l) => s + l.quantite * l.prix_unitaire_ht, 0)
  const remise = discount > 0 ? sousTotal * discount / 100 : 0

  const tvaByRate: Record<number, number> = {}
  q.lignes.forEach(l => {
    const rate = l.tva_rate ?? q.taux_tva
    const lineBase = l.total_ht * (1 - discount / 100)
    tvaByRate[rate] = parseFloat(((tvaByRate[rate] || 0) + lineBase * rate / 100).toFixed(2))
  })
  const totalTva = Object.values(tvaByRate).reduce((s, v) => s + v, 0)
  const ttc = parseFloat((sousTotal - remise + totalTva).toFixed(2))
  const validite = q.validite_jours || 30

  // ── LOGO ──
  let logoLoaded = false
  if (profile.logo_url) {
    const logoUrl = profile.logo_url + (profile.logo_url.includes('?') ? '&' : '?') + 'v=' + Date.now()
    const logoBase64 = await loadImageBase64(logoUrl)
    if (logoBase64) {
      try {
        // Logo en haut à droite, max 40x25 mm
        const imgW = 40, imgH = 25
        doc.addImage(logoBase64, W - MR - imgW, 8, imgW, imgH, undefined, 'FAST')
        logoLoaded = true
      } catch {}
    }
  }

  let y = 14

  // ── EN-TÊTE ENTREPRISE ──
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
    profile.email ? `Email : ${profile.email}` : '',
    profile.siret ? `SIRET : ${profile.siret}` : '',
    profile.tva_intra ? `N° TVA : ${profile.tva_intra}` : '',
    profile.is_micro_entrepreneur ? `TVA non applicable - art. 293B CGI` : '',
  ].filter(Boolean) as string[]

  const maxLines = logoLoaded ? 7 : 10
  companyLines.slice(0, maxLines).forEach(line => { doc.text(line, ML, y); y += 4 })

  // ── CLIENT ──
  if (q.client?.nom) {
    let cy = 14
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor('#1a1a1a')
    const clientX = logoLoaded ? W - MR - 45 : W - MR
    doc.text(q.client.nom, clientX, cy, { align: 'right' })
    cy += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor('#555555')
    if (q.client.adresse) { doc.text(q.client.adresse, clientX, cy, { align: 'right' }); cy += 4 }
    if (q.client.email) { doc.text(q.client.email, clientX, cy, { align: 'right' }); cy += 4 }
    if ((q.client as any).phone) { doc.text(`Tél : ${(q.client as any).phone}`, clientX, cy, { align: 'right' }) }
  }

  // ── SÉPARATEUR ──
  y = Math.max(y + 3, logoLoaded ? 48 : 44)
  doc.setFillColor(BLUE)
  doc.rect(ML, y, CW, 2.5, 'F')
  y += 8

  // ── TITRE DEVIS / AVENANT ──
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
    doc.text(`au Devis N° ${quote.parent_quote_number || '-'}`, ML, y)
  } else {
    doc.text(`DEVIS N° ${quote.quote_number}`, ML, y)
  }
  y += 8

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor('#666666')
  doc.text(
    `Date : ${fmtDate(quote.created_at)}   -   Valide jusqu'au : ${addDays(quote.created_at, validite)}   -   Duree : ${q.duree_estimee}`,
    ML, y
  )
  y += 7

  // Badge titre chantier
  doc.setFillColor('#EFF6FF')
  const badgeText = q.titre
  const textW = doc.getStringUnitWidth(badgeText) * 10 / doc.internal.scaleFactor
  doc.roundedRect(ML, y - 4, Math.min(textW + 10, CW), 8, 2, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(BLUE)
  doc.text(badgeText, ML + 5, y + 0.5)
  y += 11

  // Badge signé
  if (q.signature) {
    doc.setFillColor('#ECFDF5')
    doc.roundedRect(ML, y - 4, 95, 8, 2, 2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor('#059669')
    doc.text(`Signe le ${fmtDate(q.signature.signed_at)} par ${q.signature.signed_by}`, ML + 3, y + 0.5)
    y += 11
  }

  // ── TABLEAU DES LIGNES (avec sections) ──
  const tableBody = q.lignes.map(l => {
    if (l.isSection) {
      return [{
        content: '>> ' + l.designation.toUpperCase(),
        colSpan: 6,
        styles: {
          fillColor: [239, 246, 255] as [number, number, number],
          textColor: [30, 58, 95] as [number, number, number],
          fontStyle: 'bold' as const,
          fontSize: 8.5,
          cellPadding: { top: 4, bottom: 4, left: 6, right: 4 },
        }
      }]
    }
    return [
      l.designation,
      String(l.quantite),
      l.unite,
      fmt(l.prix_unitaire_ht),
      fmt(l.quantite * l.prix_unitaire_ht),
      `${l.tva_rate ?? q.taux_tva}%`,
    ]
  })

  autoTable(doc, {
    startY: y,
    head: [['Désignation / Description', 'Qté', 'Unité', 'P.U. HT', 'Total HT', 'TVA']],
    body: tableBody,
    styles: {
      fontSize: 9,
      cellPadding: { top: 3.5, bottom: 3.5, left: 4, right: 4 },
      lineColor: [235, 235, 235],
      lineWidth: 0.3,
    },
    headStyles: { fillColor: [30, 58, 95], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
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
  const totauxBody: string[][] = [['Sous-total HT', fmt(sousTotal)]]
  if (discount > 0) {
    totauxBody.push([`Remise commerciale (${discount}%)`, `- ${fmt(remise)}`])
  }
  const tvaRates = Object.keys(tvaByRate).map(Number).sort((a, b) => a - b)
  if (tvaRates.length > 1) {
    tvaRates.forEach(rate => {
      const lbl = rate === 0 ? 'TVA non applicable (art. 293B CGI)' : `TVA ${rate}%`
      totauxBody.push([lbl, rate === 0 ? '-' : fmt(tvaByRate[rate])])
    })
  } else if (q.taux_tva === 0) {
    totauxBody.push(['TVA non applicable (art. 293B CGI)', '-'])
  } else {
    totauxBody.push([`TVA ${q.taux_tva}%`, fmt(totalTva)])
  }

  autoTable(doc, {
    startY: y,
    body: totauxBody,
    styles: { fontSize: 9, cellPadding: { top: 3, bottom: 3, left: 8, right: 8 } },
    columnStyles: {
      0: { cellWidth: 55, textColor: [85, 85, 85] },
      1: { cellWidth: 42, halign: 'right', fontStyle: 'bold', textColor: [26, 26, 26] },
    },
    margin: { left: W - MR - 97, right: MR },
    theme: 'plain',
    tableLineColor: [240, 240, 240],
    tableLineWidth: 0.3,
  })

  const ttcY = (doc as any).lastAutoTable.finalY
  doc.setFillColor(30, 58, 95)
  doc.rect(W - MR - 97, ttcY, 97, 12, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(255, 255, 255)
  doc.text('Total TTC', W - MR - 97 + 8, ttcY + 8)
  doc.setTextColor(245, 158, 11)
  doc.setFontSize(13)
  doc.text(fmt(ttc), W - MR - 2, ttcY + 8, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(150, 150, 150)
  doc.text(`Acompte 30% : ${fmt(ttc * 0.3)}`, W - MR - 2, ttcY + 17, { align: 'right' })

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

  // Attestation TVA réduite
  const hasTvaReduite = tvaRates.some(r => r < 20)
  if (hasTvaReduite && !profile.is_micro_entrepreneur) {
    doc.setFillColor(239, 246, 255)
    doc.roundedRect(ML, y, CW, 9, 2, 2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(30, 58, 95)
    doc.text('TVA réduite applicable : ', ML + 3, y + 5.5)
    doc.setFont('helvetica', 'normal')
    doc.text('une attestation simplifiée (Cerfa) doit être signée par le client.', ML + 40, y + 5.5)
    y += 13
  }

  // Nouvelle page si le contenu risque de déborder sur le pied de page fixe (y=286)
  if (y > 190) {
    doc.addPage()
    y = 14
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
  y += 5
  doc.setFontSize(7)
  doc.setTextColor('#BBBBBB')
  const hamonText = `Conformément à l'art. L.221-18 du Code de la consommation, le client bénéficie d'un délai de rétractation de 14 jours à compter de la signature.`
  const hamonLines = doc.splitTextToSize(hamonText, CW)
  doc.text(hamonLines, ML, y)
  y += hamonLines.length * 3.5 + 5

  // ── ZONES DE SIGNATURE ──
  const sigW = (CW - 6) / 2
  const sigH = q.signature ? 18 : 26

  // Artisan
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

  // Client
  const sigRX = ML + sigW + 6
  doc.setDrawColor(220, 220, 220)
  doc.roundedRect(sigRX, y, sigW, sigH, 2, 2)

  if (q.signature) {
    doc.setFillColor(236, 253, 245)
    doc.roundedRect(sigRX, y, sigW, sigH, 2, 2, 'F')
    doc.setDrawColor(16, 185, 129)
    doc.roundedRect(sigRX, y, sigW, sigH, 2, 2)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor('#059669')
    doc.text('Signe electroniquement', sigRX + sigW / 2, y + 6, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor('#065F46')
    doc.text(q.signature.signed_by, sigRX + sigW / 2, y + 11, { align: 'center' })
    doc.text(fmtDate(q.signature.signed_at), sigRX + sigW / 2, y + 15, { align: 'center' })
  } else {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor('#888888')
    doc.text('Pour le client - Bon pour accord', sigRX + 3, y + 5)
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

  // ── PHOTOS DE CHANTIER (si présentes, max 4) ──
  const photos = q.photos?.slice(0, 4) || []
  if (photos.length > 0) {
    // Vérifier l'espace restant ou ajouter une nouvelle page
    if (y > 210) {
      doc.addPage()
      y = 14
    } else {
      y += 6
    }

    doc.setDrawColor(229, 229, 229)
    doc.setLineWidth(0.3)
    doc.line(ML, y, W - MR, y)
    y += 6

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(BLUE)
    doc.text('PHOTOS DU CHANTIER', ML, y)
    y += 5

    const photoW = (CW - 6) / 2
    const photoH = 42
    let col = 0

    for (const photoUrl of photos) {
      try {
        const photoB64 = await loadImageBase64(photoUrl)
        if (photoB64) {
          const x = ML + col * (photoW + 6)
          doc.addImage(photoB64, x, y, photoW, photoH, undefined, 'FAST')
          col++
          if (col >= 2) { col = 0; y += photoH + 4 }
        }
      } catch {}
    }
    if (col > 0) y += photoH + 4
  }

  // ── PIED DE PAGE ──
  const footerY = 286
  doc.setFillColor(30, 58, 95)
  doc.rect(0, footerY, W, 1, 'F')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor('#777777')

  const f1Parts = [
    profile.company_name,
    profile.address ? profile.address + (profile.city ? ', ' + profile.city : '') : '',
  ].filter(Boolean)
  const f1 = f1Parts.join(' - ')

  const f2Parts = [
    profile.siret ? `SIRET : ${profile.siret}` : '',
    profile.assurance_decennale ? `Dec. : ${profile.assurance_decennale}` : '',
  ].filter(Boolean)
  const f2 = f2Parts.join(' - ')

  const tvaLabel = (profile.is_micro_entrepreneur || q.taux_tva === 0)
    ? 'TVA non applicable art. 293B CGI'
    : (Object.keys(tvaByRate).length > 1 ? 'TVA mixte' : `TVA ${q.taux_tva}%`)

  doc.text(f1.trim().slice(0, 70), ML, footerY + 5)
  if (f2) doc.text(f2.slice(0, 60), W / 2, footerY + 5, { align: 'center' })
  doc.text(tvaLabel, W - MR, footerY + 5, { align: 'right' })

  return doc
}

export async function downloadQuotePdf(quote: Quote, profile: Profile): Promise<boolean> {
  const doc = await buildDoc(quote, profile)
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)

  if (isIOS) {
    const blob = doc.output('blob')
    const file = new File([blob], `Devis-${quote.quote_number}.pdf`, { type: 'application/pdf' })
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: `Devis ${quote.quote_number}` })
      } catch (e) {
        if ((e as DOMException).name !== 'AbortError') throw e
      }
    } else {
      window.open(doc.output('bloburl') as string, '_blank')
    }
    return true
  }

  doc.save(`Devis-${quote.quote_number}.pdf`)
  return false
}

export async function getQuotePdfBase64(quote: Quote, profile: Profile): Promise<string> {
  const doc = await buildDoc(quote, profile)
  return doc.output('datauristring').split(',')[1]
}

export async function downloadInvoicePdf(invoice: Invoice, profile: Profile): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const q = invoice.invoice_json
  const W = 210
  const realLines = q.lignes.filter(l => !l.isSection)
  const sousTotal = realLines.reduce((s, l) => s + l.total_ht, 0)

  const tvaByRate: Record<number, number> = {}
  realLines.forEach(l => {
    const rate = l.tva_rate ?? q.taux_tva
    tvaByRate[rate] = parseFloat(((tvaByRate[rate] || 0) + l.total_ht * rate / 100).toFixed(2))
  })
  const totalTva = Object.values(tvaByRate).reduce((s, v) => s + v, 0)
  const ttc = parseFloat((sousTotal + totalTva).toFixed(2))
  const tvaRates = Object.keys(tvaByRate).map(Number).sort((a, b) => a - b)

  // Logo
  let logoLoaded = false
  if (profile.logo_url) {
    const logoUrl = profile.logo_url + (profile.logo_url.includes('?') ? '&' : '?') + 'v=' + Date.now()
    const logoBase64 = await loadImageBase64(logoUrl)
    if (logoBase64) {
      try { doc.addImage(logoBase64, W - MR - 40, 8, 40, 25, undefined, 'FAST'); logoLoaded = true } catch {}
    }
  }

  let y = 14
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.setTextColor(BLUE)
  doc.text(profile.company_name || '', ML, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor('#555555')
  const infoLines = [
    profile.owner_name,
    profile.address,
    [profile.zip_code, profile.city].filter(Boolean).join(' '),
    profile.phone ? `Tél : ${profile.phone}` : '',
    profile.siret ? `SIRET : ${profile.siret}` : '',
  ].filter(Boolean) as string[]
  infoLines.slice(0, logoLoaded ? 5 : 7).forEach(line => { doc.text(line, ML, y); y += 4 })

  // Client
  if (invoice.client_name) {
    const cx = logoLoaded ? W - MR - 45 : W - MR
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor('#1a1a1a')
    doc.text(invoice.client_name, cx, 14, { align: 'right' })
    if (invoice.client_email) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor('#555555')
      doc.text(invoice.client_email, cx, 20, { align: 'right' })
    }
  }

  y = Math.max(y + 3, logoLoaded ? 48 : 44)
  doc.setFillColor(BLUE)
  doc.rect(ML, y, W - ML - MR, 2.5, 'F')
  y += 8

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(BLUE)
  doc.text(`FACTURE N° ${invoice.invoice_number}`, ML, y)
  y += 8

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor('#666666')
  const metaParts = [
    `Date : ${fmtDate(invoice.created_at)}`,
    invoice.due_date ? `Échéance : ${fmtDate(invoice.due_date)}` : '',
  ].filter(Boolean)
  doc.text(metaParts.join('   -   '), ML, y)
  y += 7

  // Status badge
  if (invoice.status === 'paid' && invoice.paid_at) {
    doc.setFillColor(236, 253, 245)
    doc.roundedRect(ML, y - 4, 80, 8, 2, 2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor('#059669')
    doc.text(`Payee le ${fmtDate(invoice.paid_at)}`, ML + 3, y + 0.5)
    y += 11
  } else if (invoice.status === 'overdue') {
    doc.setFillColor(254, 242, 242)
    doc.roundedRect(ML, y - 4, 80, 8, 2, 2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor('#DC2626')
    doc.text(`Echeance depassee`, ML + 3, y + 0.5)
    y += 11
  }

  // Lines table
  const tableBody = realLines.map(l => [
    l.designation,
    String(l.quantite),
    l.unite,
    fmt(l.prix_unitaire_ht),
    fmt(l.total_ht),
    `${l.tva_rate ?? q.taux_tva}%`,
  ])

  autoTable(doc, {
    startY: y,
    head: [['Désignation / Description', 'Qté', 'Unité', 'P.U. HT', 'Total HT', 'TVA']],
    body: tableBody,
    styles: { fontSize: 9, cellPadding: { top: 3.5, bottom: 3.5, left: 4, right: 4 }, lineColor: [235, 235, 235], lineWidth: 0.3 },
    headStyles: { fillColor: [30, 58, 95], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
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

  const totauxBody: string[][] = [['Sous-total HT', fmt(sousTotal)]]
  if (tvaRates.length > 1) {
    tvaRates.forEach(rate => {
      const lbl = rate === 0 ? 'TVA non applicable (art. 293B CGI)' : `TVA ${rate}%`
      totauxBody.push([lbl, rate === 0 ? '-' : fmt(tvaByRate[rate])])
    })
  } else if (q.taux_tva === 0) {
    totauxBody.push(['TVA non applicable (art. 293B CGI)', '-'])
  } else {
    totauxBody.push([`TVA ${q.taux_tva}%`, fmt(totalTva)])
  }

  autoTable(doc, {
    startY: y,
    body: totauxBody,
    styles: { fontSize: 9, cellPadding: { top: 3, bottom: 3, left: 8, right: 8 } },
    columnStyles: { 0: { cellWidth: 55, textColor: [85, 85, 85] }, 1: { cellWidth: 42, halign: 'right', fontStyle: 'bold' } },
    margin: { left: W - MR - 97, right: MR },
    theme: 'plain',
    tableLineColor: [240, 240, 240],
    tableLineWidth: 0.3,
  })

  const ttcY = (doc as any).lastAutoTable.finalY
  doc.setFillColor(30, 58, 95)
  doc.rect(W - MR - 97, ttcY, 97, 12, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(255, 255, 255)
  doc.text('Total TTC', W - MR - 97 + 8, ttcY + 8)
  doc.setTextColor(245, 158, 11)
  doc.setFontSize(13)
  doc.text(fmt(ttc), W - MR - 2, ttcY + 8, { align: 'right' })

  y = ttcY + 22

  // Conditions
  if (q.conditions) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor('#555555')
    const condLines = doc.splitTextToSize(q.conditions, W - ML - MR)
    doc.text(condLines, ML, y)
    y += condLines.length * 4 + 4
  }

  // Footer
  const footerY = 286
  doc.setFillColor(30, 58, 95)
  doc.rect(0, footerY, W, 1, 'F')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor('#777777')
  const f1 = [profile.company_name, profile.address, profile.city].filter(Boolean).join(' - ')
  const f2 = profile.siret ? `SIRET : ${profile.siret}` : ''
  doc.text(f1.slice(0, 70), ML, footerY + 5)
  if (f2) doc.text(f2, W / 2, footerY + 5, { align: 'center' })
  doc.text('Généré avec Devira', W - MR, footerY + 5, { align: 'right' })

  doc.save(`Facture-${invoice.invoice_number}.pdf`)
}
