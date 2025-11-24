/**
 * @fileoverview CONFIGURATION MAÎTRE - PROJET ELS (Global)
 * Version : Corrigée (Intègre BRANDING_LOGO_PUBLIC_URL + Fix ReferenceError)
 */

const _SCRIPT_PROPS = PropertiesService.getScriptProperties();

/**
 * Récupère une config avec fallback pour assurer la rétrocompatibilité.
 * @param {string} key - La clé dans les Propriétés du Script.
 * @param {string} defaultValue - La valeur en dur.
 * @return {string} La valeur à utiliser.
 */
function getConf(key, defaultValue) {
  const val = _SCRIPT_PROPS.getProperty(key);
  if (val && val.trim() !== "") {
    return val;
  }
  return defaultValue; 
}

// ============================================================================
// 1. IDENTITÉ ET CONTACTS
// ============================================================================
const NOM_ENTREPRISE     = getConf('NOM_ENTREPRISE', 'EL Services');
const EMAIL_ENTREPRISE   = getConf('EMAIL_ENTREPRISE', 'elservicestoulon@gmail.com');
const ADMIN_EMAIL        = getConf('ADMIN_EMAIL', 'elservicestoulon@gmail.com');
const ADRESSE_ENTREPRISE = getConf('ADRESSE_ENTREPRISE', '255 Bis Avenue Marcel Castie, 83000 Toulon');
const SIRET_ENTREPRISE   = getConf('SIRET', '480913060');
const TEL_ENTREPRISE     = getConf('TEL_ENTREPRISE', '0650417110');

// ============================================================================
// 2. INFRASTRUCTURE GOOGLE DRIVE & SHEETS (IDs Critiques)
// ============================================================================

// ID de la Spreadsheet Principale
const ID_FEUILLE_CALCUL = getConf('ID_FEUILLE_CALCUL', '1hRea4xVBO3hoNjqV2tD9mnAENr6UhEJ9of7BlbrJuRygMUHkNmbiX93q'); 

// ID du Calendrier Google
const ID_CALENDRIER = getConf('ID_CALENDRIER', 'elservicestoulon@gmail.com'); 

// Dossiers de stockage
const ID_DOSSIER_FACTURES   = getConf('ID_DOSSIER_FACTURES', '');   
const ID_DOSSIER_ARCHIVES   = getConf('ID_DOSSIER_ARCHIVES', '');
const ID_DOSSIER_TEMPORAIRE = getConf('ID_DOSSIER_TEMPORAIRE', '');

// Documents Modèles & Assets
const ID_DOCUMENT_CGV = getConf('ID_DOCUMENT_CGV', '');
const ID_LOGO         = getConf('ID_LOGO', ''); 

// URL Publique du Logo (Pour affichage dans les emails/HTML)
// Construit une URL Drive si ID_LOGO est présent, sinon vide.
const BRANDING_LOGO_PUBLIC_URL = getConf('BRANDING_LOGO_PUBLIC_URL', 
  ID_LOGO ? 'https://drive.google.com/uc?export=view&id=' + ID_LOGO : ''
);

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
// 5. FLAGS DE MAINTENANCE & FEATURES
// ============================================================================

// Active la vérification de l'existence du PDF avant de tenter une action de facturation.
const BILLING_ID_PDF_CHECK_ENABLED = true; 

// ============================================================================
// 6. FONCTIONS UTILITAIRES DE DEBUG & AUDIT
// ============================================================================

function AUDIT_CONFIGURATION() {
  const keysToCheck = {
    'NOM_ENTREPRISE': NOM_ENTREPRISE,
    'EMAIL_ENTREPRISE': EMAIL_ENTREPRISE,
    'ID_FEUILLE_CALCUL': ID_FEUILLE_CALCUL,
    'BRANDING_LOGO_PUBLIC_URL': BRANDING_LOGO_PUBLIC_URL,
    'BILLING_ID_PDF_CHECK_ENABLED': BILLING_ID_PDF_CHECK_ENABLED,
    'PublicConfig': 'OK'
  };

  console.log("=== AUDIT DE CONFIGURATION ===");
  for (let [k, v] of Object.entries(keysToCheck)) {
    console.log(`${k} : ${v}`);
  }
  console.log("==============================");
}

// ============================================================================
// 7. API PUBLIQUE (FRONTEND) - INDISPENSABLE POUR L'UI
// ============================================================================

/**
 * Expose les données de configuration NON-SENSIBLES au frontend (HTML/JS).
 * Appelé par google.script.run au chargement de la page.
 */
function getPublicConfig() {
  return {
    NOM_ENTREPRISE: NOM_ENTREPRISE,
    EMAIL_ENTREPRISE: EMAIL_ENTREPRISE,
    TEL_ENTREPRISE: TEL_ENTREPRISE,
    ADRESSE_ENTREPRISE: ADRESSE_ENTREPRISE,
    SIRET: SIRET_ENTREPRISE,
    LOGO_ID: ID_LOGO,
    BRANDING_LOGO_PUBLIC_URL: BRANDING_LOGO_PUBLIC_URL
  };
}
