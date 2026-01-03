/**
 * @fileoverview Contrôleur principal de l'application Projet_ELS.
 * Refactorisé pour utiliser le routeur et les modules modulaires (Router, Auth, SheetsRepo).
 * @onlyCurrentDoc
 */

// =================================================================
//                      POINT D'ENTRÉE & MENUS
// =================================================================

/**
 * Déclenché à l'ouverture du Google Sheet pour installer les menus.
 * @param {Object} e - Événement d'ouverture Apps Script.
 */

function onOpen(e) {
  const ui = SpreadsheetApp.getUi();

  const menuPrincipal = ui.createMenu('ELS');
  const menuFacturation = ui.createMenu('Facturation')
    .addItem('Generer les factures selectionnees', 'genererFactures')
    .addItem('Envoyer les factures controlees', 'envoyerFacturesControlees')
    .addItem('Archiver les factures du mois dernier', 'archiverFacturesDuMois');

  const menuMaintenance = ui.createMenu('Maintenance')
    .addItem('Verifier l installation (Setup Master)', 'menuVerifierInstallation')
    .addItem('Completer les onglets requis (Setup Master)', 'setupSheetsMaster')
    .addItem('Initialiser base etablissements desservis', 'menuProvisionnerBaseEtablissements')
    .addItem('Completer les emails base etablissements', 'menuCompleterEmailsBaseEtablissements')
    .addItem('Auditer et enrichir base etablissements', 'auditBaseEtablissement')
    .addItem('Completer les noms de communes', 'menuCompleterCommunes')
    .addSeparator()
    .addItem("Importer Etablissements (Pharmacies, EHPADs...)", "importerTousLesTypesPourCodesPostauxRetrait")
    .addSeparator()
    .addItem("Nettoyer l'onglet Facturation", 'nettoyerOngletFacturation')
    .addItem('Reparer entetes Facturation', 'reparerEntetesFacturation')
    .addItem('Normaliser entetes Facturation', 'normaliserEntetesFacturation')
    .addSeparator()
    .addItem('Corriger SIRET Clients', 'corrigerSiretClients');

  // Ajout du menu Admin DB s'il n'est pas déjà appelé via onOpen_Setup (dépend de l'ordre de chargement)
  // On laisse Setup_Database.js gérer son propre menu si nécessaire, mais on peut l'ajouter ici aussi
  if (typeof onOpen_Setup === 'function') {
    try { onOpen_Setup(); } catch (e) { /* ignore */ }
  }

  const menuAgents = ui.createMenu('🤖 Agents')
    .addItem('Ouvrir Tableau de Bord (Sidebar)', 'openAgentSidebar')
    .addSeparator()
    .addSubMenu(ui.createMenu('Gouvernance')
      .addItem('Lancer Architecte (Lead)', 'menuRunArchitect')
      .addItem('Lancer Client Expert (QA)', 'menuRunClientExpert')
      .addItem('Lancer Guardian (Santé)', 'menuRunGuardian'))
    .addSubMenu(ui.createMenu('Performance & Infra')
      .addItem('Lancer Bolt (Speed)', 'menuRunBolt')
      .addItem('Lancer Cloudflare (Réseau)', 'menuRunCloudflare')
      .addItem('Lancer Sentinel (Sécurité)', 'menuRunSentinel'))
    .addSubMenu(ui.createMenu('Maintenance')
      .addItem('Lancer Mechanic (Fix)', 'menuRunMechanic')
      .addItem('Lancer Palette (UX)', 'menuRunPalette')
      .addItem('Lancer Scribe (Docs)', 'menuRunScribe'))
    .addSubMenu(ui.createMenu('Activités')
      .addItem('Lancer Marketing (SEO)', 'menuRunMarketing')
      .addItem('Lancer Billing (Fact)', 'menuRunBilling')
      .addItem('Lancer Qualité (Hebdo)', 'menuRunQualite'));

  menuPrincipal
    .addSubMenu(menuFacturation)
    .addSubMenu(menuMaintenance)
    .addSubMenu(menuAgents)
    .addSeparator()
    .addItem('Rafraichir le menu', 'onOpen')
    .addToUi();
  safeToast_('Menu ELS mis a jour', 'ELS', 5);

  const canValidate = hasFullAuthorization_(e);
  if (!canValidate) {
    safeToast_('Autorisations Apps Script requises pour valider la config. Ouvrez le projet Apps Script et executez validerConfiguration().', 'ELS', 10);
    return;
  }

  try {
    validerConfiguration();
  } catch (err) {
    ui.alert('Configuration invalide', err.message, ui.ButtonSet.OK);
  }
}

