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
    // 1. Vérification critique: L'objet de config doit exister.
    if (typeof ELS_CONFIG === 'undefined') {
      throw new Error("L'objet de configuration ELS_CONFIG n'a pas été chargé. Vérifiez la présence et l'ordre des fichiers.");
    }

    // 2. Création du template à partir du fichier HTML principal
    var template = HtmlService.createTemplateFromFile('Index');

    // 3. INJECTION DES VARIABLES DE CONFIGURATION DANS LE TEMPLATE
    // On accède aux propriétés de l'objet ELS_CONFIG de manière sécurisée.
    template.NOM_ENTREPRISE   = ELS_CONFIG.NOM_ENTREPRISE || 'EL Services';
    template.EMAIL_ENTREPRISE = ELS_CONFIG.EMAIL_ENTREPRISE || 'Contact';
    template.TEL_ENTREPRISE   = ELS_CONFIG.TEL_ENTREPRISE || '';
    template.BRANDING_LOGO_PUBLIC_URL = ELS_CONFIG.BRANDING_LOGO_PUBLIC_URL || '';

    // 4. Passage des paramètres d'URL (ex: ?page=facturation)
    template.urlParams = e ? e.parameter : {};

    // 5. Évaluation et rendu de la page
    var output = template.evaluate()
      .setTitle(template.NOM_ENTREPRISE + " - Gestion")
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .setSandboxMode(HtmlService.SandboxMode.IFRAME);
      
    return output;

  } catch (error) {
    // Gestion d'erreur critique au démarrage
    console.error("ERREUR CRITIQUE DOGET : " + error.toString());
    return HtmlService.createHtmlOutput(
      '<div style="font-family:sans-serif; padding:20px; color:#D32F2F;">' +
      '<h2>Erreur de démarrage</h2>' +
      '<p>L\'application n\'a pas pu charger la configuration ou le template.</p>' +
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