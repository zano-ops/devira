import type { Quote, Profile } from '../types'

function fmt(n: number) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function addDays(s: string, d: number) {
  const dt = new Date(s); dt.setDate(dt.getDate() + d); return fmtDate(dt.toISOString())
}

interface Props { quote: Quote; profile: Profile }

export function QuotePreview({ quote, profile }: Props) {
  const q = quote.quote_json
  const discount = quote.discount_percent || 0

  // Skip section headers for all calculations
  const realLines = q.lignes.filter(l => !l.isSection)
  const sousTotal = realLines.reduce((s, l) => s + l.quantite * l.prix_unitaire_ht, 0)
  const remise = discount > 0 ? sousTotal * discount / 100 : 0

  // Per-line TVA calculation
  const tvaByRate: Record<number, number> = {}
  realLines.forEach(l => {
    const rate = l.tva_rate ?? q.taux_tva
    const lineBase = (l.quantite * l.prix_unitaire_ht) * (1 - discount / 100)
    tvaByRate[rate] = parseFloat(((tvaByRate[rate] || 0) + lineBase * rate / 100).toFixed(2))
  })
  const totalTva = Object.values(tvaByRate).reduce((s, v) => s + v, 0)
  const ttc = sousTotal - remise + totalTva
  const validite = q.validite_jours || 30
  const acompte = ttc * 0.3
  const tvaRates = Object.keys(tvaByRate).map(Number).sort((a, b) => a - b)

  return (
    <div id="quote-preview" style={{
      fontFamily: "Arial, sans-serif", fontSize: '11.5px', color: '#1a1a1a',
      background: '#fff', padding: '32px 36px', lineHeight: '1.55', maxWidth: '794px'
    }}>

      {/* ===== EN-TÊTE ===== */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div style={{ flex: 1 }}>
          {profile.logo_url ? (
            <img src={profile.logo_url} alt="Logo" style={{ maxHeight: '64px', maxWidth: '180px', objectFit: 'contain', marginBottom: '10px', display: 'block' }} />
          ) : (
            <div style={{ width: '56px', height: '56px', borderRadius: '12px', background: '#1E3A5F', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
              <span style={{ color: '#fff', fontWeight: '800', fontSize: '20px' }}>{(profile.company_name || 'A')[0]}</span>
            </div>
          )}
          <div style={{ fontWeight: '800', fontSize: '15px', color: '#1E3A5F' }}>{profile.company_name || 'Votre Entreprise'}</div>
          <div style={{ color: '#555', fontSize: '11px', marginTop: '1px' }}>{profile.owner_name}</div>
          {profile.address && <div style={{ color: '#666', fontSize: '11px', marginTop: '1px' }}>{profile.address}</div>}
          {profile.city && <div style={{ color: '#666', fontSize: '11px' }}>{profile.zip_code} {profile.city}</div>}
          {profile.phone && <div style={{ color: '#666', fontSize: '11px' }}>Tél : {profile.phone}</div>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '30px', fontWeight: '900', color: '#1E3A5F', letterSpacing: '-1px', lineHeight: '1' }}>DEVIS</div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#F59E0B', marginTop: '2px' }}>N° {quote.quote_number}</div>
        </div>
      </div>

      <div style={{ height: '3px', background: 'linear-gradient(90deg, #1E3A5F 0%, #2D5282 60%, #F59E0B 100%)', borderRadius: '2px', marginBottom: '18px' }} />

      {/* ===== INFOS + CLIENT ===== */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <div style={{ flex: 1.2, fontSize: '11px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {[
                ['Date du devis :', fmtDate(quote.created_at)],
                ['Référence :', quote.quote_number],
                ['Date de validité :', addDays(quote.created_at, validite)],
                ['Émis par :', profile.owner_name || profile.company_name],
                ['Durée travaux :', q.duree_estimee],
              ].map(([label, val]) => (
                <tr key={label}>
                  <td style={{ padding: '3px 0', color: '#888', whiteSpace: 'nowrap', paddingRight: '10px', fontWeight: '500' }}>{label}</td>
                  <td style={{ padding: '3px 0', color: '#1a1a1a', fontWeight: '600' }}>{val}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Destinataire */}
        <div style={{ flex: 1, border: '1.5px solid #e5e7eb', borderRadius: '8px', padding: '12px 14px', background: '#f9fafb' }}>
          <div style={{ fontWeight: '700', fontSize: '9.5px', textTransform: 'uppercase', letterSpacing: '1px', color: '#1E3A5F', marginBottom: '7px' }}>Destinataire</div>
          <div style={{ fontWeight: '700', fontSize: '12px', color: '#1a1a1a' }}>{q.client?.nom || '—'}</div>
          {q.client?.adresse && (
            <div style={{ color: '#555', fontSize: '11px', marginTop: '3px', lineHeight: '1.4' }}>{q.client.adresse}</div>
          )}
          {q.client?.email && (
            <div style={{ color: '#666', fontSize: '11px', marginTop: '3px' }}>✉ {q.client.email}</div>
          )}
          {q.client?.phone && (
            <div style={{ color: '#666', fontSize: '11px', marginTop: '3px' }}>📞 {q.client.phone}</div>
          )}
        </div>
      </div>

      {/* ===== OBJET ===== */}
      <div style={{ background: '#f0f4f8', borderLeft: '3px solid #1E3A5F', borderRadius: '0 6px 6px 0', padding: '8px 12px', marginBottom: '18px', fontSize: '11.5px' }}>
        <span style={{ color: '#888', fontWeight: '600' }}>Objet : </span>
        <span style={{ color: '#1a1a1a', fontWeight: '700' }}>{q.titre}</span>
      </div>

      {/* ===== TABLEAU DES PRESTATIONS ===== */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px', fontSize: '10.5px' }}>
        <thead>
          <tr style={{ background: '#1E3A5F' }}>
            {[
              { label: 'Description / Désignation', align: 'left', w: 'auto' },
              { label: 'Qté', align: 'center', w: '40px' },
              { label: 'Unité', align: 'center', w: '44px' },
              { label: 'P.U. HT', align: 'right', w: '72px' },
              { label: '% TVA', align: 'center', w: '48px' },
              { label: 'Total TVA', align: 'right', w: '72px' },
              { label: 'Total TTC', align: 'right', w: '80px' },
            ].map(col => (
              <th key={col.label} style={{
                padding: '9px 7px', textAlign: col.align as any,
                fontWeight: '700', color: '#fff', fontSize: '9.5px',
                textTransform: 'uppercase', letterSpacing: '0.4px', width: col.w
              }}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {q.lignes.map((l, i) => {
            if (l.isSection) {
              return (
                <tr key={i} style={{ background: '#EFF6FF' }}>
                  <td colSpan={7} style={{ padding: '7px 9px', color: '#1E3A5F', fontWeight: '700', fontSize: '10px', borderBottom: '1px solid #DBEAFE', letterSpacing: '0.3px' }}>
                    ◆ {l.designation.toUpperCase()}
                  </td>
                </tr>
              )
            }
            const totalHT = l.quantite * l.prix_unitaire_ht
            const lineTva = l.tva_rate ?? q.taux_tva
            const tvaLigne = totalHT * lineTva / 100
            const ttcLigne = totalHT + tvaLigne
            return (
              <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb' }}>
                <td style={{ padding: '8px 7px', borderBottom: '1px solid #f0f0f0', color: '#1a1a1a' }}>{l.designation}</td>
                <td style={{ padding: '8px 7px', textAlign: 'center', borderBottom: '1px solid #f0f0f0', color: '#444' }}>{l.quantite}</td>
                <td style={{ padding: '8px 7px', textAlign: 'center', borderBottom: '1px solid #f0f0f0', color: '#444' }}>{l.unite}</td>
                <td style={{ padding: '8px 7px', textAlign: 'right', borderBottom: '1px solid #f0f0f0', color: '#444' }}>{fmt(l.prix_unitaire_ht)}</td>
                <td style={{ padding: '8px 7px', textAlign: 'center', borderBottom: '1px solid #f0f0f0', color: '#555' }}>{lineTva}%</td>
                <td style={{ padding: '8px 7px', textAlign: 'right', borderBottom: '1px solid #f0f0f0', color: '#555' }}>{fmt(tvaLigne)}</td>
                <td style={{ padding: '8px 7px', textAlign: 'right', borderBottom: '1px solid #f0f0f0', fontWeight: '700', color: '#1E3A5F' }}>{fmt(ttcLigne)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* ===== TOTAUX ===== */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', gap: '16px' }}>
        <div style={{ flex: 1 }}>
          {q.notes && (
            <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '6px', padding: '10px 12px', fontSize: '10.5px', color: '#92400e' }}>
              <strong>ℹ️ Note :</strong> {q.notes}
            </div>
          )}
        </div>
        <div style={{ minWidth: '240px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <tbody>
              <tr>
                <td style={{ padding: '5px 10px', color: '#666', borderBottom: '1px solid #f0f0f0' }}>Total HT</td>
                <td style={{ padding: '5px 10px', textAlign: 'right', fontWeight: '600', borderBottom: '1px solid #f0f0f0' }}>{fmt(sousTotal)}</td>
              </tr>
              {discount > 0 && (
                <tr>
                  <td style={{ padding: '5px 10px', color: '#10B981', borderBottom: '1px solid #f0f0f0' }}>Remise ({discount}%)</td>
                  <td style={{ padding: '5px 10px', textAlign: 'right', color: '#10B981', fontWeight: '600', borderBottom: '1px solid #f0f0f0' }}>- {fmt(remise)}</td>
                </tr>
              )}
              {tvaRates.length > 1 ? (
                tvaRates.map(rate => (
                  <tr key={rate}>
                    <td style={{ padding: '5px 10px', color: '#666', borderBottom: '1px solid #f0f0f0' }}>TVA {rate}%</td>
                    <td style={{ padding: '5px 10px', textAlign: 'right', fontWeight: '600', borderBottom: '1px solid #f0f0f0' }}>{fmt(tvaByRate[rate])}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td style={{ padding: '5px 10px', color: '#666', borderBottom: '1px solid #f0f0f0' }}>Total TVA ({q.taux_tva}%)</td>
                  <td style={{ padding: '5px 10px', textAlign: 'right', fontWeight: '600', borderBottom: '1px solid #f0f0f0' }}>{fmt(totalTva)}</td>
                </tr>
              )}
              <tr style={{ background: '#1E3A5F' }}>
                <td style={{ padding: '10px 10px', color: '#fff', fontWeight: '800', fontSize: '13px', borderRadius: '4px 0 0 4px' }}>TOTAL TTC</td>
                <td style={{ padding: '10px 10px', textAlign: 'right', color: '#F59E0B', fontWeight: '900', fontSize: '15px', borderRadius: '0 4px 4px 0' }}>{fmt(ttc)}</td>
              </tr>
              <tr>
                <td colSpan={2} style={{ padding: '5px 10px', color: '#888', fontSize: '10px', textAlign: 'right' }}>
                  Acompte 30% à la commande : <strong>{fmt(acompte)}</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== CONDITIONS + SIGNATURE ===== */}
      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '14px', marginBottom: '18px' }}>
        <div style={{ fontWeight: '700', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#1E3A5F', marginBottom: '5px' }}>Conditions de paiement</div>
        <div style={{ fontSize: '10.5px', color: '#555', lineHeight: '1.5' }}>{q.conditions || profile.payment_conditions || 'Acompte 30% à la commande, solde à réception des travaux.'}</div>
        <div style={{ fontSize: '9px', color: '#999', marginTop: '6px', fontStyle: 'italic', lineHeight: '1.4' }}>
          Conformément à l'article L. 221-18 du Code de la consommation, le client bénéficie d'un délai de rétractation de 14 jours à compter de la date de signature du présent devis.
        </div>
      </div>

      {/* Signature */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', gap: '20px' }}>
        <div style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px 14px' }}>
          <div style={{ fontSize: '10px', color: '#888', marginBottom: '4px', fontWeight: '600' }}>CLIENT — Bon pour accord</div>
          <div style={{ fontSize: '9.5px', color: '#aaa', marginBottom: '32px' }}>Précédé de la mention « Bon pour accord »</div>
          <div style={{ borderTop: '1px solid #ccc', paddingTop: '4px', textAlign: 'center' }}>
            <span style={{ fontSize: '9.5px', color: '#aaa' }}>Date et signature client</span>
          </div>
        </div>
        <div style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px 14px', background: '#f9fafb' }}>
          <div style={{ fontSize: '10px', color: '#888', marginBottom: '4px', fontWeight: '600' }}>PRESTATAIRE — Cachet et signature</div>
          <div style={{ fontSize: '9.5px', color: '#1E3A5F', fontWeight: '700', marginBottom: '32px' }}>{profile.company_name}</div>
          <div style={{ borderTop: '1px solid #ccc', paddingTop: '4px', textAlign: 'center' }}>
            <span style={{ fontSize: '9.5px', color: '#aaa' }}>Cachet / Signature artisan</span>
          </div>
        </div>
      </div>

      {/* ===== PIED DE PAGE ===== */}
      <div style={{ borderTop: '2px solid #1E3A5F', paddingTop: '10px', display: 'flex', gap: '16px', fontSize: '9.5px', color: '#666' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: '700', color: '#1E3A5F', marginBottom: '3px', textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.5px' }}>Siège social</div>
          <div>{profile.company_name}</div>
          {profile.address && <div>{profile.address}</div>}
          {profile.city && <div>{profile.zip_code} {profile.city}</div>}
          {profile.siret && <div>SIRET : {profile.siret}</div>}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: '700', color: '#1E3A5F', marginBottom: '3px', textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.5px' }}>Contact</div>
          <div>{profile.owner_name}</div>
          {profile.phone && <div>Tél : {profile.phone}</div>}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: '700', color: '#1E3A5F', marginBottom: '3px', textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.5px' }}>Mentions légales</div>
          {tvaRates.length > 1 ? tvaRates.map(r => <div key={r}>TVA {r}%</div>) : <div>TVA : {q.taux_tva}%</div>}
          <div>Devis valable {validite} jours</div>
          <div>Généré avec DevisPro BTP</div>
        </div>
      </div>

    </div>
  )
}
