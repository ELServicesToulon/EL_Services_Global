/**
 * @fileoverview Contrôleur principal de l'application Projet_ELS.
 * Gère la création des menus, le routage web (doGet/doPost) et quelques utilitaires
 * utilisés dans les templates.
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
    .addSeparator()
    .addItem("Nettoyer l'onglet Facturation", 'nettoyerOngletFacturation')
    .addItem('Reparer entetes Facturation', 'reparerEntetesFacturation')
    .addItem('Normaliser entetes Facturation', 'normaliserEntetesFacturation');

  menuPrincipal
    .addSubMenu(menuFacturation)
    .addSubMenu(menuMaintenance)
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

/**
 * Vérifie si le script dispose des autorisations complètes.
 * @param {Object} event - Événement Apps Script (optionnel).
 * @returns {boolean}
 */
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

// =================================================================
//                         MENUS & ACTIONS
// =================================================================

/**
 * Menu: Génère un lien signé pour l'Espace Client (admin requis).
 */
function menuGenererLienClient() {
  const ui = SpreadsheetApp.getUi();
  try {
    if (!isFlagEnabled_('CLIENT_PORTAL_SIGNED_LINKS')) {
      ui.alert('Fonction indisponible', 'CLIENT_PORTAL_SIGNED_LINKS est désactivé dans la configuration.', ui.ButtonSet.OK);
      return;
    }

    const emailResp = ui.prompt('Générer lien Espace Client', 'Email du client:', ui.ButtonSet.OK_CANCEL);
    if (emailResp.getSelectedButton() !== ui.Button.OK) return;
    const email = String(emailResp.getResponseText() || '').trim();
    if (!email) {
      ui.alert('Erreur', 'Email requis.', ui.ButtonSet.OK);
      return;
    }

    const hoursResp = ui.prompt('Validité du lien', 'Durée en heures (défaut 168):', ui.ButtonSet.OK_CANCEL);
    if (hoursResp.getSelectedButton() !== ui.Button.OK) return;
    const hours = parseInt(hoursResp.getResponseText() || '168', 10);

    const res = genererLienEspaceClient(email, isNaN(hours) ? 168 : hours);
    const sanitizedUrl = sanitizeForHtml_(res.url || '');
    const html = HtmlService.createHtmlOutput(
      `<div style="font-family:Montserrat,sans-serif;line-height:1.5">
         <h3>Lien Espace Client</h3>
         <p>Ce lien expire à: ${new Date(res.exp * 1000).toLocaleString()}</p>
         <input id="l" type="text" value="${sanitizedUrl}" style="width:100%" readonly />
         <div style="margin-top:8px"><button onclick="copy()">Copier</button></div>
         <script>
           function copy(){var i=document.getElementById('l');i.select();try{document.execCommand('copy');}catch(e){} }
         </script>
       </div>`
    ).setWidth(520).setHeight(160);
    ui.showModalDialog(html, 'Lien Espace Client');
  } catch (e) {
    ui.alert('Erreur', e.message, ui.ButtonSet.OK);
  }
}

/**
 * Menu: Vérifie l'installation via checkSetup_ELS.
 */
function menuVerifierInstallation() {
  const ui = SpreadsheetApp.getUi();
  const result = safeCheckSetup_();
  Logger.log(JSON.stringify(result));
  const message = result.ok ? 'OK' : 'Propriétés manquantes: ' + result.missingProps.join(', ');
  ui.alert('Vérification installation', message, ui.ButtonSet.OK);
}

/**
 * Crée une réponse HTML standard pour les messages d'erreur ou d'information.
 * @param {string} titre - Titre de la page.
 * @param {string} message - Message à afficher.
 * @returns {HtmlOutput}
 */
function creerReponseHtml(titre, message) {
  return HtmlService.createHtmlOutput(`<h1>${titre}</h1><p>${message}</p>`).setTitle(titre);
}

/**
 * Vérifie si la requête possède les droits administrateur soit via l'utilisateur actif,
 * soit via un lien signé associé à l'adresse email administrateur.
 * @param {Object} e - Paramètres de la requête.
 * @returns {boolean}
 */
