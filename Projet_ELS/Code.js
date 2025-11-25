/**
 * @fileoverview Contrôleur principal pour l'application Projet_ELS (Back-Office & Interfaces).
 * Gère le routing (doGet/doPost), l'inclusion de templates et les fonctions utilitaires globales.
 * @onlyCurrentDoc
 */

/**
 * Point d'entrée pour les requêtes HTTP GET (Web App).
 * Dispatche vers la page appropriée selon le paramètre 'page'.
 * * @param {Object} e - L'événement de requête HTTP.
 * @return {HtmlOutput} Le contenu HTML généré.
 */
function doGet(e) {
  var output;
  var page = 'Admin_Interface'; // Page par défaut
  var title = 'EL Services - Admin';

  try {
    // 1. Récupération sécurisée du paramètre 'page'
    if (e && e.parameter && e.parameter.page) {
      // Sécurisation basique contre l'injection de noms de fichiers invalides
      var requestedPage = e.parameter.page.replace(/[^a-zA-Z0-9_]/g, '');
      if (requestedPage) {
        page = requestedPage;
      }
    }

    // 2. Définition du titre selon la page (Logique métier basique)
    if (page === 'Client_Espace') {
      title = 'Espace Client | EL Services';
    } else if (page === 'Piluleur_Index') {
      title = 'Interface Piluleur | EL Services';
    }

    // 3. Création du Template
    // Utilise Config.APP_NAME si disponible, sinon fallback
    var appName = (typeof Config !== 'undefined' && Config.APP_NAME) ? Config.APP_NAME : 'EL Services Global';
    
    var template = HtmlService.createTemplateFromFile(page);
    
    // Injection de variables globales communes au template
    template.appName = appName;
    template.pageTitle = title;
    
    // 4. Évaluation et options de sécurité
    output = template.evaluate()
      .setTitle(title)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL); // Ajuster selon besoins d'intégration

  } catch (error) {
    // Gestion d'erreur critique (Page non trouvée ou erreur serveur)
    console.error("ERREUR CRITIQUE doGet: " + error.toString());
    
    // En cas d'erreur, on renvoie une page d'erreur simple mais propre
    var errorTemplate = HtmlService.createTemplate('<h1>Erreur Système</h1><p>Une erreur est survenue lors du chargement de la page : <?= message ?></p>');
    errorTemplate.message = error.message;
    output = errorTemplate.evaluate().setTitle('Erreur - EL Services');
    
    // Tentative de log par email si configuré (Try/Catch interne pour ne pas briser la boucle)
    try {
      if (typeof Config !== 'undefined' && Config.ADMIN_EMAIL) {
        MailApp.sendEmail({
          to: Config.ADMIN_EMAIL,
          subject: "[ALERTE] Erreur doGet - " + appName,
          body: "Erreur lors de l'accès à la page : " + page + "\n\n" + error.toString()
        });
      }
    } catch (mailErr) {
      console.error("Impossible d'envoyer l'alerte email: " + mailErr.toString());
    }
  }

  return output;
}

/**
 * Fonction standard pour inclure des fichiers HTML partiels (CSS, JS, Composants).
 * Utilisée dans les templates via <?!= include('NomFichier'); ?>
 * * @param {string} filename - Nom du fichier .html à inclure.
 * @return {string} Le contenu du fichier.
 */
function include(filename) {
  try {
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
  } catch (error) {
    console.error("Erreur lors de l'inclusion du fichier " + filename + ": " + error.toString());
    return "";
  }
}

/**
 * Récupère l'URL de déploiement du script courant.
 * Utile pour les liens internes ou rechargements.
 * * @return {string} L'URL de la Web App.
 */
function getScriptUrl() {
  try {
    return ScriptApp.getService().getUrl();
  } catch (error) {
    console.error("Erreur getScriptUrl: " + error.toString());
    return "";
  }
}

/**
 * Récupère l'email de l'utilisateur actif.
 * Nécessite que l'utilisateur soit connecté au domaine ou au compte Google.
 * * @return {string} Email de l'utilisateur ou chaine vide.
 */
function getUserEmail() {
  try {
    return Session.getActiveUser().getEmail();
  } catch (error) {
    console.error("Erreur getUserEmail: " + error.toString());
    return "";
  }
}

/**
 * Fonction utilitaire pour tester la connexion depuis le front-end.
 * * @return {string} "OK" si le serveur répond.
 */
function testConnection() {
  return "OK";
}