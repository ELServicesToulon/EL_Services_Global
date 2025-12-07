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
 * Pont vers le Backend Central (Projet_ELS)
 * Dans une architecture réelle, App_Livreur serait une librairie liée ou ferait des appels API.
 * Ici, pour simplifier le code "copier-coller", je simule l'appel local,
 * MAIS ces fonctions devraient appeler la librairie "Projet_ELS" si liée.
 */
function rpc_loadData() {
  // Simulation : Appel de la fonction définie dans PARTIE 1.
  // Si les fichiers sont dans le même projet (Monorepo global), cela fonctionne direct.
  // Sinon, utiliser : return Projet_ELS.api_getEtablissementsGPS();
  return api_getEtablissementsGPS();
}

function rpc_sendReport(data) {
  return api_saveLivraisonReport(data);
}