function hasAdminAccess(e) {
  const adminEmail = (typeof ADMIN_EMAIL === 'string') ? ADMIN_EMAIL.toLowerCase() : '';
  if (!adminEmail) {
    return false;
  }

  try {
    const activeUser = Session.getActiveUser();
    if (activeUser) {
      const email = activeUser.getEmail();
      if (email && email.toLowerCase() === adminEmail) {
        return true;
      }
    }
  } catch (_err) {
    // Ignorer et reposer sur les paramètres signés.
  }

  const params = (e && e.parameter) || {};
  const emailParam = String(params.email || '').trim().toLowerCase();
  if (!emailParam || emailParam !== adminEmail) {
    return false;
  }
  const exp = params.exp || '';
  const sig = params.sig || '';
  if (isCallable_('verifySignedLink') && sig && exp) {
    try {
      return verifySignedLink(emailParam, exp, sig);
    } catch (_err) {
      return false;
    }
  }

  return false;
}

// =================================================================
//                        ROUTAGE HTTP (GET)
// =================================================================

/**
 * S'exécute lorsqu'un utilisateur accède à l'URL de l'application web.
 * Fait office de routeur pour afficher la bonne page.
 * @param {Object} e - L'objet d'événement de la requête.
 * @returns {HtmlOutput}
 */
