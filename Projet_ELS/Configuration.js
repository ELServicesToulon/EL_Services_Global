/**
 * @fileoverview CONFIGURATION MAÎTRE - PROJET ELS (Global)
 * Fusionne l'ancienne méthode (variables en dur) et la nouvelle (ScriptProperties).
 * * PRINCIPE : 
 * 1. On tente de lire dans PropertiesService (Sécurisé).
 * 2. Si vide, on prend la valeur par défaut (Hardcoded - Compatibilité v113).
 */

const _SCRIPT_PROPS = PropertiesService.getScriptProperties();

/**
 * Récupère une config avec fallback pour assurer la rétrocompatibilité.
 * @param {string} key - La clé dans les Propriétés du Script.
 * @param {string} defaultValue - La valeur en dur (copiée de l'ancien fichier).
 * @return {string} La valeur à utiliser.
 */
function getConf(key, defaultValue) {
  const val = _SCRIPT_PROPS.getProperty(key);
  if (val && val.trim() !== "") {
    return val;
  }
  // Si pas de propriété définie, on utilise la valeur par défaut pour ne pas casser la prod
  return defaultValue; 
}

// ============================================================================
// 1. IDENTITÉ ET CONTACTS
// ============================================================================
const EMAIL_ENTREPRISE   = getConf('EMAIL_ENTREPRISE', 'elservicestoulon@gmail.com');
const ADMIN_EMAIL        = getConf('ADMIN_EMAIL', 'elservicestoulon@gmail.com');
const ADRESSE_ENTREPRISE = getConf('ADRESSE_ENTREPRISE', '255 Bis Avenue Marcel Castie, 83000 Toulon');
const SIRET_ENTREPRISE   = getConf('SIRET', '480913060');
const TEL_ENTREPRISE     = getConf('TEL_ENTREPRISE', '0650417110'); // Ajouté par sécurité

// ============================================================================
// 2. INFRASTRUCTURE GOOGLE DRIVE & SHEETS (IDs Critiques)
// ============================================================================

// ID de la Spreadsheet Principale (Cœur du système)
// Note : Si vide ici, le script risque d'échouer. Assurez-vous que l'ID est correct.
const ID_FEUILLE_CALCUL = getConf('ID_FEUILLE_CALCUL', '1hRea4xVBO3hoNjqV2tD9mnAENr6UhEJ9of7BlbrJuRygMUHkNmbiX93q'); 

// ID du Calendrier Google
const ID_CALENDRIER = getConf('ID_CALENDRIER', 'elservicestoulon@gmail.com'); 

// Dossiers de stockage
const ID_DOSSIER_FACTURES   = getConf('ID_DOSSIER_FACTURES', '');   // Insérer ID si connu, sinon laisser vide (le code devra gérer)
const ID_DOSSIER_ARCHIVES   = getConf('ID_DOSSIER_ARCHIVES', '');
const ID_DOSSIER_TEMPORAIRE = getConf('ID_DOSSIER_TEMPORAIRE', '');

// Documents Modèles & Assets
const ID_DOCUMENT_CGV = getConf('ID_DOCUMENT_CGV', '');
const ID_LOGO         = getConf('ID_LOGO', ''); // ID de l'image du logo sur Drive

// ============================================================================
// 3. PARAMÈTRES MÉTIER
// ============================================================================
const TVA_DEFAUT = 0.0; // Franchise en base
const DELAI_PAIEMENT_DEFAUT = 30; // Jours

// ============================================================================
// 4. SÉCURITÉ & API
// ============================================================================
const ELS_SHARED_SECRET = getConf('ELS_SHARED_SECRET', 'SharedSecret_ELS_2024_Secure'); 

// ============================================================================
// 5. FONCTIONS UTILITAIRES DE DEBUG
// ============================================================================

/**
 * Lancez cette fonction manuellement pour voir quelles valeurs sont utilisées.
 * Utile pour vérifier si le script utilise le code en dur ou les ScriptProperties.
 */
function AUDIT_CONFIGURATION() {
  const keysToCheck = {
    'EMAIL_ENTREPRISE': EMAIL_ENTREPRISE,
    'ID_FEUILLE_CALCUL': ID_FEUILLE_CALCUL,
    'ID_CALENDRIER': ID_CALENDRIER,
    'SIRET': SIRET_ENTREPRISE
  };

  console.log("=== AUDIT DE CONFIGURATION ===");
  for (let [k, v] of Object.entries(keysToCheck)) {
    const source = _SCRIPT_PROPS.getProperty(k) ? "[SCRIPT_PROPERTY]" : "[HARDCODED/DEFAUT]";
    console.log(`${k} : ${v} (${source})`);
  }
  console.log("==============================");
}