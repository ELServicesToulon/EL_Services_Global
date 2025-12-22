// =================================================================
//                      MODULE D'AUTHENTIFICATION
// =================================================================
/**
 * @fileoverview Gestion centralisée de l'authentification et des jetons.
 */

var Auth = {

  verifyToken: function (email, expSeconds, sigBase64) {
    if (typeof verifySignedLink === 'function') {
      return verifySignedLink(email, expSeconds, sigBase64);
    }
    Logger.log('Auth.verifyToken: verifySignedLink introuvable.');
    return false;
  },

  generateToken: function (email, ttlSeconds) {
    if (typeof generateSignedClientLink === 'function') {
      return generateSignedClientLink(email, ttlSeconds);
    }
    throw new Error('Auth.generateToken: generateSignedClientLink introuvable.');
  },

  isAdmin: function (e) {
    try {
      const activeUser = Session.getActiveUser().getEmail();
      const adminEmail = PropertiesService.getScriptProperties().getProperty('ADMIN_EMAIL');
      if (activeUser && adminEmail && activeUser.toLowerCase() === adminEmail.toLowerCase()) {
        return true;
      }
    } catch (err) { }

    if (e && e.parameter) {
      const email = e.parameter.email;
      const adminEmail = PropertiesService.getScriptProperties().getProperty('ADMIN_EMAIL');
      if (email && adminEmail && email.toLowerCase() === adminEmail.toLowerCase()) {
        return this.verifyToken(email, e.parameter.exp, e.parameter.sig);
      }
    }
    return false;
  },

  generateOtp: function (email) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const key = 'OTP_' + email.trim().toLowerCase();
    CacheService.getScriptCache().put(key, code, 900); // 15 min
    return code;
  },

  verifyOtp: function (email, code) {
    const key = 'OTP_' + email.trim().toLowerCase();
    const stored = CacheService.getScriptCache().get(key);
    if (stored && stored === String(code).trim()) {
      CacheService.getScriptCache().remove(key);
      return true;
    }
    return false;
  }
};