function doGet(e) {
  try {
    const setup = safeCheckSetup_();
    if (setup.missingProps && setup.missingProps.length > 0) {
      return HtmlService.createHtmlOutput(
        `<h1>Configuration manquante</h1><p>Propriétés manquantes: ${setup.missingProps.join(', ')}</p>`
      ).setTitle('Configuration manquante');
    }

    const params = (e && e.parameter) || {};
    const page = params.page ? String(params.page) : '';

    if (isFlagEnabled_('REQUEST_LOGGING_ENABLED') && isCallable_('logRequest')) {
      logRequest(e);
    }

    const handler = getPageHandler_(page);
    if (handler) {
      return handler(e, params);
    }

    return renderReservationInterface();
  } catch (error) {
    if (error && error.code === 403) {
      return ContentService.createTextOutput(JSON.stringify({ error: 'Forbidden' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    Logger.log('Erreur critique dans doGet: ' + error.stack);
    return creerReponseHtml(
      'Erreur de configuration',
      `L'application ne peut pas démarrer. L'administrateur a été notifié.<br><pre style="color:red;">${error.message}</pre>`
    );
  }
}

/**
 * Retourne le handler de page approprié.
 * @param {string} page
 * @returns {function(Object, Object):HtmlOutput|undefined}
 */
function getPageHandler_(page) {
  switch (page) {
    case 'admin':
      return handleAdminPage_;
    case 'livraison':
    case 'livreur':
    case 'tesla-livraison':
    case 'tesla_livraison':
      return handleLivraisonPage_;
    case 'tesla':
    case 'tesla_livreur':
    case 'tesla_juniper':
      return handleTeslaLivreurPage_;
    case 'gestion':
      return handleGestionPage_;
    case 'debug':
      return handleDebugPage_;
    case 'infos':
      return handleInfosPage_;
    case 'mentions':
      return handleMentionsPage_;
    case 'piluleur':
      return handlePiluleurPage_;
    case 'cgv':
      return handleCgvPage_;
    case 'accueil':
    case 'home':
    case 'index':
    case 'reservation':
      return renderReservationInterface;
    default:
      return undefined;
  }
}

function handleAdminPage_(e) {
  if (hasAdminAccess(e)) {
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

function handleLivraisonPage_(e) {
  if (isCallable_('renderTeslaLivraisonInterface')) {
    return renderTeslaLivraisonInterface(e);
  }
  return handleTeslaLivreurPage_(e);
}

function handleTeslaLivreurPage_(e) {
  var template = HtmlService.createTemplateFromFile('Tesla_Livreur_Interface');
  template.pageTitle = 'Tesla Junyper - ELS';
  var output = template.evaluate().setTitle('Tesla Junyper - ELS');
  return output.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function handleGestionPage_(e, params) {
  if (!isFlagEnabled_('CLIENT_PORTAL_ENABLED')) {
    return creerReponseHtml('Espace client indisponible', 'Merci de votre compréhension.');
  }

  const safeParams = params || {};
  if (isFlagEnabled_('CLIENT_PORTAL_SIGNED_LINKS')) {
    const emailRaw = String(safeParams.email || '').trim();
    const emailParam = emailRaw.toLowerCase();
    const exp = safeParams.exp || '';
    const sig = safeParams.sig || '';
    if (!verifySignedLink(emailParam, exp, sig)) {
      return creerReponseHtml('Lien invalide', 'Authentification requise pour accéder à l\'espace client.');
    }
  }

  const templateGestion = HtmlService.createTemplateFromFile('Client_Espace');
  templateGestion.ADMIN_EMAIL = ADMIN_EMAIL;
  const embedMode = String(safeParams.embed || '') === '1';
  templateGestion.EMBED_MODE = embedMode;
  const sortieGestion = templateGestion.evaluate().setTitle('Mon Espace Client');
  return sortieGestion.setXFrameOptionsMode(
    embedMode ? HtmlService.XFrameOptionsMode.ALLOWALL : HtmlService.XFrameOptionsMode.DEFAULT
  );
}

function handleDebugPage_(e) {
  if (!isFlagEnabled_('DEBUG_MENU_ENABLED')) {
    return creerReponseHtml('Accès Refusé', 'Le mode de débogage est désactivé.');
  }
  if (hasAdminAccess(e)) {
    return HtmlService.createHtmlOutputFromFile('Debug_Interface').setTitle('Panneau de Débogage');
  }
  return creerReponseHtml(
    'Accès Refusé',
    'Le panneau de débogage n\'est accessible qu\'avec un accès administrateur signé.'
  );
}

function handleInfosPage_() {
  if (isFlagEnabled_('PRIVACY_LINK_ENABLED')) {
    const templateInfos = HtmlService.createTemplateFromFile('Infos_confidentialite');
    return templateInfos.evaluate()
      .setTitle('Infos & confidentialité')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
  }
  return renderReservationInterface();
}

function handleMentionsPage_() {
  if (isFlagEnabled_('LEGAL_NOTICE_LINK_ENABLED')) {
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
  return openPiluleurInterface(imageId, imageUrl);
}

function handleCgvPage_() {
  const templateCgv = HtmlService.createTemplateFromFile('CGV');
  templateCgv.appUrl = ScriptApp.getService().getUrl();
  templateCgv.nomService = NOM_ENTREPRISE;
  templateCgv.emailEntreprise = EMAIL_ENTREPRISE;
  templateCgv.brandingLogoPublicUrl = BRANDING_LOGO_PUBLIC_URL;
  return templateCgv.evaluate()
    .setTitle(NOM_ENTREPRISE + ' | CGV')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

// =================================================================
//                 RENDERING INTERFACE RÉSERVATION
// =================================================================

function renderReservationInterface() {
  if (isFlagEnabled_('DEMO_RESERVATION_ENABLED')) {
    return HtmlService.createHtmlOutputFromFile('examples/Reservation_Demo')
      .setTitle(NOM_ENTREPRISE + ' | Réservation (Démo)')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
  }

  const template = HtmlService.createTemplateFromFile('Reservation_Interface');
  const conf = getPublicConfig();

  const serviceUrl = ScriptApp.getService().getUrl();
  const livreurAppUrl = (conf && conf.LIVRAISON_WEBAPP_URL && conf.LIVRAISON_WEBAPP_URL.length)
    ? conf.LIVRAISON_WEBAPP_URL
    : (serviceUrl ? serviceUrl + '?page=livraison' : '');
  template.appUrl = serviceUrl;
  template.livreurAppUrl = livreurAppUrl;
  template.nomService = NOM_ENTREPRISE;
  template.EMAIL_ENTREPRISE = EMAIL_ENTREPRISE;
  template.CLIENT_PORTAL_ENABLED = CLIENT_PORTAL_ENABLED;
  template.TARIFS_JSON = JSON.stringify(conf.TARIFS || {});
  template.TARIFS = conf.TARIFS;
  template.PRICING_RULES_V2_JSON = JSON.stringify(conf.PRICING_RULES_V2 || {});
  template.PRICING_RULES_V2 = conf.PRICING_RULES_V2;
  template.PRICING_MATRIX_JSON = JSON.stringify(getClientPricingMatrix(30) || {});
  const logoDataUrl = getLogoDataUrl();
  const logoPublicUrl = getLogoPublicUrl();
  const heroImages = buildReservationHeroImages();
  template.logoDataUrl = logoDataUrl;
  template.logoPublicUrl = logoPublicUrl;
  template.heroImages = heroImages;
  template.heroAssetsJson = JSON.stringify({ logo: logoDataUrl || null, hero: heroImages || {} }).replace(/</g, '\\u003c');
  template.DUREE_BASE = conf.DUREE_BASE;
  template.DUREE_ARRET_SUP = conf.DUREE_ARRET_SUP;
  template.KM_BASE = conf.KM_BASE;
  template.KM_ARRET_SUP = conf.KM_ARRET_SUP;
  template.URGENT_THRESHOLD_MINUTES = conf.URGENT_THRESHOLD_MINUTES;
  template.dateDuJour = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  template.PRICING_RULES_V2_ENABLED = (typeof PRICING_RULES_V2_ENABLED !== 'undefined') ? PRICING_RULES_V2_ENABLED : false;
  template.RETURN_IMPACTS_ESTIMATES_ENABLED = (typeof RETURN_IMPACTS_ESTIMATES_ENABLED !== 'undefined') ? RETURN_IMPACTS_ESTIMATES_ENABLED : false;

  template.heureDebut = conf.HEURE_DEBUT_SERVICE;
  template.heureFin = conf.HEURE_FIN_SERVICE;
  template.prixBaseNormal = (conf.TARIFS && conf.TARIFS['Normal']) ? conf.TARIFS['Normal'].base : '';
  template.prixBaseSamedi = (conf.TARIFS && conf.TARIFS['Samedi']) ? conf.TARIFS['Samedi'].base : '';
  template.prixBaseUrgent = (conf.TARIFS && conf.TARIFS['Urgent']) ? conf.TARIFS['Urgent'].base : '';
  template.tvaApplicable = typeof conf.TVA_APPLICABLE !== 'undefined' ? conf.TVA_APPLICABLE : false;

  return template.evaluate()
    .setTitle(NOM_ENTREPRISE + ' | Réservation')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

function buildReservationHeroImages() {
  const files = {
    banner: 'Hero_ElsBanner_b64',
    tours: 'Hero_ElesTournees_b64',
    logistics: 'Hero_VotreLogistique_b64',
    care: 'Hero_OfficinesInfirmeries_b64'
  };
  const images = {};
  Object.keys(files).forEach(function(key) {
    images[key] = loadBase64ImageDataUri(files[key]);
  });
  return images;
}

function loadBase64ImageDataUri(partialName) {
  try {
    const template = HtmlService.createTemplateFromFile(partialName);
    let content = template.getCode();
    if (!content) {
      return '';
    }
    content = String(content).replace(/^\uFEFF/, '').trim();
    if (/^data:image\//i.test(content)) {
      return content;
    }
    const normalized = content.replace(/[\s\r\n]+/g, '');
    try {
      Utilities.base64Decode(normalized);
    } catch (_e) {
      if (!/^[A-Za-z0-9+/=]+$/.test(normalized)) {
        throw new Error('Contenu base64 invalide');
      }
    }
    return 'data:image/png;base64,' + normalized;
  } catch (err) {
    Logger.log('Asset manquant pour ' + partialName + ': ' + err.message);
    return '';
  }
}

function fetchGoogleChartsLoader() {
  const cache = CacheService.getScriptCache();
  const cacheKey = 'GOOGLE_CHARTS_LOADER_V1';
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }
  const response = UrlFetchApp.fetch('https://www.gstatic.com/charts/loader.js', { muteHttpExceptions: true });
  const status = response.getResponseCode();
  if (status === 200) {
    const content = response.getContentText();
    cache.put(cacheKey, content, 21600);
    return content;
  }
  throw new Error('Impossible de recuperer Google Charts loader (HTTP ' + status + ')');
}

// =================================================================
//                       ROUTAGE HTTP (POST)
// =================================================================

/**
 * Gère les requêtes POST entrantes.
 * Parse les données et route vers la logique appropriée.
 * @param {Object} e - Objet d'événement de la requête.
 * @returns {ContentService.TextOutput}
 */
function doPost(e) {
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
        throw new Error('Invalid JSON payload received.');
      }
    } else {
      payload = event.parameter;
    }

    if (payload && payload.action) {
      switch (payload.action) {
        case 'getConfiguration':
          return respondJson_(getConfiguration());
        default:
          return respondJson_({ status: 'error', message: 'Unknown action specified.' });
      }
    }

    return respondJson_({ status: 'error', message: 'No action specified in the POST request.' });
  } catch (error) {
    if (error && error.code === 403) {
      return ContentService.createTextOutput(JSON.stringify({ error: 'Forbidden' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    Logger.log('Erreur critique dans doPost: ' + error.stack);
    return respondJson_({ status: 'error', message: error.message });
  }
}

// =================================================================
//                             HELPERS
// =================================================================

/**
 * Force le consentement Gmail pour éviter des surprises en production.
 */
function _forceReAuth() {
  const draft = GmailApp.createDraft(Session.getActiveUser().getEmail(), 'ELS - Autorisation', 'Test d\'autorisations Gmail.');
  GmailApp.getDraft(draft.getId()).deleteDraft();
}

function testEnvoyerDevis() {
  envoyerDevisParEmail({
    client: { email: 'test@example.com', nom: 'Client Test' },
    items: [{ date: '2025-05-15', startTime: '10h00', details: 'Essai devis', prix: 120 }]
  });
}

function include(filename) {
  try {
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
  } catch (error) {
    Logger.log('Erreur lors de l\'inclusion du fichier ' + filename + ': ' + error.toString());
    return '';
  }
}

function includeTemplate(filename) {
  try {
    return HtmlService.createTemplateFromFile(filename).evaluate().getContent();
  } catch (error) {
    Logger.log('Erreur includeTemplate(' + filename + '): ' + error.toString());
    try {
      return include(filename);
    } catch (_err) {
      return '';
    }
  }
}

function getScriptUrl() {
  try {
    return ScriptApp.getService().getUrl();
  } catch (error) {
    Logger.log('Erreur getScriptUrl: ' + error.toString());
    return '';
  }
}

function getUserEmail() {
  try {
    return Session.getActiveUser().getEmail();
  } catch (error) {
    Logger.log('Erreur getUserEmail: ' + error.toString());
    return '';
  }
}

function testConnection() {
  return 'OK';
}

function isCallable_(name) {
  try {
    return typeof this[name] === 'function';
  } catch (_err) {
    return false;
  }
}

function isFlagEnabled_(flagName) {
  try {
    return Boolean(this[flagName]);
  } catch (_err) {
    return false;
  }
}

function sanitizeForHtml_(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}

function safeToast_(message, title, seconds) {
  try {
    SpreadsheetApp.getActive().toast(message, title || '', seconds || 5);
  } catch (_e) {
    // Toast facultatif.
  }
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

function respondJson_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload || {}))
    .setMimeType(ContentService.MimeType.JSON);
}

function ensureConfigurationValidated_() {
  if (isFlagEnabled_('CONFIG_CACHE_ENABLED')) {
    const cache = CacheService.getScriptCache();
    const lastValidated = cache.get('CONFIG_VALIDATED_AT');
    const now = Date.now();
    const stale = !lastValidated || (now - Number(lastValidated)) > 300000;
    if (stale) {
      validerConfiguration();
      cache.put('CONFIG_VALIDATED_AT', String(now), 600);
    }
    return;
  }
  validerConfiguration();
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
