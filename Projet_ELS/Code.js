/**
 * ELS - Point d'entree Apps Script (WebApp)
 * - Routage des pages (public, espace client, admin, debug, piluleur)
 * - Service d'asset leger (?asset=theme.css)
 * - Healthcheck simple (?ping=1)
 * La logique metier reste dans les autres fichiers (Reservation.js, Gestion.js, etc.).
 */

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
    return renderAdmin_();
  }
  if (page === 'debug') {
    return renderDebug_();
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

function renderAdmin_() {
  if (!isAdminUser_()) {
    return createAccessDeniedPage_();
  }
  return renderTemplate_('Admin_Interface', { title: buildTitle_('Admin') });
}

function renderDebug_() {
  if (!DEBUG_MENU_ENABLED) {
    return creerReponseHtml('Debug', 'Le panneau de debug est desactive (DEBUG_MENU_ENABLED=false).');
  }
  if (!isAdminUser_()) {
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

/**
 * Petit utilitaire pour eviter ReferenceError dans certains modules.
 * @param {string} fnName
 * @returns {boolean}
 */
function isCallable_(fnName) {
  try { return typeof globalThis[fnName] === 'function'; } catch (_err) { return false; }
}
