
// =================================================================
//                 CONFIGURATION DE L'APPLICATION
// =================================================================
// Description: Centralise toutes les variables et paramètres
//              personnalisables de l'application.
// =================================================================

/**
 * Required Script Properties:
 * NOM_ENTREPRISE, ADRESSE_ENTREPRISE, EMAIL_ENTREPRISE, ADMIN_EMAIL,
 * ID_FEUILLE_CALCUL, ID_CALENDRIER, ID_DOCUMENT_CGV, ID_MODELE_FACTURE,
 * ID_DOSSIER_ARCHIVES, ID_DOSSIER_TEMPORAIRE, SIRET, ELS_SHARED_SECRET,
 * (optionally ID_DOSSIER_FACTURES)
 */

// --- Informations sur l'entreprise ---
/** @const {string} Nom officiel de l'entreprise utilisé dans l'interface et la facturation. */
const NOM_ENTREPRISE = "Mediconvoi";
/** @const {string} Adresse postale de l'entreprise pour les documents légaux. */
const ADRESSE_ENTREPRISE = "80 Avenue du Général de Gaulle, 83160 La Valette-du-Var";
/** @const {string} Adresse e-mail de contact de l'entreprise. */
const EMAIL_ENTREPRISE = "mediconvoi@gmail.com";
/** @const {string} Adresse e-mail recevant les notifications administratives. */
const ADMIN_EMAIL = "contact@mediconvoi.fr";

/** @const {string} URL de base du portail client (WebApp). A définir si URL personnalisée. */
// TODO: Renseignez ici l'URL de déploiement de votre WebApp pour garantir les liens dans les emails.
const CLIENT_PORTAL_BASE_URL = '';


// --- Paramètres de facturation ---
/** @const {boolean} Indique si la TVA est appliquée ; désactivé par défaut. */
const TVA_APPLICABLE = false;
/** @const {number} Taux de TVA appliqué lorsque TVA_APPLICABLE est true (0.20 pour 20%). */
const TAUX_TVA = 0.20;
/** @const {number} Délai de paiement accordé au client en jours. */
const DELAI_PAIEMENT_JOURS = 5;

/** @const {string} ID du dossier Drive contenant les factures (retombe sur archives). */
const FACTURES_FOLDER_ID = (function () {
  try { return getSecret('ID_DOSSIER_FACTURES'); }
  catch (e) { return getSecret('ID_DOSSIER_ARCHIVES'); }
})();

// — Branding: définir avant toute utilisation pour éviter la TDZ (ReferenceError)
/** @const {string|null} ID Drive du logo principal (nul si on utilise un asset local). */
const BRANDING_LOGO_FILE_ID = '1vbZ9kTYPso7KC4WGINEvVbJwHLCV7BfD';

/** @const {string} URL publique du logo principal (Drive). */
const BRANDING_LOGO_PUBLIC_URL = 'https://drive.google.com/uc?export=view&id=' + BRANDING_LOGO_FILE_ID;

/** @const {Object} Ressources de branding (logo principal). */
const BRANDING = Object.freeze({
  LOGO_FILE_ID: BRANDING_LOGO_FILE_ID,
  LOGO_URL: BRANDING_LOGO_PUBLIC_URL
});

/** @const {string|null} ID du fichier Drive utilisé comme logo sur les factures (optionnel). */
const FACTURE_LOGO_FILE_ID = (function () {
  try {
    const id = getSecret('ID_LOGO_FACTURE');
    return id || BRANDING_LOGO_FILE_ID || null;
  } catch (_err) {
    return BRANDING_LOGO_FILE_ID || null;
  }
})();

// --- Bloc de facturation générique ---
/** @const {Object} Paramètres de facturation centralisés. */
const BILLING = {
  TVA_APPLICABLE: TVA_APPLICABLE,
  TVA_RATE: TVA_APPLICABLE ? TAUX_TVA : 0,
  TVA_MENTION: TVA_APPLICABLE ? "" : "TVA non applicable, art. 293B du CGI",
  DEVISE: "EUR",
  PAIEMENT_DELAI_JOURS: { RESIDENT: 0, PRO: 30 },
  INVOICE_PREFIX: "ELS",
  FACTURES_FOLDER_ID: FACTURES_FOLDER_ID,
  DOC_TEMPLATE_FACTURE_ID: getSecret('ID_MODELE_FACTURE')
};

// --- Paramètres de rétention des données ---
/** @const {number} Durée de conservation légale des factures (années). */
const ANNEES_RETENTION_FACTURES = 5;
/** @const {number} Durée de conservation des logs d'activité (mois). */
const MOIS_RETENTION_LOGS = 12;

// --- Noms des feuilles de calcul ---
/** @const {string} Feuille contenant les données de facturation. */
const SHEET_FACTURATION = 'Facturation';
/** @const {string} Feuille listant les clients. */
const SHEET_CLIENTS = 'Clients';
/** @const {string} Feuille listant les codes postaux autorisés pour les retraits. */
const SHEET_CODES_POSTAUX_RETRAIT = 'Codes_Postaux_Retrait';
/** @const {string} Feuille recensant les etablissements desservis. */
const SHEET_ETABLISSEMENTS = 'Base_Etablissements';
/** @const {string} Feuille stockant les paramètres globaux. */
const SHEET_PARAMETRES = 'Paramètres';
/** @const {string} Feuille de journalisation pour l'administration. */
const SHEET_ADMIN_LOGS = 'Admin_Logs';
/** @const {string} Feuille de journalisation générale. */
const SHEET_LOGS = 'Logs';
/** @const {string} Feuille des plages horaires bloquées. */
const SHEET_PLAGES_BLOQUEES = 'Plages_Bloquees';
/** @const {string} Feuille des réservations. */
const SHEET_RESERVATIONS = 'Réservations';
/** @const {string} Feuille par défaut des nouveaux classeurs. */
const SHEET_DEFAULT = 'Sheet1';
/** @const {string} Feuille stockant les questions des professionnels. */
const SHEET_QUESTIONS = 'Questions';
/** @const {string} Feuille stockant les messages de chat anonyme. */
const SHEET_CHAT = 'Chat';
/** @const {string} Feuille stockant les métadonnées du chat (sel, etc.). */
const SHEET_CHAT_META = 'ChatMeta';
/** @const {string} Feuille stockant les demandes d'intégration de tournée. */
const SHEET_DEMANDES_TOURNEE = 'DemandesTournee';

