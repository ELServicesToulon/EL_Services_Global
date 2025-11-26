/**
 * ELS - Point d'entree Apps Script (WebApp + menus Sheets)
 * - Menus Sheets (onOpen/onInstall)
 * - Routage des pages (public, espace client, admin, debug, piluleur)
 * - Service d'asset leger (?asset=theme.css)
 * - Healthcheck simple (?ping=1)
 * La logique metier reste dans les autres fichiers (Reservation.js, Gestion.js, etc.).
 */

// ---------------------------------------------------------------------------
// Menus Sheets
// ---------------------------------------------------------------------------

function onOpen(e) {
  const ui = SpreadsheetApp.getUi();
  const menuPrincipal = ui.createMenu('ELS');

  menuPrincipal
    .addItem('Generer les factures selectionnees', 'genererFactures')
    .addItem('Envoyer les factures controlees', 'envoyerFacturesControlees')
    .addItem('Archiver les factures du mois dernier', 'archiverFacturesDuMois')
    .addItem('Generer lien Espace Client', 'menuGenererLienClient')
    .addSeparator()
    .addItem('Verifier la coherence du calendrier', 'verifierCoherenceCalendrier');

  const sousMenuMaintenance = ui.createMenu('Maintenance')
    .addItem('Verifier l installation', 'menuVerifierInstallation')
    .addItem('Verifier structure des feuilles', 'menuVerifierStructureFeuilles')
    .addItem('Sauvegarder le code du projet', 'sauvegarderCodeProjet')
    .addItem('Sauvegarder les donnees', 'sauvegarderDonnees')
    .addItem('Purger les anciennes donnees (RGPD)', 'purgerAnciennesDonnees')
    .addSeparator()
    .addItem(\"Nettoyer l'onglet Facturation\", 'nettoyerOngletFacturation')
    .addItem('Reparer entetes Facturation', 'reparerEntetesFacturation')
    .addItem('Normaliser entetes Facturation', 'normaliserEntetesFacturation');

  if (isFlagEnabled_('CALENDAR_RESYNC_ENABLED')) {
    sousMenuMaintenance.addItem('Resynchroniser evenement manquant', 'menuResynchroniserEvenement');
  }
  if (isFlagEnabled_('CALENDAR_PURGE_ENABLED')) {
    sousMenuMaintenance.addItem('Purger Event ID introuvable', 'menuPurgerEventId');
  }
  menuPrincipal.addSubMenu(sousMenuMaintenance);

  if (isCallable_('genererDevisPdfDepuisSelection')) {
    menuPrincipal.addItem('Generer un devis (PDF) - selection', 'genererDevisPdfDepuisSelection');
  }
  menuPrincipal.addSeparator();
  menuPrincipal.addItem('Rafraichir le menu', 'onOpen');

  if (isFlagEnabled_('DEBUG_MENU_ENABLED')) {
    const sousMenuDebug = ui.createMenu('Debug')
      .addItem('Lancer tous les tests', 'lancerTousLesTests')
      .addItem('Tester audit Drive', 'testerAuditDrive')
      .addItem('Generer lien Espace Client', 'menuGenererLienClient');
    menuPrincipal.addSubMenu(sousMenuDebug);
  }

  menuPrincipal.addToUi();
  safeToast_('Menu ELS mis a jour', 'ELS', 5);

  const canValidate = hasFullAuthorization_(e);
  if (!canValidate) {
    safeToast_('Autorisations Apps Script requises pour valider la config. Lancez validerConfiguration() dans l IDE.', 'ELS', 10);
    return;
  }

  try {
    if (isCallable_('validerConfiguration')) {
      validerConfiguration();
    }
  } catch (err) {
    ui.alert('Configuration invalide', err.message, ui.ButtonSet.OK);
  }
}

function onInstall(e) {
  onOpen(e);
}

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
  try {
    if (!isFlagEnabled_('CLIENT_PORTAL_SIGNED_LINKS')) {
      ui.alert('Fonction indisponible', 'CLIENT_PORTAL_SIGNED_LINKS est desactive.', ui.ButtonSet.OK);
      return;
    }
    const emailResp = ui.prompt('Generer lien Espace Client', 'Email du client:', ui.ButtonSet.OK_CANCEL);
    if (emailResp.getSelectedButton() !== ui.Button.OK) return;
    const email = String(emailResp.getResponseText() || '').trim();
    if (!email) {
      ui.alert('Erreur', 'Email requis.', ui.ButtonSet.OK);
      return;
    }
    const hoursResp = ui.prompt('Validite du lien', 'Duree en heures (defaut 168):', ui.ButtonSet.OK_CANCEL);
    if (hoursResp.getSelectedButton() !== ui.Button.OK) return;
    const hours = parseInt(hoursResp.getResponseText() || '168', 10);
    const res = isCallable_('genererLienEspaceClient') ? genererLienEspaceClient(email, isNaN(hours) ? 168 : hours) : null;
    if (!res || !res.url) {
      ui.alert('Erreur', 'Impossible de generer le lien (fonction absente).', ui.ButtonSet.OK);
      return;
    }
    const sanitizedUrl = sanitizeForHtml_(res.url || '');
    const html = HtmlService.createHtmlOutput(
      '<div style=\"font-family:Montserrat,sans-serif;line-height:1.5\">' +
      '<h3>Lien Espace Client</h3>' +
      '<p>Ce lien expire a: ' + new Date(res.exp * 1000).toLocaleString() + '</p>' +
      '<input id=\"l\" type=\"text\" value=\"' + sanitizedUrl + '\" style=\"width:100%\" readonly />' +
      '<div style=\"margin-top:8px\"><button onclick=\"copy()\">Copier</button></div>' +
      '<script>function copy(){var i=document.getElementById(\"l\");i.select();try{document.execCommand(\"copy\");}catch(e){}}</script>' +
      '</div>'
    ).setWidth(520).setHeight(160);
    ui.showModalDialog(html, 'Lien Espace Client');
  } catch (e) {
    ui.alert('Erreur', e.message, ui.ButtonSet.OK);
  }
}

