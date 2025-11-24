/**
 * @fileoverview CONFIGURATION MAÎTRE - PROJET ELS (Global)
 * Version : Robuste (Wrapped in ELS_CONFIG object to prevent ReferenceError)
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
// ELS_CONFIG: OBJET DE CONFIGURATION UNIQUE ET GLOBAL
// ============================================================================
const ELS_CONFIG = {
    // 1. IDENTITÉ ET CONTACTS
    NOM_ENTREPRISE: getConf('NOM_ENTREPRISE', 'EL Services'),
    EMAIL_ENTREPRISE: getConf('EMAIL_ENTREPRISE', 'elservicestoulon@gmail.com'),
    ADMIN_EMAIL: getConf('ADMIN_EMAIL', 'elservicestoulon@gmail.com'),
    ADRESSE_ENTREPRISE: getConf('ADRESSE_ENTREPRISE', '255 Bis Avenue Marcel Castie, 83000 Toulon'),
    SIRET_ENTREPRISE: getConf('SIRET', '480913060'),
    TEL_ENTREPRISE: getConf('TEL_ENTREPRISE', '0650417110'),

    // 2. INFRASTRUCTURE
    ID_FEUILLE_CALCUL: getConf('ID_FEUILLE_CALCUL', '1hRea4xVBO3hoNjqV2tD9mnAENr6UhEJ9of7BlbrJuRygMUHkNmbiX93q'),
    ID_CALENDRIER: getConf('ID_CALENDRIER', 'elservicestoulon@gmail.com'),
    ID_DOSSIER_FACTURES: getConf('ID_DOSSIER_FACTURES', ''),
    ID_DOSSIER_ARCHIVES: getConf('ID_DOSSIER_ARCHIVES', ''),
    ID_DOSSIER_TEMPORAIRE: getConf('ID_DOSSIER_TEMPORAIRE', ''),
    ID_DOCUMENT_CGV: getConf('ID_DOCUMENT_CGV', ''),
    ID_LOGO: getConf('ID_LOGO', ''),

    // 3. PARAMÈTRES MÉTIER
    TVA_DEFAUT: 0.0,
    DELAI_PAIEMENT_DEFAUT: 30,

    // 4. SÉCURITÉ & API
    ELS_SHARED_SECRET: getConf('ELS_SHARED_SECRET', 'SharedSecret_ELS_2024_Secure'),

    // 5. FLAGS DE MAINTENANCE
    BILLING_ID_PDF_CHECK_ENABLED: true
};

// Propriétés dérivées (qui dépendent d'autres clés de l'objet)
ELS_CONFIG.BRANDING_LOGO_PUBLIC_URL = getConf('BRANDING_LOGO_PUBLIC_URL',
    ELS_CONFIG.ID_LOGO ? 'https://drive.google.com/uc?export=view&id=' + ELS_CONFIG.ID_LOGO : ''
);


// ============================================================================
// 6. FONCTIONS UTILITAIRES DE DEBUG & AUDIT
// ============================================================================

function AUDIT_CONFIGURATION() {
  const keysToCheck = {
    'NOM_ENTREPRISE': ELS_CONFIG.NOM_ENTREPRISE,
    'EMAIL_ENTREPRISE': ELS_CONFIG.EMAIL_ENTREPRISE,
    'ID_FEUILLE_CALCUL': ELS_CONFIG.ID_FEUILLE_CALCUL,
    'BRANDING_LOGO_PUBLIC_URL': ELS_CONFIG.BRANDING_LOGO_PUBLIC_URL,
    'BILLING_ID_PDF_CHECK_ENABLED': ELS_CONFIG.BILLING_ID_PDF_CHECK_ENABLED,
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

function getPublicConfig() {
  return {
    NOM_ENTREPRISE: ELS_CONFIG.NOM_ENTREPRISE,
    EMAIL_ENTREPRISE: ELS_CONFIG.EMAIL_ENTREPRISE,
    TEL_ENTREPRISE: ELS_CONFIG.TEL_ENTREPRISE,
    ADRESSE_ENTREPRISE: ELS_CONFIG.ADRESSE_ENTREPRISE,
    SIRET: ELS_CONFIG.SIRET_ENTREPRISE,
    LOGO_ID: ELS_CONFIG.ID_LOGO,
    BRANDING_LOGO_PUBLIC_URL: ELS_CONFIG.BRANDING_LOGO_PUBLIC_URL
  };
}