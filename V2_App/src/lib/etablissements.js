import { supabase } from './supabaseClient'

/**
 * Etablissements (PDL) Autocomplete API
 * Searches the etablissements table for matching names/addresses
 */

/**
 * Search establishments by query (name, address, city)
 * @param {string} query - Search term (min 2 chars)
 * @param {number} limit - Max results (default 10)
 * @returns {Promise<Array>} Matching establishments
 */
export async function searchEtablissements(query, limit = 10) {
    if (!query || query.length < 2) return []

    const searchTerm = query.trim().toLowerCase()

    const { data, error } = await supabase
        .from('etablissements')
        .select('id, type, nom, adresse, code_postal, ville')
        .or(`nom.ilike.%${searchTerm}%,adresse.ilike.%${searchTerm}%,ville.ilike.%${searchTerm}%`)
        .eq('is_active', true)
        .limit(limit)

    if (error) {
        console.error('Error searching etablissements:', error)
        return []
    }

    return data?.map(e => ({
        id: e.id,
        label: e.nom,
        type: e.type,
        adresse: e.adresse,
        codePostal: e.code_postal,
        ville: e.ville,
        fullAddress: `${e.adresse || ''}, ${e.code_postal || ''} ${e.ville || ''}`.trim().replace(/^,\s*/, '')
    })) || []
}

/**
 * Get establishment by ID
 * @param {string} id - Establishment UUID
 * @returns {Promise<Object|null>}
 */
export async function getEtablissementById(id) {
    if (!id) return null

    const { data, error } = await supabase
        .from('etablissements')
        .select('*')
        .eq('id', id)
        .single()

    if (error) {
        console.error('Error fetching etablissement:', error)
        return null
    }

    return data
}
