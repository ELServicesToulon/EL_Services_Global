/**
 * Synchronise les données de Google Sheets vers Supabase.
 * À déclencher via un trigger onEdit ou temporel (toutes les heures).
 */
function syncToSupabase() {
    const config = getConfig(); // Utilise la fonction existante dans ELS_Backend.js
    const SUPABASE_URL = config.SUPABASE_URL || 'https://votre-projet.supabase.co';
    const SUPABASE_KEY = config.SUPABASE_SERVICE_KEY; // Clé 'service_role' pour écrire sans RLS restrictive

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        Logger.log("Erreur : Configuration Supabase manquante (SUPABASE_URL ou SUPABASE_SERVICE_KEY).");
        return;
    }

    // 1. Lecture des données Source (Adapté pour lire 'Facturation' qui sert de source actuelle)
    // Si vous avez créé des onglets dédiés "Tournees" et "Stops", modifiez 'Facturation' ci-dessous.
    const data = getSheetData("Facturation");
    if (!data || data.length < 2) return;

    const headers = data[0].map(h => String(h).toLowerCase().trim());
    const rows = data.slice(1);

    // Mapping des colonnes (à adapter selon votre Sheet réel)
    const COL_ID = headers.indexOf("id réservation");
    const COL_DATE = headers.indexOf("date");
    const COL_CLIENT = headers.indexOf("client (raison s. client)");
    const COL_ADRESSE = headers.findIndex(h => h.includes("adresse") || h.includes("détails"));
    const COL_CHAUFFEUR = headers.indexOf("chauffeur"); // Ou email chauffeur
    const COL_STATUT = headers.indexOf("statut");

    if (COL_ID === -1 || COL_DATE === -1) {
        Logger.log("Colonnes requises introuvables dans la feuille.");
        return;
    }

    const tourneesUpsert = {};
    const stopsUpsert = [];

    // 2. Transformation des données
    rows.forEach((row, index) => {
        const idRes = row[COL_ID];
        if (!idRes) return;

        // Création/Récupération de l'ID Tournée
        // Simplification : Une tournée = Un ID Réservation (ou grouper par Date + Chauffeur)
        // Ici on suppose 1 Ligne = 1 Stop principal, et on groupe par Jour+Chauffeur si possible.
        // Pour cet exemple, on va créer une "Tournée" par jour et par chauffeur.

        const dateVal = row[COL_DATE];
        let dateStr = "";
        if (dateVal instanceof Date) {
            dateStr = dateVal.toISOString().split('T')[0];
        } else {
            dateStr = "2023-01-01"; // Fallback
        }

        const chauffeur = row[COL_CHAUFFEUR] || "Non assigné";
        const tourneeKey = `${dateStr}_${chauffeur}`.replace(/\s/g, '');

        // Construire l'objet Tournée si pas encore vu
        if (!tourneesUpsert[tourneeKey]) {
            tourneesUpsert[tourneeKey] = {
                id: tourneeKey, // UUID recommandé en prod, ici string composit
                date: dateStr,
                chauffeur_id: null, // À mapper avec la table profiles via email si possible
                chauffeur_name: chauffeur, // Champ temp pour debug
                status: 'PLANIFIEE',
                created_at: new Date().toISOString()
            };
        }

        // Construire l'objet Stop
        stopsUpsert.push({
            id: "STOP-" + idRes,
            tournee_id: tourneeKey,
            client_nom: row[COL_CLIENT] || "Client Inconnu",
            address_full: row[COL_ADRESSE] || "Adresse non spécifiée",
            sequence_order: index + 1, // Ordre naturel du tableau
            status: mapStatusToSupabase(row[COL_STATUT]),
            gps_lat: null, // À enrichir via Geocoding API si dispo
            gps_lng: null
        });
    });

    // 3. Envoi vers Supabase (Batch Upsert)

    // a. Upsert Tournées
    const tourneesList = Object.values(tourneesUpsert);
    if (tourneesList.length > 0) {
        postToSupabase(SUPABASE_URL, SUPABASE_KEY, 'tournees', tourneesList);
    }

    // b. Upsert Stops
    if (stopsUpsert.length > 0) {
        postToSupabase(SUPABASE_URL, SUPABASE_KEY, 'stops', stopsUpsert);
    }
}

function postToSupabase(url, key, table, payload) {
    const endpoint = `${url}/rest/v1/${table}`;

    const options = {
        method: 'post',
        headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates' // IMPORTANT: Upsert
        },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
    };

    try {
        const response = UrlFetchApp.fetch(endpoint, options);
        const code = response.getResponseCode();
        if (code >= 400) {
            Logger.log(`Erreur Supabase (${table}): ${response.getContentText()}`);
        } else {
            Logger.log(`Succès sync (${table}): ${payload.length} items`);
        }
    } catch (e) {
        Logger.log(`Exception lors du fetch (${table}): ${e.toString()}`);
    }
}

function mapStatusToSupabase(sheetStatus) {
    const s = String(sheetStatus).toLowerCase();
    if (s.includes('livré')) return 'LIVRE';
    if (s.includes('absent')) return 'ECHEC_ABSENT';
    if (s.includes('report')) return 'ECHEC_AUTRE';
    return 'A_LIVRER';
}

/**
 * Trigger simple à installer manuellement ou via script.
 */
function onEditTrigger(e) {
    // Optionnel : ne synchroniser que si les colonnes critiques changent
    // Pour l'instant, on lance la sync complète (attention aux quotas UrlFetchApp)
    syncToSupabase();
}
