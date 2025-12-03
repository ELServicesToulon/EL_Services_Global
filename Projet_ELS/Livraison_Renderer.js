/**
 * Rend l'interface livreur (route page=livraison).
 * @param {Object} _e Contexte doGet (non utilis‚).
 * @returns {HtmlOutput}
 */
function renderLivraisonInterface(_e) {
  const template = HtmlService.createTemplateFromFile('Livraison_Interface');
  const appName = (typeof NOM_ENTREPRISE === 'string' && NOM_ENTREPRISE.length)
    ? NOM_ENTREPRISE + ' | Livreur'
    : 'ELS Livreur';
  template.appName = appName;
  return template.evaluate()
    .setTitle(appName)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}