// --- Horaires & Tampons ---
/** @const {string} Heure d'ouverture du service au format HH:MM. */
const HEURE_DEBUT_SERVICE = "08:30";
/** @const {string} Heure de fermeture du service au format HH:MM. */
const HEURE_FIN_SERVICE = "18:30";
/** @const {number} Minutes de tampon ajoutées avant et après chaque créneau. */
const DUREE_TAMPON_MINUTES = 15;
/** @const {number} Intervalle en minutes entre deux créneaux de réservation. */
const INTERVALLE_CRENEAUX_MINUTES = 15;
/** @const {number} Délai en minutes en dessous duquel une réservation est considérée comme urgente. */
const URGENT_THRESHOLD_MINUTES = 30;

// --- Durées & Kilométrage des prestations ---
/** @const {number} Durée standard d'une prise en charge en minutes. */
const DUREE_BASE = 30;
/** @const {number} Durée supplémentaire par arrêt additionnel en minutes. */
const DUREE_ARRET_SUP = 15;
/** @const {number} Distance de base estimée pour une tournée en kilomètres. */
const KM_BASE = 9;
/** @const {number} Kilométrage ajouté pour chaque arrêt supplémentaire en kilomètres. */
const KM_ARRET_SUP = 3;

// --- Sessions client ---
/** @const {number} Durée de validité d'une session client en heures. */
const CLIENT_SESSION_TTL_HOURS = 24;
/** @const {!Array<string>} Pool d'identifiants inspirés de dessins animés. */
const CLIENT_ID_CARTOON_NAMES = Object.freeze([
  'Aang', 'Abu', 'Aladdin', 'Alice', 'Ariel', 'AstroBoy', 'Aurora', 'Baloo', 'Bambi',
  'BartSimpson', 'Baymax', 'Belle', 'Bender', 'BettyBoop', 'Bloom', 'BuzzLightyear',
  'Casper', 'CharlieBrown', 'Chihiro', 'Cinderella', 'CortoMaltese', 'CourageDog',
  'Dexter', 'DonaldDuck', 'DoraExplorer', 'Doraemon', 'Droopy', 'EdnaMode', 'ElmerFudd',
  'Elsa', 'Fievel', 'FinnHuman', 'FredFlintstone', 'Fry', 'Gadget', 'Garfield', 'Gaston',
  'Goku', 'Goofy', 'HarleyQuinn', 'HeMan', 'HelloKitty', 'HomerSimpson', 'JackSkellington',
  'Jasmine', 'JerryMouse', 'JimmyNeutron', 'JohnnyBravo', 'KimPossible', 'Kirby', 'Kuzco',
  'LadyBug', 'Lilo', 'LolaBunny', 'LuckyLuke', 'Marceline', 'MargeSimpson', 'Megara',
  'Merida', 'MickeyMouse', 'MikeWazowski', 'MinnieMouse', 'Miraculous', 'Moana',
  'MortySmith', 'Mowgli', 'Mulan', 'Nemo', 'Olaf', 'PerryPlatypus', 'PeterPan', 'Phineas',
  'Pikachu', 'Popeye', 'Rapunzel', 'RickSanchez', 'RobinHood', 'SailorMoon', 'ScoobyDoo',
  'Shrek', 'Simba', 'Smurfette', 'Snoopy', 'SpikeDragon', 'Spirou', 'Squidward', 'Stitch',
  'Tiana', 'Tintin', 'TomCat', 'Totoro', 'Trixie', 'Velma', 'WendyDarling', 'WinniePooh',
  'Woody', 'Yugi', 'Zorro'
]);

// =================================================================
//              DRAPEAUX D'ACTIVATION (FEATURE FLAGS)
// =================================================================

// --- Drapeaux de Fonctionnalités Générales ---

