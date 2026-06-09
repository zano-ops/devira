import { supabase } from './supabase'

export interface CatalogueItem {
  id: string
  designation: string
  unite: string
  prix_unitaire_ht: number
  categorie: string
}

export async function getCatalogue(): Promise<CatalogueItem[]> {
  const { data, error } = await supabase
    .from('catalogue_items')
    .select('id, designation, unite, prix_unitaire_ht, categorie')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('getCatalogue error:', error)
    return []
  }
  return data ?? []
}
