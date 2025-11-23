/**
 * CONFIGURATION GLOBALE - EL SERVICES (PROJET ELS)
 * Fusion de l'ancienne logique métier et de la nouvelle structure technique.
 */

// =================================================================
// 1. CONSTANTES & PARAMÈTRES MÉTIER (LEGACY & CORE)
// =================================================================

// --- Identité Entreprise ---
const NOM_ENTREPRISE = "EL Services Littoral";
const ADRESSE_ENTREPRISE = "255 Bis Avenue Marcel Castie, 83000 Toulon";
const EMAIL_ENTREPRISE = "elservicestoulon@gmail.com";
const ADMIN_EMAIL = "elservicestoulon@gmail.com";
const SIREN = "480 913 060";
const RIB_IBAN = "FR76 4061 8804 7600 0403 5757 187";

// --- IDs GOOGLE (Hardcodés pour centralisation) ---
// Plus besoin de getSecret(), on centralise tout ici.
const IDS = {
  DB_SPREADSHEET: "1AzWdQQ4UEq0Fvr_iTpDY5TiXn55ij30_okIxIG5p_OM", // ID Vérifié
  CALENDAR: "elservicestoulon@gmail.com",
  FOLDER_ARCHIVES: "1UavaEsq6TkDw1QzJZ91geKyF7hrQY4S8",  // ID Dossier Factures
  FOLDER_INVOICES: "1UavaEsq6TkDw1QzJZ91geKyF7hrQY4S8",  // ID Dossier Factures
  TEMPLATE_INVOICE: "1dceBMePjZhpSALkt2_wVxRM-2DtK9LGjEXS0qMqnZRo", // ID Modèle
  LOGO_FILE: "1vbZ9kTYPso7KC4WGINEvVbJwHLCV7BfD" // Ton ID Logo original
};

// --- URLs ---
const BRANDING_LOGO_PUBLIC_URL = 'https://drive.google.com/uc?export=view&id=' + IDS.LOGO_FILE;
// URL WebApp (À mettre à jour après déploiement si nécessaire)
const CLIENT_PORTAL_BASE_URL = ''; 
const LIVRAISON_WEBAPP_URL = '';

// --- Paramètres Généraux ---
const TVA_APPLICABLE = false;
const TAUX_TVA = 0.20;
const DELAI_PAIEMENT_JOURS = 5;

// --- Horaires & Logistique ---
const HEURE_DEBUT_SERVICE = "08:30";
const HEURE_FIN_SERVICE = "18:30";
const DUREE_BASE = 30; // Minutes
const KM_BASE = 9;
const KM_ARRET_SUP = 3;
const URGENT_THRESHOLD_MINUTES = 30;

// --- Noms des Feuilles (Sheets) ---
const SHEETS = {
  FACTURATION: 'Facturation',
  CLIENTS: 'Clients',
  CODES_POSTAUX: 'Codes_Postaux_Retrait',
  PARAMETRES: 'Paramètres',
  LOGS: 'Logs',
  RESERVATIONS: 'Réservations'
};

// =================================================================
// 2. LOGIQUE TARIFAIRE AVANCÉE (Gardée intacte)
// =================================================================

const TARIFS = {
  'Normal': { base: 15, arrets: [5, 4, 3, 4, 5] },
  'Samedi': { base: 25, arrets: [5, 4, 3, 4, 5] },
  'Urgent': { base: 20, arrets: [5, 4, 3, 4, 5] },
  'Special': { base: 30, arrets: [5, 4, 3, 4, 5] }
};

/**
 * Génère les règles de prix V2 (Logique conservée)
 */