/** @const {boolean} Active l'espace client. */
const CLIENT_PORTAL_ENABLED = true;
/** @const {boolean} Exige un lien signé (email+exp+sig) pour l'espace client. */
const CLIENT_PORTAL_SIGNED_LINKS = false;
/** @const {number} Durée de validité d'un lien client signé (heures). */
const CLIENT_PORTAL_LINK_TTL_HOURS = 168;
/** @const {boolean} Affiche le lien vers les informations de confidentialité. */
const PRIVACY_LINK_ENABLED = true;
/** @const {boolean} Affiche le lien vers les mentions légales. */
const LEGAL_NOTICE_LINK_ENABLED = true;
/** @const {boolean} Sépare l'affichage des créneaux en matin et après-midi. */
const SLOTS_AMPM_ENABLED = false;
/** @const {boolean} Stocke l'identifiant client sous forme de jeton opaque. */
const CLIENT_SESSION_OPAQUE_ID_ENABLED = false;
/** @const {boolean} Vérifie la présence du scope script.send_mail lors du setup. */
const SEND_MAIL_SCOPE_CHECK_ENABLED = false;
/** @const {boolean} Agrège toutes les feuilles "Facturation*" lors du calcul des factures. */
const BILLING_MULTI_SHEET_ENABLED = true;
/** @const {boolean} Affiche le chiffre d'affaires en cours dans l'interface admin. */
const CA_EN_COURS_ENABLED = true;
/** @const {boolean} Précharge le loader Google Charts via proxy (peut déclencher OAuth). */
const CHARTS_PROXY_PREFETCH_ENABLED = false;
/** @const {boolean} Active les graphiques côté client (nécessite autorisation UrlFetch). */
const CLIENT_CHARTS_ENABLED = false;
/** @const {boolean} Resynchronise les événements manquants du calendrier Google. */
const CALENDAR_RESYNC_ENABLED = true;
/** @const {boolean} Supprime les identifiants d'événements introuvables pour garder la base propre. */
const CALENDAR_PURGE_ENABLED = true;
const RESERVATION_CONFIRMATION_EMAILS_ENABLED = true;
const CFG_ENABLE_ASSISTANT = true
/** @const {boolean} Module l'opacité de la barre de disponibilité selon le taux de charge. */
const CALENDAR_BAR_OPACITY_ENABLED = false;

/** @const {boolean} Active la création optimiste des courses admin. */
const ADMIN_OPTIMISTIC_CREATION_ENABLED = true;

/** @const {boolean} Active la colonne de créneaux PNG dans la modale admin. */
const ADMIN_SLOTS_PNG_ENABLED = false;

/** @const {boolean} Vérifie la création d'événement et l'unicité des ID de réservation. */
const RESERVATION_VERIFY_ENABLED = true;

/** @const {boolean} Active la nouvelle interface de réservation JavaScript. */
const RESERVATION_UI_V2_ENABLED = true;

/** @const {boolean} Active la facturation directe au résident. */
const RESIDENT_BILLING_ENABLED = true;
/** @const {boolean} Exige l'affiliation d'un résident à une structure (email requis). */
const RESIDENT_AFFILIATION_REQUIRED = true;
const RESIDENT_REPLAN_ALLOW_ANY_SLOT = true;

/** @const {boolean} Affiche le bloc "Tarifs détaillés" dans l'UI. */
const TARIFS_DETAILLE_ENABLED = true;

/** @const {boolean} Active le forfait Résident (PUI Sainte Musse). */
const FORFAIT_RESIDENT_ENABLED = true;

/** @const {boolean} Active la numérotation atomique des factures (AAAA-0001). */
const BILLING_ATOMIC_NUMBERING_ENABLED = false;

/** @const {boolean} Active la modale de coordonnées de facturation. */
const BILLING_MODAL_ENABLED = true;
/** @const {boolean} Active la réinitialisation du panier côté client. */
const CART_RESET_ENABLED = true;
/** @const {boolean} Inclut le retour dans la durée et la distance estimées (UI uniquement). */
const RETURN_IMPACTS_ESTIMATES_ENABLED = true;
/** @const {boolean} Apply pricing rules V2 (Saturday overrides urgent; no stacking). */
const PRICING_RULES_V2_ENABLED = true;
/** @const {boolean} Active la saisie assistée des adresses clients via l'API Adresse. */
const CLIENT_ADRESSE_AUTOCOMPLETE_ENABLED = true;

/** @const {boolean} Affiche le bloc de preuves sociales (avis/partenaires). */
const PROOF_SOCIAL_ENABLED = false;
/** @const {boolean} Active le module Questions/Réponses pour les professionnels. */
const PRO_QA_ENABLED = false;

/** @const {boolean} Affiche les pictogrammes supplémentaires (semainier, boîte scellée, livraison). */
const EXTRA_ICONS_ENABLED = true;
/** @const {boolean} Active la génération de devis PDF côté admin (menu Sheets). */
const ADMIN_DEVIS_PDF_ENABLED = true;
// --- Drapeaux de Débogage et de Test ---
/** @const {boolean} Affiche le sous-menu Debug et l'interface associée. */
const DEBUG_MENU_ENABLED = false;
/** @const {boolean} Sert une version de démo de la page de réservation. */
const DEMO_RESERVATION_ENABLED = false;
/** @const {boolean} Active l'écriture des logs de facturation. */
const BILLING_LOG_ENABLED = true;
/** @const {boolean} Active le mode test pour la facturation V2 (aucune écriture). */
const BILLING_V2_DRYRUN = true;
/** @const {boolean} Vérifie la présence de la colonne ID PDF dans l'onglet Facturation. */
const BILLING_ID_PDF_CHECK_ENABLED = true;
/** @const {boolean} Active la journalisation détaillée des requêtes web. */
const REQUEST_LOGGING_ENABLED = true;
/** @const {boolean} Active le traitement des requêtes POST. */
const POST_ENDPOINT_ENABLED = true;
/** @const {boolean} Limite le nombre de tentatives de connexion au portail client. */
const CLIENT_PORTAL_ATTEMPT_LIMIT_ENABLED = false;
/** @const {number} Nombre maximum de tentatives avant blocage. */
const CLIENT_PORTAL_MAX_ATTEMPTS = 10;
/** @const {boolean} Active la mise en cache des paramètres de configuration. */
const CONFIG_CACHE_ENABLED = true;
/** @const {boolean} Active la mise en cache des réservations (désactivé par défaut). */
const RESERVATION_CACHE_ENABLED = true;
/** @const {boolean} Affiche les créneaux déjà réservés dans la sélection de créneau. */
/** @const {boolean} Active le flux d'envoi de devis pour les clients. */
const DEVIS_ENABLED = true;

