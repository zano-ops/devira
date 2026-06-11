export interface Profile {
  id: string
  company_name: string
  owner_name: string
  email: string
  address: string
  city: string
  zip_code: string
  phone: string
  siret: string
  logo_url: string
  vat_rate: number
  quote_validity_days: number
  payment_conditions: string
  // Mentions légales BTP
  assurance_decennale?: string
  tva_intra?: string
  is_micro_entrepreneur?: boolean
  // Relances auto
  relance_enabled?: boolean
  relance_days?: number[]
  // Validation interne
  validation_threshold?: number
  created_at: string
}

export interface QuoteLine {
  designation: string
  unite: string
  quantite: number
  prix_unitaire_ht: number
  total_ht: number
  tva_rate?: number  // TVA par ligne (hérite de taux_tva si absent)
  isSection?: boolean  // en-tête de lot/section (pas de prix)
}

export interface QuoteJson {
  titre: string
  client: { nom: string | null; adresse: string | null; email: string | null; phone?: string | null }
  duree_estimee: string
  lignes: QuoteLine[]
  sous_total_ht: number
  taux_tva: number
  montant_tva: number
  total_ttc: number
  validite_jours: number
  notes: string | null
  conditions: string
  discount_percent?: number
  // Signature électronique
  signature?: {
    signed_by: string
    signed_at: string
  }
  // Photos de chantier
  photos?: string[]
  // Historique des modifications
  history?: Array<{ at: string; summary: string }>
}

export interface Quote {
  id: string
  user_id: string
  quote_number: string
  status: 'draft' | 'sent' | 'accepted' | 'refused' | 'pending_approval' | 'cancelled'
  description_raw: string
  client_name: string
  client_email: string
  client_address: string
  quote_json: QuoteJson
  pdf_url: string
  total_ht: number
  total_ttc: number
  discount_percent: number
  sent_at: string | null
  created_at: string
  // Avenants
  parent_quote_id?: string | null
  avenant_number?: number | null
  parent_quote_number?: string | null
  // Relances
  relance_count?: number
  last_relance_at?: string | null
}

export interface Client {
  id: string
  user_id: string
  name: string
  email: string
  address: string
  city: string
  zip_code: string
  phone: string
  notes: string
  created_at: string
}

export interface Invoice {
  id: string
  user_id: string
  quote_id: string | null
  invoice_number: string
  status: 'pending' | 'paid' | 'overdue'
  client_name: string
  client_email: string
  invoice_json: QuoteJson
  total_ht: number
  total_ttc: number
  due_date: string | null
  paid_at: string | null
  sent_at: string | null
  created_at: string
}