function buildPricingRulesV2FromTarifs_() {
  var tarifs = TARIFS || {};
  var normal = tarifs.Normal || { base: 0, arrets: [] };
  var supplements = Array.isArray(normal.arrets) ? normal.arrets.slice() : [];
  var lastSupp = supplements.length ? Number(supplements[supplements.length - 1]) : 0;
  
  var buildStopTotals = function(base) {
    base = Number(base) || 0;
    var totals = [base];
    var acc = base;
    for (var i = 0; i < supplements.length; i++) {
      var inc = Number(supplements[i]) || lastSupp;
      acc += inc;
      totals.push(acc);
    }
    return totals;
  };

  var stopTotalsNormal = buildStopTotals(normal.base);
  var extraInc = lastSupp;
  var returnFee = (supplements.length ? Number(supplements[0]) : lastSupp) || 0;

  var deriveFromNormal = function(typeBase) {
    typeBase = Number(typeBase) || 0;
    var delta = typeBase - (Number(normal.base) || 0);
    var totals = stopTotalsNormal.map(function(v){ return Number(v) + delta; });
    return Object.freeze({ stopTotals: Object.freeze(totals), extraStopIncrement: extraInc, returnSurcharge: returnFee });
  };

  return Object.freeze({
    Normal: deriveFromNormal(normal.base),
    Samedi: deriveFromNormal(tarifs.Samedi ? tarifs.Samedi.base : normal.base),
    Urgent: deriveFromNormal(tarifs.Urgent ? tarifs.Urgent.base : normal.base),
    Special: deriveFromNormal(tarifs.Special ? tarifs.Special.base : normal.base)
  });
}

const PRICING_RULES_V2 = buildPricingRulesV2FromTarifs_();

const FORFAIT_RESIDENT = Object.freeze({
  STANDARD_LABEL: 'Pré-collecte veille + livraison lendemain',
  STANDARD_PRICE: 30,
  URGENCE_LABEL: 'Retrait et livraison sous 4 h',
  URGENCE_PRICE: 50,
  DURATION_HOURS: 4
});

// =================================================================
// 3. FEATURE FLAGS (Drapeaux de fonctionnalités)
// =================================================================
const FLAGS = Object.freeze({
  clientPortalEnabled: true,
  billingMultiSheetEnabled: true,
  calendarResyncEnabled: true,
  reservationUiV2Enabled: true,
  residentBillingEnabled: true,
  devisEnabled: true,
  themeV2Enabled: true,
  pricingRulesV2Enabled: true,
  adminOptimisticCreationEnabled: true,
  forfaitResidentEnabled: true
});

// =================================================================
// 4. OBJET DE CONFIGURATION UNIFIÉ (Le Pont entre les deux mondes)
// =================================================================

var Config = {
  // --- Standard Monorepo (Pour Facturation_V2.js et nouveaux scripts) ---
  APP_INFO: { NAME: "EL_Services_Admin", VERSION: "3.0.0-FUSION", ENV: "PROD" },
  
  OWNER: {
    COMPANY: NOM_ENTREPRISE,
    NAME: "Emmanuel Lecourt",
    EMAIL: ADMIN_EMAIL,
    ADDRESS: ADRESSE_ENTREPRISE,
    SIREN: SIREN,
    RIB: RIB_IBAN
  },

  IDS: IDS, // Référence l'objet IDS défini plus haut

  BUSINESS: {
    TVA_APPLICABLE: TVA_APPLICABLE,
    TVA_RATE: TAUX_TVA,
    CURRENCY: "EUR",
    SERVICE_START: HEURE_DEBUT_SERVICE,
    SERVICE_END: HEURE_FIN_SERVICE
  },

  // --- Helpers ---
  getId: function(key) {
    var id = this.IDS[key];
    if (!id) throw new Error("ID Manquant dans Config : " + key);
    return id;
  },
  isProd: function() { return true; },

  // --- Compatibilité Legacy (Pour ancien code qui appellerait Config.TARIFS) ---
  TARIFS: TARIFS,
  PRICING_RULES_V2: PRICING_RULES_V2,
  FLAGS: FLAGS,
  SHEETS: SHEETS
};

// --- Fonctions Globales Legacy (Pour compatibilité) ---
function getConfig() { return Config; }
function getPublicConfig() {
  return {
    TARIFS: TARIFS,
    PRICING_RULES_V2: PRICING_RULES_V2,
    FORFAIT_RESIDENT: FORFAIT_RESIDENT,
    BRANDING: { LOGO_URL: BRANDING_LOGO_PUBLIC_URL }
  };
}
// Fonction Dummy pour éviter les erreurs si l'ancien code appelle encore getSecret
function getSecret(key) {
  console.warn("Appel obsolète à getSecret pour : " + key);
  return ""; 
}