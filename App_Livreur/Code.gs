/**
 * Code.gs - App Livreur
 * Point d'entrée de la Web App
 */

function doGet(e) {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('EL Services - Copilote Tesla')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL); // Important pour certains embed
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Pont vers le Backend
 * Ces fonctions appellent la logique métier définie dans Backend_Handler.gs
 */
function rpc_loadData() {
  return api_getEtablissementsGPS();
}

function rpc_getDailyReservations() {
  return api_getDailyReservations();
}

function rpc_sendReport(data) {
  return api_saveLivraisonReport(data);
}
