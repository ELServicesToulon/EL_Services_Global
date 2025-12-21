// =================================================================
//                      ROUTER PRINCIPAL
// =================================================================
/**
 * @fileoverview Gestionnaire de routes pour l'application Web.
 * Remplace le switch/case monolithique de Code.js.
 */

var Router = (function () {
  'use strict';

  const routes = {};

  /**
   * Enregistre une route.
   * @param {string} path - Le paramètre ?page=...
   * @param {Function} handler - Fonction(e) retournant HtmlOutput ou TextOutput.
   */
  function add(path, handler) {
    routes[path] = handler;
  }

  /**
   * Dispatch la requête vers le bon handler.
   * @param {Object} e - L'événement doGet/doPost.
   * @param {string} defaultPath - Route par défaut si 'page' est vide.
   * @returns {HtmlOutput|TextOutput}
   */
  function dispatch(e, defaultPath = 'accueil') {
    const params = e && e.parameter ? e.parameter : {};
    const page = params.page || defaultPath;

    // Middleware global (Logging, Security checks basiques)
    if (typeof logRequest === 'function') logRequest(e);

    const handler = routes[page];
    if (handler) {
      try {
        return handler(e);
      } catch (err) {
        Logger.log(`Router Error on ${page}: ${err.message}`);
        return HtmlService.createHtmlOutput(`<h1>Erreur</h1><p>${err.message}</p>`);
      }
    } else {
      // Fallback pour les anciennes routes définies dans Code.js si non migrées
      // ou 404
      if (typeof getPageHandler_ === 'function') {
        const legacyHandler = getPageHandler_(page);
        if (legacyHandler) return legacyHandler(e, params);
      }
      return HtmlService.createHtmlOutput('<h1>Page introuvable</h1>');
    }
  }

  return {
    add: add,
    dispatch: dispatch
  };

})();

// --- Enregistrement des routes (Initialisation) ---
// On peut appeler ceci depuis une fonction d'init ou directement ici si l'ordre de chargement le permet.
// Dans Apps Script, tous les fichiers sont chargés, mais l'ordre est incertain.
// Il vaut mieux enregistrer les routes dans une fonction appelée par doGet.

function registerRoutes() {
  // Admin
  Router.add('admin', function (e) {
    if (!Auth.isAdmin(e)) return HtmlService.createHtmlOutput('Accès refusé');
    return HtmlService.createTemplateFromFile('Admin_Interface').evaluate().setTitle('Admin');
  });

  // Livraison
  Router.add('livreur', function (e) {
    // Logique de redirection vers Tesla ou autre
    if (typeof handleLivraisonPage_ === 'function') return handleLivraisonPage_(e);
    return HtmlService.createHtmlOutput('Module Livraison');
  });

  // Autres routes...
  Router.add('infos', function () {
    return HtmlService.createTemplateFromFile('Infos_confidentialite').evaluate();
  });

  // Android Widget
  Router.add('widget', function () {
    return HtmlService.createTemplateFromFile('Widget_Android')
      .evaluate()
      .setTitle('ELS Widget')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  });
}