const RESERVATION_SHOW_TAKEN_SLOTS_ENABLED = true;

// --- Drapeaux de Thème ---
/** @const {boolean} Active la nouvelle version du thème graphique (V2). */
const THEME_V2_ENABLED = true;
const ELS_UI_THEMING_ENABLED = true;
/** @const {boolean} Affiche un bouton client pour basculer vers un thème épuré. */
const THEME_SWITCHER_ENABLED = true;

/** @const {boolean} Utilise les icônes hébergées sur Drive au lieu des Data URI. */
const DRIVE_ASSETS_ENABLED = false;

/** @const {{CAPSULE_1X:string,CAPSULE_2X:string,BLISTER_1X:string,BLISTER_2X:string,ALUMINIUM_1X:string,ALUMINIUM_2X:string}} Identifiants Drive des icônes. */
const DRIVE_ASSET_IDS = Object.freeze({
  CAPSULE_1X: '',
  CAPSULE_2X: '',
  BLISTER_1X: '',
  BLISTER_2X: '',
  ALUMINIUM_1X: '',
  ALUMINIUM_2X: ''
});
/** @const {boolean} Permet aux clients de choisir leur thème visuel. */
// const THEME_SELECTION_ENABLED = false; // supprimé: sélection de thème désactivée
/** @const {string} Thème appliqué par défaut lorsque la sélection est active. */
// const THEME_DEFAULT = 'clarte'; // supprimé
/** @const {Object<string,string>} Associe les clés de thème aux chemins des fichiers CSS. */
// const THEMES = {}; // supprimé

// Objet regroupant tous les drapeaux de fonctionnalité exposés au client
const FLAGS = Object.freeze({
  clientPortalEnabled: CLIENT_PORTAL_ENABLED,
  clientPortalSignedLinks: CLIENT_PORTAL_SIGNED_LINKS,
  privacyLinkEnabled: PRIVACY_LINK_ENABLED,
  legalNoticeEnabled: LEGAL_NOTICE_LINK_ENABLED,
  slotsAmpmEnabled: SLOTS_AMPM_ENABLED,
  clientSessionOpaqueIdEnabled: CLIENT_SESSION_OPAQUE_ID_ENABLED,
  billingMultiSheetEnabled: BILLING_MULTI_SHEET_ENABLED,
  caEnCoursEnabled: CA_EN_COURS_ENABLED,
  calendarResyncEnabled: CALENDAR_RESYNC_ENABLED,
  calendarPurgeEnabled: CALENDAR_PURGE_ENABLED,
  calendarBarOpacityEnabled: CALENDAR_BAR_OPACITY_ENABLED,
  reservationUiV2Enabled: RESERVATION_UI_V2_ENABLED,
  driveAssetsEnabled: DRIVE_ASSETS_ENABLED,
  residentBillingEnabled: RESIDENT_BILLING_ENABLED,
  residentReplanAllowAnySlot: RESIDENT_REPLAN_ALLOW_ANY_SLOT,
  billingModalEnabled: BILLING_MODAL_ENABLED,
  cartResetEnabled: CART_RESET_ENABLED,
  devisEnabled: DEVIS_ENABLED,
  debugMenuEnabled: DEBUG_MENU_ENABLED,
  demoReservationEnabled: DEMO_RESERVATION_ENABLED,
  billingV2Dryrun: BILLING_V2_DRYRUN,
  billingLogEnabled: BILLING_LOG_ENABLED,
  billingIdPdfCheckEnabled: BILLING_ID_PDF_CHECK_ENABLED,
  billingAtomicNumberingEnabled: BILLING_ATOMIC_NUMBERING_ENABLED,
  requestLoggingEnabled: REQUEST_LOGGING_ENABLED,
  postEndpointEnabled: POST_ENDPOINT_ENABLED,
  clientPortalAttemptLimitEnabled: CLIENT_PORTAL_ATTEMPT_LIMIT_ENABLED,
  configCacheEnabled: CONFIG_CACHE_ENABLED,
  reservationCacheEnabled: RESERVATION_CACHE_ENABLED,
  reservationShowTakenSlotsEnabled: RESERVATION_SHOW_TAKEN_SLOTS_ENABLED,
  proofSocialEnabled: PROOF_SOCIAL_ENABLED,
  proQaEnabled: PRO_QA_ENABLED,
  extraIconsEnabled: EXTRA_ICONS_ENABLED,
  themeV2Enabled: THEME_V2_ENABLED,
  themeSwitcherEnabled: THEME_SWITCHER_ENABLED,
  elsUiThemingEnabled: ELS_UI_THEMING_ENABLED,
  pricingRulesV2Enabled: PRICING_RULES_V2_ENABLED,
  returnImpactsEstimatesEnabled: RETURN_IMPACTS_ESTIMATES_ENABLED,
  adresseAutocompleteEnabled: CLIENT_ADRESSE_AUTOCOMPLETE_ENABLED,
  adminOptimisticCreationEnabled: ADMIN_OPTIMISTIC_CREATION_ENABLED,
  adminSlotsPngEnabled: ADMIN_SLOTS_PNG_ENABLED,
  tarifsDetailleEnabled: TARIFS_DETAILLE_ENABLED,
  forfaitResidentEnabled: FORFAIT_RESIDENT_ENABLED
  , residentAffiliationRequired: RESIDENT_AFFILIATION_REQUIRED
});


