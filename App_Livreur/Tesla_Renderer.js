/**
 * Rend l'interface Tesla Livraison (version basee sur Tesla Livreur).
 * @param {Object} _e Contexte doGet (non utilise).
 * @returns {HtmlOutput}
 */
function renderTeslaLivraisonInterface(_e) {
  var template = HtmlService.createTemplateFromFile('Tesla_Livraison_Interface');
  template.pageTitle = 'Tesla Livraison - ELS';
  return template.evaluate()
    .setTitle('Tesla Livraison - ELS')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