function menuVerifierInstallation() {
  const ui = SpreadsheetApp.getUi();
  const result = safeCheckSetup_();
  Logger.log(JSON.stringify(result));
  const message = result.ok ? 'OK' : 'Proprietes manquantes: ' + result.missingProps.join(', ');
  ui.alert('Verification installation', message, ui.ButtonSet.OK);
}

function doGet(e) {
  const event = e || {};
  const params = event.parameter || {};

  if (REQUEST_LOGGING_ENABLED && typeof logRequest === 'function') {
    try { logRequest(event); } catch (err) { Logger.log('[doGet] logRequest failed: ' + err); }
  }

  if (String(params.ping || '') === '1') {
    return ContentService.createTextOutput('pong');
  }

  if (params.asset) {
    return serveAsset_(params.asset);
  }

  const page = normalizePageParam_(params.page);
  if (page === 'gestion' || page === 'espaceclient') {
    return renderClientPortal_(params);
  }
  if (page === 'admin') {
    return renderAdmin_(event);
  }
  if (page === 'debug') {
    return renderDebug_(event);
  }
  if (page === 'piluleur') {
    return renderPiluleur_(params);
  }
  if (page === 'livraison') {
    return renderLivraisonRedirect_();
  }
  if (page === 'mentions') {
    return renderStaticPage_('Mentions_Legales', 'Mentions legales');
  }
  if (page === 'infos' || page === 'confidentialite') {
    return renderStaticPage_('Infos_confidentialite', 'Informations et confidentialite');
  }
  if (page === 'cgv') {
    return renderStaticPage_('CGV', 'Conditions generales de vente');
  }
  if (page === 'reservation') {
    return renderReservationPage_(params);
  }

  return renderLandingPage_();
}

// ---------------------------------------------------------------------------
// Pages HTML
// ---------------------------------------------------------------------------

function renderLandingPage_() {
  return renderTemplate_('Index', { title: buildTitle_('Accueil'), allowEmbed: true });
}

function renderReservationPage_(params) {
  const variant = normalizePageParam_((params && (params.variant || params.view || params.layout)) || '');
  const useLegacy = variant === 'legacy' || variant === 'v1';
  const templateName = useLegacy ? 'Reservation_Interface' : 'Index';
  return renderTemplate_(templateName, { title: buildTitle_('Reservation'), allowEmbed: true });
}

