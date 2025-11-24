/**
 * @fileoverview POINT D'ENTRÉE PRINCIPAL - PROJET ELS
 * Gère le chargement de l'interface Web (doGet) et l'injection des configurations.
 */

/**
 * Point d'entrée de l'application Web.
 * Charge le template HTML et injecte les variables de configuration.
 */
function doGet(e) {
  try {
    // 1. Création du template à partir du fichier HTML principal
    var template = HtmlService.createTemplateFromFile('Index');

    // 2. INJECTION DES VARIABLES DE CONFIGURATION (INDISPENSABLE)
    // Cela permet au HTML d'utiliser <?= NOM_ENTREPRISE ?> sans erreur.
    template.NOM_ENTREPRISE   = typeof NOM_ENTREPRISE !== 'undefined' ? NOM_ENTREPRISE : 'EL Services';
    template.EMAIL_ENTREPRISE = typeof EMAIL_ENTREPRISE !== 'undefined' ? EMAIL_ENTREPRISE : 'Contact';
    template.TEL_ENTREPRISE   = typeof TEL_ENTREPRISE !== 'undefined' ? TEL_ENTREPRISE : '';
    
    // 3. Passage des paramètres d'URL (ex: ?page=facturation)
    template.urlParams = e ? e.parameter : {};

    // 4. Évaluation et rendu de la page
    var output = template.evaluate()
      .setTitle(template.NOM_ENTREPRISE + " - Gestion")
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .setSandboxMode(HtmlService.SandboxMode.IFRAME);
      
    return output;

  } catch (error) {
    // Gestion d'erreur critique au démarrage (ex: Config manquante)
    console.error("ERREUR CRITIQUE DOGET : " + error.toString());
    return HtmlService.createHtmlOutput(
      '<div style="font-family:sans-serif; padding:20px; color:#D32F2F;">' +
      '<h2>Erreur de démarrage</h2>' +
      '<p>L\'application n\'a pas pu charger la configuration.</p>' +
      '<pre style="background:#eee; padding:10px;">' + error.toString() + '</pre>' +
      '</div>'
    );
  }
}

/**
 * Fonction utilitaire pour inclure des fichiers HTML partiels (CSS, JS) dans le template principal.
 * Appelée via <?= include('NomFichier'); ?> dans le HTML.
 */
function include(filename) {
  try {
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
  } catch (e) {
    console.warn("Fichier inclus manquant : " + filename);
    return "";
  }
}

/**
 * Récupère l'URL actuelle du script (utile pour les liens internes).
 */
function getScriptUrl() {
  return ScriptApp.getService().getUrl();
}