function onInstall(e) {
  onOpen(e);
}

// =================================================================
//                        ROUTAGE HTTP (GET)
// =================================================================

/**
 * Point d'entrée pour les requêtes GET Web App.
 * Délègue au Router.
 */
function doGet(e) {
  // Enregistrement des routes (si ce n'est pas fait globalement)
  registerRoutes_();
  return Router.dispatch(e);
}

/**
 * Point d'entrée pour les requêtes POST Web App.
 */
function doPost(e) {
  // TODO: Migrer doPost vers Router si nécessaire, pour l'instant on garde la logique existante
  // ou on l'encapsule dans un handler spécifique.
  // Pour la compatibilité immédiate, on garde le code legacy ici ou on l'adapte.
  // Le plan demandait "Router.gs" donc on suppose que Router gère aussi POST ou on fait un dispatch spécifique.

  // Ici on laisse le legacy doPost mais nettoyé, ou on délègue.
  return legacyDoPost(e);
}


// =================================================================
//                   CONFIGURATION DES ROUTES
// =================================================================

function registerRoutes_() {
  // Admin
  Router.add('admin', handleAdminPage_);



  // Gestion Client
  Router.add('gestion', handleGestionPage_);

  // Debug & Infos
  Router.add('debug', handleDebugPage_);
  Router.add('infos', handleInfosPage_);
  Router.add('mentions', handleMentionsPage_);
  Router.add('cgv', handleCgvPage_);
  Router.add('regles', handleReglesPage_);

  // Piluleur
  Router.add('piluleur', handlePiluleurPage_);

  // Accueil
  Router.add('accueil', renderReservationInterface);
  Router.add('home', renderReservationInterface);
  Router.add('index', renderReservationInterface);
  Router.add('reservation', renderReservationInterface);

  // Mobile Widget
  Router.add('mobile', handleMobilePage_);
  Router.add('widget', handleMobilePage_);
}

// =================================================================
//                   HANDLERS (LEGACY ADAPTÉS)
// =================================================================

// Les handlers sont repris de l'ancien Code.js mais peuvent utiliser Auth.gs maintenant.

function handleAdminPage_(e) {
  if (Auth.isAdmin(e)) {
    const templateAdmin = HtmlService.createTemplateFromFile('Admin_Interface');
    return templateAdmin.evaluate()
      .setTitle('Tableau de Bord Administrateur')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
  }
  return creerReponseHtml(
    'Accès Refusé',
    'Authentification administrateur requise. Utilisez un lien signé valide ou connectez-vous avec le compte administrateur.'
  );
}

// ... Les autres handlers (handleGestionPage_, etc.) sont référencés ici.