// =================================================================
//              SYSTÈME DE TARIFICATION FLEXIBLE
// =================================================================
// Schéma des tarifs:
// { 'Type': { base: number, arrets: number[] } }
// - 'Type': 'Normal', 'Samedi', 'Urgent', 'Special'
// - base: Prix du premier arrêt (prise en charge)
// - arrets: Tarifs des arrêts suivants; le dernier s'applique au-delà
// Exemple Grille (Normal): 1=15€, 2=20€ (15+5), 3=24€ (20+4), etc.
/**
 * @const {Object<string,{base:number, arrets:number[]}>}
 * Grille tarifaire unique pilotant tous les calculs de prix.
 */
const TARIFS = {
  'Normal': { // Tarifs standard du lundi au vendredi
    base: 15,
    arrets: [5, 4, 3, 4, 5] // Prix pour Arrêt 2, 3, 4, 5, et 6+
  },
  'Samedi': { // Livraisons effectuées le samedi
    base: 25,
    arrets: [5, 4, 3, 4, 5]
  },
  'Urgent': { // Réservations dans le délai URGENT_THRESHOLD_MINUTES
    base: 20,
    arrets: [5, 4, 3, 4, 5]
  },
  'Special': { // Cas particuliers ou tarifs temporaires
    base: 30,
    arrets: [5, 4, 3, 4, 5]
  }
};

/**
 * Génère les règles PRICING_RULES_V2 à partir de la grille TARIFS.
 * Assure l'unicité de la source des tarifs pour tous les calculs.
 * - Les stopTotals[1] correspondent à TARIFS.<Type>.base
 * - Les suppléments utilisés sont ceux de TARIFS.Normal.arrets
 * - Le retour est modélisé par le premier supplément (ou le dernier connu)
 * @returns {{Normal:Object,Samedi:Object,Urgent:Object,Special:Object}}
 */