function renderClientPortal_(params) {
  if (typeof CLIENT_PORTAL_ENABLED !== 'undefined' && !CLIENT_PORTAL_ENABLED) {
    return creerReponseHtml('Espace client', 'L espace client est desactive.');
  }
  const tpl = HtmlService.createTemplateFromFile('Client_Espace');
  tpl.EMBED_MODE = shouldEnableEmbedMode_(params);
  tpl.prefilledEmail = sanitizeEmailParam_(params && params.email);
  return evaluateTemplate_(tpl, {
    title: buildTitle_('Espace client'),
    allowEmbed: true
  });
}

function renderAdmin_(event) {
  if (!hasAdminAccess(event)) {
    return createAccessDeniedPage_();
  }
  return renderTemplate_('Admin_Interface', { title: buildTitle_('Admin') });
}

function renderDebug_(event) {
  if (!DEBUG_MENU_ENABLED) {
    return creerReponseHtml('Debug', 'Le panneau de debug est desactive (DEBUG_MENU_ENABLED=false).');
  }
  if (!hasAdminAccess(event)) {
    return createAccessDeniedPage_();
  }
  return renderTemplate_('Debug_Interface', { title: buildTitle_('Debug') });
}

function renderPiluleur_(params) {
  if (typeof renderPiluleurInterface === 'function') {
    return renderPiluleurInterface();
  }
  if (typeof openPiluleurInterface === 'function') {
    return openPiluleurInterface(params && params.imageId, params && params.imageUrl);
  }
  return creerReponseHtml('Piluleur', 'Module Piluleur indisponible.');
}

function renderLivraisonRedirect_() {
  const url = (typeof LIVRAISON_WEBAPP_URL !== 'undefined' && LIVRAISON_WEBAPP_URL)
    ? String(LIVRAISON_WEBAPP_URL).trim()
    : '';
  if (!url) {
    return creerReponseHtml('Livraison', 'Le module livreur est maintenu dans un projet separe. Configurez LIVRAISON_WEBAPP_URL pour activer la redirection.');
  }
  const safeUrl = sanitizeUrl_(url);
  const html = [
    '<!DOCTYPE html><html><head><meta charset="UTF-8">',
    '<meta http-equiv="refresh" content="0;url=' + safeUrl + '">',
    '</head><body>',
    '<p>Redirection vers le module Livreur...</p>',
    '<p><a href="' + safeUrl + '">' + safeUrl + '</a></p>',
    '</body></html>'
  ].join('');
  return HtmlService.createHtmlOutput(html).setTitle(buildTitle_('Livraison'));
}

function renderStaticPage_(templateName, title) {
  return renderTemplate_(templateName, { title: buildTitle_(title), allowEmbed: true });
}

// ---------------------------------------------------------------------------
// Assets
// ---------------------------------------------------------------------------

function serveAsset_(assetName) {
  const key = 'asset:' + normalizePageParam_(assetName || '');
  if (!key) {
    return ContentService.createTextOutput('').setMimeType(ContentService.MimeType.TEXT);
  }
  const cache = CacheService.getScriptCache();
  const cached = cache.get(key);
  if (cached) {
    return ContentService.createTextOutput(cached).setMimeType(ContentService.MimeType.TEXT);
  }

  let content = '';
  if (key === 'asset:theme.css') {
    content = extractCssFromTemplate_('Theme_App');
  } else {
    return ContentService.createTextOutput('Not found').setMimeType(ContentService.MimeType.TEXT);
  }

  if (content) {
    cache.put(key, content, 21600); // 6h
  }
  return ContentService.createTextOutput(content).setMimeType(ContentService.MimeType.TEXT);
}

