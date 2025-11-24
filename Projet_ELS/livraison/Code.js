// =================================================================
//                    ELS LIVREUR - POINT D'ENTRÉE
// =================================================================
// Description: WebApp légère pour les livreurs ELS
// Optimisée pour rapidité et usage mobile
// =================================================================

/**
 * Charge un template HTML en essayant les chemins utilisés dans le projet principal
 * comme dans le module autonome.
 * @param {string} filename Nom du fichier sans extension.
 * @returns {GoogleAppsScript.HTML.HtmlTemplate} Template HtmlService prêt à être évalué.
 */
function loadLivraisonTemplate_(filename) {
  const candidatePaths = [
    'livraison/' + filename,
    filename
  ];
  const failures = [];
  for (var i = 0; i < candidatePaths.length; i++) {
    const path = candidatePaths[i];
    try {
      return HtmlService.createTemplateFromFile(path);
    } catch (err) {
      failures.push(path + ': ' + err.message);
    }
  }
  throw new Error('Template Livraison introuvable (' + filename + '): ' + failures.join(' | '));
}

/**
 * Point d'entrée pour la webapp
 * @param {Object} e - Event parameter contenant les query params
 * @returns {HtmlOutput} Interface HTML
 */
function renderLivraisonInterface(e) {
  const template = loadLivraisonTemplate_('Livraison_Interface');

  // Passer les configurations au template
  template.appVersion = '1.0.0';
  template.appName = 'ELS Livreur';

  return template.evaluate()
    .setTitle('ELS Livreur')
    .setFaviconUrl('https://img.icons8.com/fluency/48/000000/delivery.png')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
    // HtmlService only accepts a handful of meta tags; extra ones are injected at runtime in the HTML.
    .addMetaTag('apple-mobile-web-app-capable', 'yes');
}

/**
 * Point d'entrée WebApp autonome.
 * @param {Object} e Paramètres de requête.
 * @returns {HtmlOutput}
 */
function doGet(e) {
  return renderLivraisonInterface(e || {});
}

/**
 * Include des fichiers HTML partiels pour le module Livraison.
 * @param {string} filename - Nom du fichier à inclure (sans chemin).
 * @returns {string} Contenu du fichier.
 */
function includeLivraison(filename) {
  return loadLivraisonTemplate_(filename)
    .evaluate()
    .getContent();
}

/**
 * Obtenir les propriétés de configuration pour le module Livraison.
 * @returns {Object} Configuration.
 */
function getLivraisonConfig() {
  const props = PropertiesService.getScriptProperties();
  return {
    spreadsheetId: props.getProperty('SPREADSHEET_ID') || '',
    sheetNameTournees: props.getProperty('SHEET_TOURNEES') || 'Tournées',
    sheetNameNotes: props.getProperty('SHEET_NOTES') || 'Notes_Livraison'
  };
}