function handleGestionPage_(e) {
  const params = e && e.parameter ? e.parameter : {};

  if (!isFlagEnabled_('CLIENT_PORTAL_ENABLED')) {
    return creerReponseHtml('Espace client indisponible', 'Merci de votre compréhension.');
  }

  if (isFlagEnabled_('CLIENT_PORTAL_SIGNED_LINKS')) {
    const email = String(params.email || '').trim();
    const exp = String(params.exp || '').trim();
    const sig = String(params.sig || '').trim();

    // Si des paramètres sont fournis, on valide strictement le lien.
    if (email || exp || sig) {
      if (!Auth.verifyToken(email, exp, sig)) {
        const debugInfo = `Email: ${email}, Exp: ${exp}, Sig: ${sig ? sig.substring(0, 10) + '...' : 'None'}`;
        Logger.log(`Lien invalide debug: ${debugInfo}`);
        return creerReponseHtml('Lien invalide (Debug)', `Le lien ne semble pas valide. Détails techniques : ${debugInfo}. Veuillez demander un nouveau lien.`);
      }
    }
    // Si AUCUN paramètre n'est fourni, on laisse passer : la page JS affichera le formulaire de connexion (#non-connecte).
  }

  const templateGestion = HtmlService.createTemplateFromFile('Client_Espace');
  templateGestion.params = params;
  templateGestion.ADMIN_EMAIL = (typeof ADMIN_EMAIL !== 'undefined') ? ADMIN_EMAIL : '';
  const embedMode = String(params.embed || '') === '1';
  templateGestion.EMBED_MODE = embedMode;
  // Passer les constantes de configuration explicitement pour éviter les erreurs de référence dans le template
  templateGestion.CLIENT_SESSION_OPAQUE_ID_ENABLED = (typeof CLIENT_SESSION_OPAQUE_ID_ENABLED !== 'undefined') ? CLIENT_SESSION_OPAQUE_ID_ENABLED : false;
  templateGestion.CLIENT_SESSION_TTL_HOURS = (typeof CLIENT_SESSION_TTL_HOURS !== 'undefined') ? CLIENT_SESSION_TTL_HOURS : 24;
  templateGestion.CLIENT_ID_CARTOON_NAMES = (typeof CLIENT_ID_CARTOON_NAMES !== 'undefined') ? CLIENT_ID_CARTOON_NAMES : [];
  // Deploy Check: 205
  const sortieGestion = templateGestion.evaluate().setTitle('Mon Espace Client');
  return sortieGestion.setXFrameOptionsMode(
    embedMode ? HtmlService.XFrameOptionsMode.ALLOWALL : HtmlService.XFrameOptionsMode.DEFAULT
  );
}

function handleDebugPage_(e) {
  if (!isFlagEnabled_('DEBUG_MENU_ENABLED')) {
    return creerReponseHtml('Accès Refusé', 'Le mode de débogage est désactivé.');
  }
  if (Auth.isAdmin(e)) {
    return HtmlService.createHtmlOutputFromFile('Debug_Interface').setTitle('Panneau de Débogage');
  }
  return creerReponseHtml(
    'Accès Refusé',
    'Le panneau de débogage n\'est accessible qu\'avec un accès administrateur signé.'
  );
}

function handleInfosPage_() {
  if (typeof PRIVACY_LINK_ENABLED !== 'undefined' && PRIVACY_LINK_ENABLED) {
    const templateInfos = HtmlService.createTemplateFromFile('Infos_confidentialite');
    return templateInfos.evaluate()
      .setTitle('Infos & confidentialité')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
  }
  return renderReservationInterface();
}

function handleMentionsPage_() {
  if (typeof LEGAL_NOTICE_LINK_ENABLED !== 'undefined' && LEGAL_NOTICE_LINK_ENABLED) {
    const templateMentions = HtmlService.createTemplateFromFile('Mentions_Legales');
    return templateMentions.evaluate()
      .setTitle('Mentions légales')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
  }
  return renderReservationInterface();
}

function handlePiluleurPage_(e) {
  const params = (e && e.parameter) || {};
  const imageId = params.imageId || null;
  const imageUrl = params.imageUrl || null;
  // openPiluleurInterface doit être défini ailleurs (Chat_Piluleur.gs ou autre)
  if (typeof openPiluleurInterface === 'function') {
    return openPiluleurInterface(imageId, imageUrl);
  }
  return HtmlService.createHtmlOutput('Module Piluleur introuvable');
}

function handleMobilePage_(e) {
  // Optionnel: Vérifier Auth ici si on veut restreindre l'accès
  // if (!Auth.isAdmin(e)) return creerReponseHtml("Accès Interdit", "Admin seulement");

  const template = HtmlService.createTemplateFromFile('Mobile_Hub');
  return template.evaluate()
    .setTitle('ELS Mobile Widget')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL); // Pour permettre l'iframe si nécessaire
}

function getBroadcastVersion() {
  try {
    if (typeof BUILD_TIMESTAMP !== 'undefined') {
      return BUILD_TIMESTAMP;
    }
  } catch (e) {
    // Variable non définie
  }
  return 'Dev / Unknown';
}