function extractCssFromTemplate_(filename) {
  const raw = HtmlService.createHtmlOutputFromFile(filename).getContent() || '';
  const startStyle = raw.toLowerCase().indexOf('<style');
  if (startStyle === -1) {
    return raw.trim();
  }
  const open = raw.indexOf('>', startStyle);
  const end = raw.toLowerCase().indexOf('</style>', open + 1);
  if (open === -1 || end === -1) {
    return raw.trim();
  }
  return raw.substring(open + 1, end).trim();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderTemplate_(filename, options) {
  const tpl = HtmlService.createTemplateFromFile(filename);
  return evaluateTemplate_(tpl, options);
}

function evaluateTemplate_(template, options) {
  const output = template.evaluate();
  if (options && options.title) {
    output.setTitle(options.title);
  }
  if (options && options.allowEmbed) {
    output.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  if (options && options.sandboxMode) {
    output.setSandboxMode(options.sandboxMode);
  }
  return output;
}

function normalizePageParam_(raw) {
  const value = typeof raw === 'string' ? raw : String(raw || '');
  return value.trim().toLowerCase();
}

function buildTitle_(suffix) {
  const brand = (typeof NOM_ENTREPRISE !== 'undefined' && NOM_ENTREPRISE) ? NOM_ENTREPRISE : 'EL Services';
  return suffix ? (brand + ' | ' + suffix) : brand;
}

function shouldEnableEmbedMode_(params) {
  const raw = (params && (params.embed || params.em || params.mode)) || '';
  const value = normalizePageParam_(raw);
  return value === '1' || value === 'true' || value === 'embed' || value === 'iframe';
}

function sanitizeEmailParam_(email) {
  const raw = (email || '').trim();
  if (!raw) return '';
  const cleaned = raw.replace(/[\\r\\n<>]/g, '');
  const re = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  return re.test(cleaned) ? cleaned : '';
}

function sanitizeUrl_(url) {
  return escapeHtml_(String(url || '').trim());
}

function isAdminUser_() {
  try {
    const email = Session.getActiveUser().getEmail();
    return !!email && !!ADMIN_EMAIL && email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  } catch (err) {
    return false;
  }
}

function hasAdminAccess(e) {
  const adminEmail = (typeof ADMIN_EMAIL === 'string') ? ADMIN_EMAIL.toLowerCase() : '';
  if (!adminEmail) return false;
  if (isAdminUser_()) return true;

  const params = (e && e.parameter) || {};
  const emailParam = String(params.email || '').trim().toLowerCase();
  if (!emailParam || emailParam !== adminEmail) return false;
  const exp = params.exp || '';
  const sig = params.sig || '';
  if (isCallable_('verifySignedLink') && sig && exp) {
    try { return verifySignedLink(emailParam, exp, sig); } catch (_err) { return false; }
  }
  return false;
}

function createAccessDeniedPage_() {
  if (typeof createOAuth403ErrorPage === 'function') {
    return createOAuth403ErrorPage();
  }
  const target = (typeof ADMIN_EMAIL !== 'undefined' && ADMIN_EMAIL) ? ADMIN_EMAIL : 'admin';
  return creerReponseHtml('Acces refuse', 'Connectez-vous avec le compte admin (' + target + ').');
}

function creerReponseHtml(titre, message) {
  const safeTitle = escapeHtml_(titre || 'ELS');
  const safeMessage = escapeHtml_(message || '');
  const html = [
    '<!DOCTYPE html><html><head><meta charset="UTF-8">',
    '<title>' + safeTitle + '</title>',
    '<style>body{font-family:Arial,sans-serif;margin:48px;color:#111;}h1{font-size:22px;margin-bottom:12px;}p{font-size:14px;line-height:1.6;}</style>',
    '</head><body>',
    '<h1>' + safeTitle + '</h1>',
    '<p>' + safeMessage + '</p>',
    '</body></html>'
  ].join('');
  return HtmlService.createHtmlOutput(html).setTitle(safeTitle);
}

function escapeHtml_(raw) {
  return String(raw || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeForHtml_(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;')
    .replace(/>/g, '&gt;');
}

function safeToast_(message, title, seconds) {
  try {
    SpreadsheetApp.getActive().toast(message, title || '', seconds || 5);
  } catch (_e) {
    // Toast facultatif.
  }
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
 * Petit utilitaire pour eviter ReferenceError dans certains modules.
 * @param {string} fnName
 * @returns {boolean}
 */
function isCallable_(fnName) {
  try { return typeof globalThis[fnName] === 'function'; } catch (_err) { return false; }
}

function isFlagEnabled_(flagName) {
  try {
    if (typeof isFlagEnabled === 'function') {
      return !!isFlagEnabled(flagName);
    }
    return !!globalThis[flagName];
  } catch (_err) {
    return false;
  }
}
