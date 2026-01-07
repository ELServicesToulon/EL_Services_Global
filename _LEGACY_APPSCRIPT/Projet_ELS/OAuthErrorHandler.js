// =================================================================
//                  GESTION DES ERREURS OAUTH
// =================================================================
// Description: Fournit des messages d'erreur clairs et des
//              instructions pour résoudre les problèmes OAuth.
// =================================================================

/**
 * Crée une page HTML informative pour l'erreur 403 OAuth.
 * Cette fonction est appelée lorsqu'un utilisateur non autorisé
 * tente d'accéder à l'application.
 *
 * @returns {HtmlOutput} Page HTML avec instructions
 */
function createOAuth403ErrorPage() {
  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Accès restreint - ClaudeELS</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      max-width: 600px;
      width: 100%;
      padding: 40px;
    }
    .icon {
      width: 80px;
      height: 80px;
      margin: 0 auto 20px;
      background: #ff6b6b;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 48px;
      color: white;
    }
    h1 {
      color: #2c3e50;
      font-size: 28px;
      margin-bottom: 16px;
      text-align: center;
    }
    .error-code {
      background: #ffe5e5;
      color: #c92a2a;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 600;
      text-align: center;
      margin-bottom: 24px;
      font-family: 'Courier New', monospace;
    }
    .description {
      color: #555;
      line-height: 1.8;
      margin-bottom: 24px;
      text-align: center;
    }
    .steps {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 24px;
      margin-bottom: 24px;
    }
    .steps h2 {
      color: #2c3e50;
      font-size: 18px;
      margin-bottom: 16px;
    }
    .step {
      margin-bottom: 16px;
      padding-left: 32px;
      position: relative;
    }
    .step::before {
      content: "→";
      position: absolute;
      left: 8px;
      color: #667eea;
      font-weight: bold;
      font-size: 18px;
    }
    .step strong {
      color: #2c3e50;
      display: block;
      margin-bottom: 4px;
    }
    .step span {
      color: #666;
      font-size: 14px;
    }
    .contact {
      background: #e7f5ff;
      border-left: 4px solid #1c7ed6;
      padding: 16px;
      border-radius: 4px;
      margin-top: 24px;
    }
    .contact strong {
      color: #1c7ed6;
      display: block;
      margin-bottom: 8px;
    }
    .contact-email {
      color: #1c7ed6;
      text-decoration: none;
      font-weight: 600;
    }
    .contact-email:hover {
      text-decoration: underline;
    }
    .technical-info {
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #dee2e6;
    }
    .technical-info summary {
      cursor: pointer;
      color: #667eea;
      font-weight: 600;
      margin-bottom: 12px;
      user-select: none;
    }
    .technical-info summary:hover {
      color: #764ba2;
    }
    .technical-info pre {
      background: #f8f9fa;
      padding: 16px;
      border-radius: 4px;
      overflow-x: auto;
      font-size: 13px;
      line-height: 1.6;
      color: #495057;
    }
    @media (max-width: 640px) {
      .container {
        padding: 24px;
      }
      h1 {
        font-size: 22px;
      }
      .icon {
        width: 60px;
        height: 60px;
        font-size: 36px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">🔒</div>

    <h1>Accès à l'application restreint</h1>

    <div class="error-code">
      Erreur 403 : access_denied
    </div>

    <div class="description">
      L'application ClaudeELS est actuellement en mode test et
      l'accès est limité aux utilisateurs testeurs approuvés.
    </div>

    <div class="steps">
      <h2>📋 Comment obtenir l'accès ?</h2>

      <div class="step">
        <strong>Option 1 : Demander l'accès testeur</strong>
        <span>
          Contactez l'administrateur de l'application avec votre adresse email Google
          pour être ajouté à la liste des testeurs. L'accès est accordé immédiatement
          après validation.
        </span>
      </div>

      <div class="step">
        <strong>Option 2 : Utiliser un compte autorisé</strong>
        <span>
          Si vous avez déjà un compte autorisé, assurez-vous d'être connecté
          avec la bonne adresse email Google.
        </span>
      </div>
    </div>

    <div class="contact">
      <strong>📧 Besoin d'aide ?</strong>
      Contactez l'administrateur :
      <a href="mailto:${typeof ADMIN_EMAIL !== 'undefined' ? ADMIN_EMAIL : 'admin@example.com'}"
         class="contact-email">
        ${typeof ADMIN_EMAIL !== 'undefined' ? ADMIN_EMAIL : 'admin@example.com'}
      </a>
    </div>

    <details class="technical-info">
      <summary>ℹ️ Informations techniques</summary>
      <pre>
Statut de l'application : Mode Test (Testing)
Erreur : OAuth 403 access_denied
Limite testeurs : 100 utilisateurs maximum

Scopes OAuth requis :
- Gmail (envoi d'emails)
- Google Drive (stockage documents)
- Google Calendar (gestion créneaux)
- Google Sheets (base de données)

Pour les développeurs :
Consultez docs/GOOGLE_OAUTH_GUIDE.md pour
passer l'application en production.
      </pre>
    </details>
  </div>
</body>
</html>
  `;

  return HtmlService.createHtmlOutput(html)
    .setTitle('Accès restreint - ClaudeELS')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Vérifie si l'utilisateur actuel a les autorisations OAuth nécessaires.
 * Affiche une page d'erreur informative si l'accès est refusé.
 *
 * @returns {Object|null} Informations utilisateur si autorisé, null sinon
 */
function checkOAuthAccess() {
  try {
    // Tenter d'obtenir l'utilisateur actif
    const user = Session.getActiveUser();
    const userEmail = user.getEmail();

    if (!userEmail) {
      Logger.log('[OAuth] Aucune adresse email utilisateur détectée');
      return null;
    }

    Logger.log('[OAuth] Utilisateur authentifié : ' + userEmail);
    return {
      email: userEmail,
      authorized: true
    };

  } catch (error) {
    Logger.log('[OAuth] Erreur d\'authentification : ' + error.message);

    // Vérifier si c'est une erreur OAuth 403
    if (error.message && error.message.indexOf('403') !== -1) {
      Logger.log('[OAuth] Erreur 403 détectée - Utilisateur non autorisé');
    }

    return null;
  }
}

/**
 * Wrapper pour doGet qui gère les erreurs OAuth.
 * Affiche une page d'erreur informative si l'utilisateur n'est pas autorisé.
 *
 * @param {Object} e Objet événement de la requête
 * @param {Function} handler Fonction doGet principale
 * @returns {HtmlOutput} Réponse HTML
 */
function doGetWithOAuthCheck(e, handler) {
  // Vérifier l'accès OAuth
  const userInfo = checkOAuthAccess();

  // Si l'accès est refusé et qu'aucun paramètre de lien signé n'est présent
  if (!userInfo && (!e.parameter || !e.parameter.sig)) {
    Logger.log('[OAuth] Accès refusé - Affichage page d\'erreur');
    return createOAuth403ErrorPage();
  }

  // Sinon, continuer avec le handler normal
  return handler(e);
}

/**
 * Enregistre les tentatives d'accès OAuth dans les logs.
 * Utile pour le débogage et le monitoring.
 *
 * @param {string} email Email de l'utilisateur
 * @param {boolean} success Succès de l'authentification
 * @param {string} errorMessage Message d'erreur éventuel
 */
function logOAuthAttempt(email, success, errorMessage) {
  if (typeof SHEET_LOGS === 'undefined') {
    return;
  }

  try {
    const ss = SpreadsheetApp.openById(getSecret('ID_FEUILLE_CALCUL'));
    const sheet = ss.getSheetByName(SHEET_LOGS);

    if (!sheet) {
      Logger.log('[OAuth] Feuille de logs introuvable');
      return;
    }

    const timestamp = new Date();
    const status = success ? 'SUCCESS' : 'FAILED';
    const error = errorMessage || '-';

    sheet.appendRow([
      timestamp,
      'OAuth',
      email || 'anonymous',
      status,
      error
    ]);

  } catch (err) {
    Logger.log('[OAuth] Impossible d\'enregistrer le log : ' + err.message);
  }
}

/**
 * Retourne un message d'aide pour les administrateurs.
 * À afficher dans les menus ou les toasts.
 *
 * @returns {string} Message d'aide
 */
function getOAuthHelpMessage() {
  return [
    '⚠️ L\'application est en mode Test',
    '',
    'Pour ajouter des utilisateurs testeurs :',
    '1. Rendez-vous sur Google Cloud Console',
    '2. Projet : claudeels',
    '3. APIs & Services > OAuth consent screen',
    '4. Section "Test users" > ADD USERS',
    '',
    'Documentation : docs/GOOGLE_OAUTH_GUIDE.md'
  ].join('\n');
}

/**
 * Affiche un toast d'information OAuth aux administrateurs.
 */
function showOAuthStatusToast() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) return;

    const message = '📋 App en mode Test. Voir docs/GOOGLE_OAUTH_GUIDE.md';
    ss.toast(message, '⚠️ OAuth Status', 10);

  } catch (err) {
    Logger.log('[OAuth] Impossible d\'afficher le toast : ' + err.message);
  }
}
