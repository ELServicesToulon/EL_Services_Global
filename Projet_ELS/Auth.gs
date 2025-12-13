// =================================================================
//                      MODULE D'AUTHENTIFICATION
// =================================================================
/**
 * @fileoverview Gestion centralisée de l'authentification et des jetons.
 */

var Auth = (function() {
  'use strict';

  /**
   * Vérifie la validité d'un lien signé (HMAC).
   * @param {string} email - Email associé au lien.
   * @param {string|number} expSeconds - Timestamp d'expiration (secondes).
   * @param {string} sigBase64 - Signature reçue.
   * @returns {boolean} True si valide.
   */
  function verifyToken(email, expSeconds, sigBase64) {
    if (typeof verifySignedLink === 'function') {
      return verifySignedLink(email, expSeconds, sigBase64);
    }
    // Fallback si Utilitaires.js n'est pas chargé (ne devrait pas arriver)
    Logger.log('Auth.verifyToken: verifySignedLink introuvable.');
    return false;
  }

  /**
   * Génère un token signé pour un email donné.
   * @param {string} email - Email cible.
   * @param {number} [ttlSeconds] - Durée de validité.
   * @returns {{url: string, exp: number}}
   */
  function generateToken(email, ttlSeconds) {
    if (typeof generateSignedClientLink === 'function') {
      return generateSignedClientLink(email, ttlSeconds);
    }
    throw new Error('Auth.generateToken: generateSignedClientLink introuvable.');
  }

  /**
   * Vérifie si l'utilisateur courant a les droits administrateur.
   * Supporte la session active (Google) ou un token signé admin dans les paramètres.
   * @param {Object} e - Événement de requête (doGet/doPost).
   * @returns {boolean}
   */
  function isAdmin(e) {
    // Vérification via Session utilisateur (Apps Script)
    try {
      const activeUser = Session.getActiveUser().getEmail();
      const adminEmail = getSecret_('ADMIN_EMAIL');
      if (activeUser && adminEmail && activeUser.toLowerCase() === adminEmail.toLowerCase()) {
        return true;
      }
    } catch (err) {
      // Peut échouer si l'utilisateur n'est pas connecté au compte Google ou contexte limité
    }

    // Vérification via paramètres URL (Token signé)
    if (e && e.parameter) {
      const email = e.parameter.email;
      const adminEmail = getSecret_('ADMIN_EMAIL');
      if (email && adminEmail && email.toLowerCase() === adminEmail.toLowerCase()) {
         return verifyToken(email, e.parameter.exp, e.parameter.sig);
      }
    }

    return false;
  }

  // Helper interne pour éviter dépendance circulaire si possible,
  // mais ici on dépend de Utilitaires/Config pour les secrets.
  function getSecret_(key) {
    try {
      return PropertiesService.getScriptProperties().getProperty(key);
    } catch(e) { return null; }
  }

  return {
    verifyToken: verifyToken,
    generateToken: generateToken,
    isAdmin: isAdmin
  };

})();