function buildPricingRulesV2FromTarifs_() {
  var tarifs = (typeof TARIFS !== 'undefined' && TARIFS) ? TARIFS : {};
  var normal = tarifs.Normal || { base: 0, arrets: [] };
  var supplements = Array.isArray(normal.arrets) ? normal.arrets.slice() : [];
  var lastSupp = supplements.length ? Number(supplements[supplements.length - 1]) : 0;
  if (!isFinite(lastSupp)) lastSupp = 0;

  // Construit les totaux cumulés pour le type Normal à partir de TARIFS.Normal
  // stopTotals[0] est ignoré, l'indexation logique commence à 1 pour lisibilité.
  var buildStopTotals = function (base) {
    base = Number(base) || 0;
    var totals = [];
    var acc = base;
    // 1 arrêt
    totals.push(acc);
    // Arrêts suivants (2..6 par défaut) puis extrapolation via extraStopIncrement
    for (var i = 0; i < supplements.length; i++) {
      var inc = Number(supplements[i]);
      if (!isFinite(inc)) inc = lastSupp;
      acc += inc;
      totals.push(acc);
    }
    return totals; // [base, base+s1, base+s1+s2, ...]
  };

  var stopTotalsNormal = buildStopTotals(normal.base);
  var extraInc = lastSupp;
  var returnFee = (supplements.length ? Number(supplements[0]) : lastSupp) || 0;

  // Calcule les stopTotals pour un type en décalant seulement la base
  var deriveFromNormal = function (typeBase) {
    typeBase = Number(typeBase) || 0;
    var delta = typeBase - (Number(normal.base) || 0);
    var totals = stopTotalsNormal.map(function (v) { return Number(v) + delta; });
    return Object.freeze({
      stopTotals: Object.freeze(totals),
      extraStopIncrement: extraInc,
      returnSurcharge: returnFee
    });
  };

  var samediBase = (tarifs.Samedi && isFinite(Number(tarifs.Samedi.base))) ? Number(tarifs.Samedi.base) : Number(normal.base) || 0;
  var urgentBase = (tarifs.Urgent && isFinite(Number(tarifs.Urgent.base))) ? Number(tarifs.Urgent.base) : Number(normal.base) || 0;
  var specialBase = (tarifs.Special && isFinite(Number(tarifs.Special.base))) ? Number(tarifs.Special.base) : Number(normal.base) || 0;

  return Object.freeze({
    Normal: deriveFromNormal(normal.base),
    Samedi: deriveFromNormal(samediBase),
    Urgent: deriveFromNormal(urgentBase),
    Special: deriveFromNormal(specialBase)
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


// --- Noms des colonnes spécifiques (Feuille Clients) ---
/** @const {string} Nom de la colonne indiquant le type de remise appliqué. */
const COLONNE_TYPE_REMISE_CLIENT = "Type de Remise";
/** @const {string} Nom de la colonne contenant la valeur de la remise. */
const COLONNE_VALEUR_REMISE_CLIENT = "Valeur Remise";
/** @const {string} Identifiant unique attribué au client. */
const COLONNE_ID_CLIENT = "Client ID";
/** @const {string} Nom de la colonne pour le nombre de tournées offertes. */
const COLONNE_NB_TOURNEES_OFFERTES = "Nombre Tournées Offertes";
/** @const {string} Colonne indiquant si le client est un résident. */
const COLONNE_RESIDENT_CLIENT = "Resident";
/** @const {string} Colonne stockant le code postal de l'officine cliente. */
const COLONNE_CODE_POSTAL_CLIENT = "Code Postal";
/** @const {string} Colonne stockant le num&eacute;ro de t&eacute;l&eacute;phone principal de l'officine cliente. */
const COLONNE_TELEPHONE_CLIENT = "Téléphone";

// --- Base etablissements desservis ---
const ETABLISSEMENT_TYPES = Object.freeze(['Pharmacie', 'EHPAD', 'Residence Senior', 'Foyer de Vie']);
const COLONNE_TYPE_ETAB = 'Type';
const COLONNE_NOM_ETAB = 'Nom';
const COLONNE_ADRESSE_ETAB = 'Adresse';
const COLONNE_CODE_POSTAL_ETAB = 'Code Postal';
const COLONNE_VILLE_ETAB = 'Ville';
const COLONNE_CONTACT_ETAB = 'Contact';
const COLONNE_TELEPHONE_ETAB = 'Telephone';
const COLONNE_EMAIL_ETAB = 'Email';
const COLONNE_SITE_WEB_ETAB = 'Site Web';
const COLONNE_JOURS_ETAB = 'Jours Souhaites';
const COLONNE_PLAGE_ETAB = 'Plage Horaire';
const COLONNE_SOURCE_ETAB = 'Source';
const COLONNE_NOTE_ETAB = 'Notes';
const COLONNE_PHARMACIE_REFERENTE = 'Pharmacie Référente';
const COLONNE_STATUT_ETAB = 'Actif';
const COLONNE_DERNIERE_MAJ_ETAB = 'Derniere_MAJ';
const COLONNE_PLACE_ID_ETAB = 'PlaceID';
const COLONNE_LATITUDE_ETAB = 'Latitude';
const COLONNE_LONGITUDE_ETAB = 'Longitude';


// =================================================================
//              FONCTIONS D'ACCÈS À LA CONFIGURATION
// =================================================================

const CONFIG = Object.freeze({
  TARIFS,
  PRICING_RULES_V2,
  PRICING_RULES_V2_ENABLED,
  RETURN_IMPACTS_ESTIMATES_ENABLED,
  FORFAIT_RESIDENT,
  DUREE_BASE,
  DUREE_ARRET_SUP,
  KM_BASE,
  KM_ARRET_SUP,
  URGENT_THRESHOLD_MINUTES,
  HEURE_DEBUT_SERVICE,
  HEURE_FIN_SERVICE,
  TVA_APPLICABLE,
  ANNEES_RETENTION_FACTURES,
  MOIS_RETENTION_LOGS,
  CLIENT_PORTAL_ATTEMPT_LIMIT_ENABLED,
  CLIENT_PORTAL_MAX_ATTEMPTS,
  SHEET_RESERVATIONS,
  BILLING,
  BILLING_MODAL_ENABLED,
  RESIDENT_BILLING_ENABLED,
  RESIDENT_REPLAN_ALLOW_ANY_SLOT,
  RESERVATION_CONFIRMATION_EMAILS_ENABLED,
  BILLING_ATOMIC_NUMBERING_ENABLED,
  RESERVATION_VERIFY_ENABLED,
  BILLING_LOG_ENABLED,
  BILLING_V2_DRYRUN,
  BILLING_ID_PDF_CHECK_ENABLED,
  BRANDING
});

/**
 * Retourne un objet contenant les paramètres de configuration principaux.
 * @returns {object} L'objet de configuration.
 */
function getConfig() {
  return CONFIG;
}

function getPublicConfig() {
  return {
    TARIFS: CONFIG.TARIFS,
    PRICING_RULES_V2_ENABLED: CONFIG.PRICING_RULES_V2_ENABLED,
    PRICING_RULES_V2: CONFIG.PRICING_RULES_V2,
    FORFAIT_RESIDENT: CONFIG.FORFAIT_RESIDENT,
    DUREE_BASE: CONFIG.DUREE_BASE,
    DUREE_ARRET_SUP: CONFIG.DUREE_ARRET_SUP,
    KM_BASE: CONFIG.KM_BASE,
    KM_ARRET_SUP: CONFIG.KM_ARRET_SUP,
    URGENT_THRESHOLD_MINUTES: CONFIG.URGENT_THRESHOLD_MINUTES,
    HEURE_DEBUT_SERVICE: CONFIG.HEURE_DEBUT_SERVICE,
    HEURE_FIN_SERVICE: CONFIG.HEURE_FIN_SERVICE,
    TVA_APPLICABLE: CONFIG.TVA_APPLICABLE,
    BRANDING: CONFIG.BRANDING
  };
}

/**
 * Retourne la configuration depuis le cache si activé, sinon la recalcule.
 * Utile pour améliorer les performances en limitant les accès globaux.
 * @returns {object} L'objet de configuration, potentiellement depuis le cache.
 */
function getConfigCached() {
  if (!CONFIG_CACHE_ENABLED) {
    return getConfig();
  }
  const cache = CacheService.getScriptCache();
  const cachedConfig = cache.get('CONFIG_JSON');
  if (cachedConfig) {
    return JSON.parse(cachedConfig);
  }
  const config = getConfig();
  // Met en cache la configuration pour 10 minutes (600 secondes)
  cache.put('CONFIG_JSON', JSON.stringify(config), 600);
  return config;
}

/**
 * Retourne la cle API Google Maps (Places).
 * @returns {string}
 */
function getMapsApiKey() {
  const props = PropertiesService.getScriptProperties();
  const key = props ? String(props.getProperty('Maps_API_KEY') || '').trim() : '';
  if (!key) {
    throw new Error('Maps_API_KEY manquant dans les proprietes de script.');
  }
  return key;
}


/**
 * EL SERVICES - MODULE DE CONFIGURATION CENTRALISÉE
 * * Ce fichier gère l'accès aux propriétés du script (ScriptProperties).
 * Il interdit les valeurs en dur pour la sécurité et la maintenabilité.
 * * @author Dev EL Services
 */
var Config = (function () {
  var _cache = null;

  function _loadCache() {
    if (_cache === null) {
      try {
        _cache = PropertiesService.getScriptProperties().getProperties();
      } catch (e) {
        console.error("CRITICAL: Impossible de charger les propriétés du script.", e);
        _cache = {};
      }
    }
  }

  function _get(key, isOptional) {
    _loadCache();
    var value = _cache[key];
    if (value === undefined || value === null || value === "") {
      if (!isOptional) {
        console.warn("CONFIGURATION: La propriété '" + key + "' est manquante.");
      }
      return "";
    }
    return value;
  }

  function _getOrDefault(key, defaultValue) {
    var value = _get(key, true);
    if (value === undefined || value === null || value === "") {
      return defaultValue || "";
    }
    return value;
  }

  function _set(key, value) {
    try {
      PropertiesService.getScriptProperties().setProperty(key, value);
      if (_cache !== null) {
        _cache[key] = value;
      }
    } catch (e) {
      console.error("Config: Erreur lors de la mise à jour de '" + key + "'", e);
      throw e;
    }
  }

  return {
    get: function (key) { return _get(key); },
    set: _set,

    // Identifiants Dossiers & Fichiers
    get ID_DOSSIER_FACTURES() { return _get("ID_DOSSIER_FACTURES"); },
    get ID_DOSSIER_ARCHIVES() { return _get("ID_DOSSIER_ARCHIVES"); },
    get ID_DOSSIER_TEMPORAIRE() { return _get("ID_DOSSIER_TEMPORAIRE"); },
    get ID_DOCUMENT_CGV() { return _get("ID_DOCUMENT_CGV"); },
    get ID_MODELE_FACTURE() { return _get("ID_MODELE_FACTURE"); },
    get ID_FEUILLE_CALCUL() { return _get("ID_FEUILLE_CALCUL"); },

    // Identifiants Images & Assets
    get ID_LOGO() { return _get("ID_LOGO"); },
    get ID_LOGO_FACTURE() { return _get("ID_LOGO_FACTURE"); },
    get ID_LOGO_URL() { return _get("ID_LOGO_URL"); },

    // Informations Entreprise
    get NOM_ENTREPRISE() { return _get("NOM_ENTREPRISE"); },
    get ADRESSE_ENTREPRISE() { return _get("ADRESSE_ENTREPRISE"); },
    get EMAIL_ENTREPRISE() { return _get("EMAIL_ENTREPRISE"); },
    get ADMIN_EMAIL() { return _getOrDefault("ADMIN_EMAIL", "elservicestoulon@gmail.com"); },
    get ID_CALENDRIER() { return _get("ID_CALENDRIER"); },
    get SIRET() { return _get("SIRET"); },
    get RIB_ENTREPRISE() { return _get("RIB_ENTREPRISE"); },

    // Sécurité & API
    get GEMINI_API_KEY() { return _get("GEMINI_API_KEY"); },
    get ELS_SHARED_SECRET() { return _get("ELS_SHARED_SECRET"); },
    get TRACE_SECRET() { return _get("TRACE_SECRET"); },
    get WEBAPP_URL() { return _get("WEBAPP_URL"); },
    getMapsApiKey: function () {
      try {
        // Privilégie la fonction globale si elle existe (compatibilité legacy).
        if (typeof globalThis !== 'undefined' && typeof globalThis.getMapsApiKey === 'function') {
          return globalThis.getMapsApiKey();
        }
        if (typeof getMapsApiKey === 'function') {
          return getMapsApiKey();
        }
      } catch (_ignored) {
        // On continue avec la récupération directe.
      }
      var key = _getOrDefault("Maps_API_KEY", "");
      if (!key) {
        throw new Error("Maps_API_KEY manquant dans les ScriptProperties.");
      }
      return key;
    },

    getSpreadsheetId: function () {
      var id = _getOrDefault("ID_FEUILLE_CALCUL", "");
      if (!id && typeof getSecret === 'function') {
        try {
          id = getSecret('ID_FEUILLE_CALCUL');
        } catch (_ignored) {
          // On laisse l'erreur gérée plus bas si toujours vide.
        }
      }
      if (!id) {
        throw new Error("ID_FEUILLE_CALCUL manquant dans la configuration.");
      }
      return id;
    },

    // --- MODULE TESLA (API Tessie) ---
    get TESLA() {
      return {
        TOKEN: _getOrDefault('TESLA_TOKEN', 'TON_TOKEN_TESSIE_ICI'), // Token API Tessie
        VIN: _getOrDefault('TESLA_VIN', 'TON_VIN_TESLA_ICI'), // VIN (5YJ...)
        SEUIL_ALERTE: _getOrDefault('TESLA_SEUIL_ALERTE', 20), // % Batterie minimum avant alerte
        EMAIL_ALERTE: _getOrDefault('TESLA_EMAIL_ALERTE', 'elservicestoulon@gmail.com')
      };
    },

    // Identité Société (compatibilité legacy)
    get APP_NAME() { return "EL Services Gestion"; },
    get SOCIETE_NOM() { return _getOrDefault("SOCIETE_NOM", _get("NOM_ENTREPRISE")); },
    get SOCIETE_DIRIGEANT() { return _getOrDefault("SOCIETE_DIRIGEANT", "Emmanuel Lecourt"); },
    get SOCIETE_ADRESSE() { return _getOrDefault("ADRESSE_ENTREPRISE", "255 Bis Avenue Marcel Castié, 83000 Toulon"); },
    get SOCIETE_SIRET() { return _getOrDefault("SIRET", "480 913 060 00020"); },
    get SOCIETE_TVA() { return _get("TVA_INTRA"); },
    get SOCIETE_RCS() { return _get("RCS"); },
    get SOCIETE_BANQUE() { return _getOrDefault("BANQUE_NOM", "Banque Populaire Méditerranée"); },
    get SOCIETE_IBAN() { return _getOrDefault("IBAN", "FR76 XXXX XXXX XXXX XXXX XXXX XXX (À CONFIGURER)"); },
    get SOCIETE_BIC() { return _getOrDefault("BIC", "XXXXXXXX"); },

    // EMAIL CONFIG
    get EMAIL_CONTACT() { return _getOrDefault("EMAIL_ENTREPRISE", _get("ADMIN_EMAIL")); },

    // Compat: raccourcis groupés
    get IDS() { return Object.freeze({ CALENDAR: _get("ID_CALENDRIER") }); },
    get FILES() { return Object.freeze({ RESERVATIONS_DB: _get("ID_SHEET_RESERVATIONS") || _get("ID_FEUILLE_CALCUL") }); },
    get SHEETS() { return Object.freeze({ ETABLISSEMENTS: (typeof SHEET_ETABLISSEMENTS !== 'undefined') ? SHEET_ETABLISSEMENTS : 'Base_Etablissements' }); },

    /**
     * Vérifie si la configuration minimale est présente.
     * @return {boolean} True si les clés critiques sont là.
     */
    isValid: function () {
      _loadCache();
      var criticalKeys = ["ID_DOSSIER_FACTURES", "NOM_ENTREPRISE", "ADMIN_EMAIL"];
      for (var i = 0; i < criticalKeys.length; i++) {
        if (!_cache[criticalKeys[i]]) return false;
      }
      return true;
    }
  };
})();

/**
 * Fonction utilitaire pour tester la configuration.
 */
function TEST_Configuration() {
  console.log("--- TEST CONFIGURATION ---");
  console.log("Société: " + Config.SOCIETE_NOM);
  console.log("SIRET: " + Config.SOCIETE_SIRET);
  console.log("IBAN: " + Config.SOCIETE_IBAN);

  if (Config.SOCIETE_IBAN.includes("À CONFIGURER")) {
    console.warn("ATTENTION : L'IBAN n'est pas configuré dans les ScriptProperties.");
  } else {
    console.log("SUCCÈS : Configuration chargée.");
  }
}

/**
 * FONCTION ADMINISTRATIVE UNIQUEMENT.
 * À exécuter manuellement UNE FOIS pour initialiser ou réparer les propriétés du script
 * basées sur l'export JSON du 25/11/2025.
 */
function SETUP_INIT_PROPERTIES() {
  var props = {
    "ID_DOSSIER_FACTURES": "1IGMRLuYcBnGzjWS9StI6slZjnkz8fa84",
    "ADMIN_EMAIL": "elservicestoulon@gmail.com",
    "NOM_ENTREPRISE": "EL Services",
    "GEMINI_API_KEY": "REMPLACER_PAR_VOTRE_CLE", // À CONFIGURER DANS SCRIPT PROPERTIES
    "RIB_ENTREPRISE": "FR76 4061 8804 7600 0403 5757 187",
    "ID_DOSSIER_ARCHIVES": "1HLBar6IvpJgrG_lfyRSKwNwib6U__w9U",
    "ID_DOCUMENT_CGV": "13nClmRx-6jsSf3NLT05gHy5QCFFDqAL5nA97aYPEMh0",
    "ID_CALENDRIER": "elservicestoulon@gmail.com",
    "ADRESSE_ENTREPRISE": "255 B Avenue Marcel Castié, 83000 Toulon",
    "ELS_SHARED_SECRET": "A_DEFINIR_DANS_PROPERTIES",
    "EMAIL_ENTREPRISE": "elservicestoulon@gmail.com",
    "ID_DOSSIER_TEMPORAIRE": "1Rel3nGZBfUnt36WuuJ_IJVRmskEAFN9Y",
    "TRACE_SECRET": "A_DEFINIR_DANS_PROPERTIES",
    "ID_LOGO": "1p10Rb3QBn3tUUs2M5zNiQzPn1YxnoPIW",
    "ID_MODELE_FACTURE": "1dceBMePjZhpSALkt2_wVxRM-2DtK9LGjEXS0qMqnZRo",
    "SIRET": "48091306000020",
    "ID_LOGO_FACTURE": "1p10Rb3QBn3tUUs2M5zNiQzPn1YxnoPIW",
    "ID_FEUILLE_CALCUL": "1AzWdQQ4UEq0Fvr_iTpDY5TiXn55ij30_okIxIG5p_OM",
    "Maps_API_KEY": "REMPLACER_PAR_VOTRE_CLE" // À CONFIGURER
  };

  try {
    // On ne supprime pas tout (.deleteAllProperties()) par sécurité, on écrase/ajoute seulement.
    PropertiesService.getScriptProperties().setProperties(props);
    console.log("SUCCÈS : Propriétés du script mises à jour avec " + Object.keys(props).length + " clés.");
  } catch (e) {
    console.error("ERREUR lors de l'initialisation des propriétés : " + e.toString());
  }
}