function handleCgvPage_() {
  const templateCgv = HtmlService.createTemplateFromFile('CGV');
  templateCgv.appUrl = ScriptApp.getService().getUrl();
  templateCgv.nomService = typeof NOM_ENTREPRISE !== 'undefined' ? NOM_ENTREPRISE : 'ELS';
  templateCgv.emailEntreprise = typeof EMAIL_ENTREPRISE !== 'undefined' ? EMAIL_ENTREPRISE : '';
  templateCgv.brandingLogoPublicUrl = typeof BRANDING_LOGO_PUBLIC_URL !== 'undefined' ? BRANDING_LOGO_PUBLIC_URL : '';
  return templateCgv.evaluate()
    .setTitle(templateCgv.nomService + ' | CGV')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

function handleReglesPage_() {
  const template = HtmlService.createTemplateFromFile('Regles_Utilisation');
  return template.evaluate()
    .setTitle((typeof NOM_ENTREPRISE !== 'undefined' ? NOM_ENTREPRISE : 'ELS') + ' | Règles d\'utilisation')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

// =================================================================
//                 LEGACY POST (ADAPTÉ)
// =================================================================

// =================================================================
//                 LEGACY POST (ADAPTÉ)
// =================================================================

function legacyDoPost(e) {
  try {
    const event = normalizeEvent_(e);
    ensureConfigurationValidated_();

    if (isFlagEnabled_('REQUEST_LOGGING_ENABLED') && isCallable_('logRequest')) {
      logRequest(event);
    }

    if (typeof POST_ENDPOINT_ENABLED === 'undefined' || !POST_ENDPOINT_ENABLED) {
      return respondJson_({ status: 'error', message: 'POST endpoint is disabled.' });
    }

    let payload = {};
    if (event.postData && event.postData.contents) {
      try {
        if (event.postData.type === 'application/json') {
          payload = JSON.parse(event.postData.contents);
        } else {
          payload = event.parameter;
        }
      } catch (_jsonError) {
        return respondJson_({ status: 'error', message: 'Invalid JSON payload.' });
      }
    } else {
      payload = event.parameter;
    }

    if (payload && payload.action) {
      switch (payload.action) {
        case 'getConfiguration':
          return respondJson_(getConfiguration());
        case 'securityReport':
          // Integration Agent Sentinel
          if (typeof receiveSecurityReport === 'function') {
            return respondJson_(receiveSecurityReport(payload));
          }
          return respondJson_({ status: 'error', message: 'receiveSecurityReport function not found.' });
        case 'nouvelleReservation':
          // Integration Mediconvoi Vitrine
          if (typeof reserverPanier === 'function') {
            return respondJson_(reserverPanier(payload));
          }
          return respondJson_({ status: 'error', message: 'reserverPanier function not found.' });

        // --- V2 DELIVERY APP ROUTES ---
        case 'getTournee':
          if (typeof api_getTournee === 'function') {
            return respondJson_(api_getTournee(payload.email));
          }
          return respondJson_({ status: 'error', message: 'api_getTournee missing' });

        case 'saveLivraisonReport':
          if (typeof api_saveLivraisonReport === 'function') {
            return respondJson_(api_saveLivraisonReport(payload));
          }
          return respondJson_({ status: 'error', message: 'api_saveLivraisonReport missing' });

        default:
          return respondJson_({ status: 'error', message: 'Unknown action specified.' });
      }
    }

    return respondJson_({ status: 'error', message: 'No action specified in the POST request.' });
  } catch (error) {
    Logger.log('Erreur critique dans doPost: ' + error.stack);
    // Security: Do not leak stack trace to the user
    return respondJson_({ status: 'error', message: 'Internal Server Error' });
  }
}

// =================================================================
//                 RENDERING INTERFACE RÉSERVATION
// =================================================================
// Copie telle quelle de l'original pour maintenir la compatibilité

function renderReservationInterface() {
  if (isFlagEnabled_('DEMO_RESERVATION_ENABLED')) {
    return HtmlService.createHtmlOutputFromFile('examples/Reservation_Demo')
      .setTitle((typeof NOM_ENTREPRISE !== 'undefined' ? NOM_ENTREPRISE : 'ELS') + ' | Réservation (Démo)')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
  }

  const template = HtmlService.createTemplateFromFile('Reservation_Interface');
  const conf = getPublicConfig();

  const serviceUrl = ScriptApp.getService().getUrl();
  template.appUrl = serviceUrl;
  template.nomService = NOM_ENTREPRISE;
  template.EMAIL_ENTREPRISE = EMAIL_ENTREPRISE;
  template.CLIENT_PORTAL_ENABLED = CLIENT_PORTAL_ENABLED;
  template.TARIFS_JSON = JSON.stringify(conf.TARIFS || {}).replace(/</g, '\\u003c');
  template.TARIFS = conf.TARIFS;
  template.PRICING_RULES_V2_JSON = JSON.stringify(conf.PRICING_RULES_V2 || {}).replace(/</g, '\\u003c');
  template.PRICING_RULES_V2 = conf.PRICING_RULES_V2;
  template.PRICING_MATRIX_JSON = JSON.stringify(getClientPricingMatrix(30) || {}).replace(/</g, '\\u003c');

  // Utilisation de Utilitaires si disponibles
  const logoDataUrl = (typeof getLogoDataUrl === 'function') ? getLogoDataUrl() : '';
  const logoPublicUrl = (typeof getLogoPublicUrl === 'function') ? getLogoPublicUrl() : '';
  const heroImages = (typeof buildReservationHeroImages === 'function') ? buildReservationHeroImages() : {};

  template.logoDataUrl = logoDataUrl;
  template.logoPublicUrl = logoPublicUrl;
  template.heroImages = heroImages;
  template.heroAssetsJson = JSON.stringify({ logo: logoDataUrl || null, hero: heroImages || {} }).replace(/</g, '\\u003c');

  // Sécurisation des valeurs numériques avec fallback pour éviter les crash syntaxiques JS
  template.DUREE_BASE = (conf.DUREE_BASE !== undefined && conf.DUREE_BASE !== null) ? conf.DUREE_BASE : 30;
  template.DUREE_ARRET_SUP = (conf.DUREE_ARRET_SUP !== undefined && conf.DUREE_ARRET_SUP !== null) ? conf.DUREE_ARRET_SUP : 15;
  template.KM_BASE = (conf.KM_BASE !== undefined && conf.KM_BASE !== null) ? conf.KM_BASE : 10;
  template.KM_ARRET_SUP = (conf.KM_ARRET_SUP !== undefined && conf.KM_ARRET_SUP !== null) ? conf.KM_ARRET_SUP : 5;
  template.URGENT_THRESHOLD_MINUTES = (conf.URGENT_THRESHOLD_MINUTES !== undefined && conf.URGENT_THRESHOLD_MINUTES !== null) ? conf.URGENT_THRESHOLD_MINUTES : 45;

  template.dateDuJour = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  template.PRICING_RULES_V2_ENABLED = (typeof PRICING_RULES_V2_ENABLED !== 'undefined') ? PRICING_RULES_V2_ENABLED : false;
  template.RETURN_IMPACTS_ESTIMATES_ENABLED = (typeof RETURN_IMPACTS_ESTIMATES_ENABLED !== 'undefined') ? RETURN_IMPACTS_ESTIMATES_ENABLED : false;

  template.heureDebut = conf.HEURE_DEBUT_SERVICE || "08:00";
  template.heureFin = conf.HEURE_FIN_SERVICE || "20:00";
  template.prixBaseNormal = (conf.TARIFS && conf.TARIFS['Normal']) ? (conf.TARIFS['Normal'].base || 0) : 0;
  template.prixBaseSamedi = (conf.TARIFS && conf.TARIFS['Samedi']) ? (conf.TARIFS['Samedi'].base || 0) : 0;
  template.prixBaseUrgent = (conf.TARIFS && conf.TARIFS['Urgent']) ? (conf.TARIFS['Urgent'].base || 0) : 0;
  template.tvaApplicable = typeof conf.TVA_APPLICABLE !== 'undefined' ? conf.TVA_APPLICABLE : false;

  // Variables manquantes pour éviter 'Unexpected token'
  template.TARIFS_DETAILLE_ENABLED = (typeof conf.TARIFS_DETAILLE_ENABLED !== 'undefined') ? conf.TARIFS_DETAILLE_ENABLED : true;
  template.FORFAIT_RESIDENT_ENABLED = (typeof conf.FORFAIT_RESIDENT_ENABLED !== 'undefined') ? conf.FORFAIT_RESIDENT_ENABLED : false;
  template.FORFAIT_RESIDENT = conf.FORFAIT_RESIDENT || { STANDARD_PRICE: 0, URGENCE_PRICE: 0, DURATION_HOURS: 0 };
  template.RESIDENT_AFFILIATION_REQUIRED = (typeof conf.RESIDENT_AFFILIATION_REQUIRED !== 'undefined') ? conf.RESIDENT_AFFILIATION_REQUIRED : false;

  // Variables de Session Client (Fix CRASH JS)
  template.CLIENT_SESSION_OPAQUE_ID_ENABLED = (typeof CLIENT_SESSION_OPAQUE_ID_ENABLED !== 'undefined') ? CLIENT_SESSION_OPAQUE_ID_ENABLED : false;
  template.CLIENT_SESSION_TTL_HOURS = (typeof CLIENT_SESSION_TTL_HOURS !== 'undefined') ? CLIENT_SESSION_TTL_HOURS : 24;
  template.CLIENT_ID_CARTOON_NAMES = (typeof CLIENT_ID_CARTOON_NAMES !== 'undefined') ? CLIENT_ID_CARTOON_NAMES : [];

  return template.evaluate()
    .setTitle(NOM_ENTREPRISE + ' | Réservation')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}


// =================================================================
//                             HELPERS REQUIS
// =================================================================

function hasFullAuthorization_(event) {
  try {
    if (event && typeof event.authMode !== 'undefined' && ScriptApp && ScriptApp.AuthMode) {
      if (event.authMode === ScriptApp.AuthMode.LIMITED || event.authMode === ScriptApp.AuthMode.NONE) {
        return false;
      }
    }
    if (ScriptApp && ScriptApp.getAuthorizationInfo && ScriptApp.AuthMode && ScriptApp.AuthorizationStatus) {
      const info = ScriptApp.getAuthorizationInfo(ScriptApp.AuthMode.FULL);
      if (info && typeof info.getAuthorizationStatus === 'function') {
        return info.getAuthorizationStatus() !== ScriptApp.AuthorizationStatus.REQUIRED;
      }
    }
  } catch (authErr) {
    Logger.log('hasFullAuthorization_ check failed: ' + authErr);
  }
  return true;
}

function menuGenererLienClient() {
  const ui = SpreadsheetApp.getUi();
  const emailResp = ui.prompt('Email client');
  if (emailResp.getSelectedButton() !== ui.Button.OK) return;
  const email = emailResp.getResponseText();
  // Utilisation de Auth.generateToken
  try {
    const token = Auth.generateToken(email, 168 * 3600); // 1 semaine
    ui.showModalDialog(HtmlService.createHtmlOutput(token.url).setWidth(600).setHeight(100), 'Lien');
  } catch (e) {
    ui.alert('Erreur: ' + e.message);
  }
}

// Les autres helpers du menu (menuVerifierInstallation, etc.) doivent être définis
// ou importés via l'environnement Apps Script (ils sont dans d'autres fichiers ou en bas de l'ancien fichier).
// Pour simplifier, je suppose que les fonctions globales (provisionnerBaseEtablissements, etc.) sont disponibles.

function creerReponseHtml(titre, message) {
  return HtmlService.createHtmlOutput(`<h1>${titre}</h1><p>${message}</p>`).setTitle(titre);
}

function normalizeEvent_(e) {
  const event = e && typeof e === 'object' ? e : {};
  if (!event.parameter || typeof event.parameter !== 'object') {
    event.parameter = {};
  }
  if (!event.headers || typeof event.headers !== 'object') {
    event.headers = {};
  }
  if (!event.postData || typeof event.postData !== 'object') {
    event.postData = null;
  }
  return event;
}

// ===================================
// WRAPPERS AGENTS (NOUVEAUX)
// ===================================

function menuRunArchitect() {
  runAgentWrapper_('architect', 'Architecte');
}

function menuRunBilling() {
  runAgentWrapper_('billing', 'Billing');
}

function menuRunBolt() {
  runAgentWrapper_('bolt', 'Bolt');
}

function menuRunClientExpert() {
  runAgentWrapper_('client_expert', 'Client Expert (Expert QA)');
}

function menuRunCloudflare() {
  runAgentWrapper_('cloudflare', 'Cloudflare', true); // Modal car rapport long
}

function menuRunGuardian() {
  runAgentWrapper_('guardian', 'Guardian');
}

function menuRunMechanic() {
  runAgentWrapper_('mechanic', 'Mechanic');
}

function menuRunPalette() {
  runAgentWrapper_('palette', 'Palette');
}

function menuRunScribe() {
  runAgentWrapper_('scribe', 'Scribe');
}

function menuRunValiderConfigAgent() {
  // Helper pour valider la config si besoin, ou setup
  if (typeof checkSetup_ELS === 'function') {
    const res = checkSetup_ELS();
    SpreadsheetApp.getUi().alert("Setup Check : " + JSON.stringify(res));
  } else {
    SpreadsheetApp.getActive().toast("Fonction checkSetup_ELS manquante.");
  }
}


/**
 * Helper générique pour lancer un agent et afficher le résultat.
 * @param {string} agentId - ID de l'agent (ex: 'bolt')
 * @param {string} displayName - Nom affiché
 * @param {boolean} forceModal - Si true, utilise une modale plutôt qu'un toast/alert
 */
function runAgentWrapper_(agentId, displayName, forceModal) {
  SpreadsheetApp.getActive().toast("Démarrage de l'agent " + displayName + "...", "Agents ELS", 3);

  // On suppose que apiRunAgent est disponible globalement (Agent_Dashboard.js)
  let result = "Fonction apiRunAgent introuvable.";
  if (typeof apiRunAgent === 'function') {
    result = apiRunAgent(agentId);
  }

  // Affichage
  if (forceModal || (result && result.length > 300)) {
    const html = HtmlService.createHtmlOutput('<pre style="white-space: pre-wrap; font-family: monospace; font-size: 11px;">' + result + '</pre>')
      .setWidth(700)
      .setHeight(500);
    SpreadsheetApp.getUi().showModalDialog(html, 'Rapport : ' + displayName);
  } else {
    SpreadsheetApp.getUi().alert(displayName, result, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}


function respondJson_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload || {}))
    .setMimeType(ContentService.MimeType.JSON);
}

function safeToast_(message, title, seconds) {
  try {
    SpreadsheetApp.getActive().toast(message, title || '', seconds || 5);
  } catch (_e) { /* ignore */ }
}

function isCallable_(name) {
  try { return typeof this[name] === 'function'; } catch (_err) { return false; }
}

function isFlagEnabled_(flagName) {
  try {
    // Tentative d'accès via 'this' (pour var/function)
    if (typeof this[flagName] !== 'undefined') return Boolean(this[flagName]);
    // Fallback via eval pour les const/let globales (V8)
    return Boolean(eval(flagName));
  } catch (_err) { return false; }
}

function ensureConfigurationValidated_() {
  if (typeof validerConfiguration === 'function') validerConfiguration();
}

function safeCheckSetup_() {
  try {
    if (isCallable_('checkSetup_ELS')) {
      return checkSetup_ELS();
    }
  } catch (err) {
    Logger.log('checkSetup_ELS erreur: ' + err.message);
  }
  return { ok: true, missingProps: [] };
}

/**
 * Récupère le contenu du loader Google Charts (proxy).
 * Appelée uniquement par le client via GoogleChartsStub.
 */
function fetchGoogleChartsLoader() {
  const url = 'https://www.gstatic.com/charts/loader.js';
  return UrlFetchApp.fetch(url).getContentText();
}
