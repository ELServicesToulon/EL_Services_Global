/**
 * @fileoverview Gestion centralisée de la configuration pour EL Services.
 * @author EL Services (Lead Dev)
 */

var Config = (function() {
  // Cache local pour éviter les appels API PropertiesService répétitifs
  var _cache = null;

  /**
   * Charge et met en cache toutes les propriétés du script.
   * @private
   */
  function _loadCache() {
    if (_cache === null) {
      try {
        _cache = PropertiesService.getScriptProperties().getProperties();
      } catch (e) {
        console.error("CRITICAL: Impossible de charger les propriétés du script.", e);
        // Fallback vide pour éviter le crash complet, mais l'app ne fonctionnera pas correctement
        _cache = {};
      }
    }
  }

  /**
   * Récupère une propriété par sa clé.
   * @param {string} key - La clé de la propriété.
   * @param {boolean} [isOptional=false] - Si true, ne log pas d'erreur si manquant.
   * @return {string} La valeur de la propriété ou une chaîne vide.
   */
  function _get(key, isOptional) {
    _loadCache();
    var value = _cache[key];
    if (value === undefined || value === null) {
      if (!isOptional) {
        console.warn("CONFIGURATION: La propriété '" + key + "' est manquante.");
      }
      return "";
    }
    return value;
  }

  // --- Interface Publique ---
  return {
    // Méthode générique
    get: function(key) { return _get(key); },

    // --- ACCESSEURS TYPÉS (Getters) ---
    // Permet de centraliser les clés et d'éviter les fautes de frappe ailleurs dans le code

    // Identifiants Dossiers & Fichiers
    get ID_DOSSIER_FACTURES() { return _get("ID_DOSSIER_FACTURES"); },
    get ID_DOSSIER_ARCHIVES() { return _get("ID_DOSSIER_ARCHIVES"); },
    get ID_DOSSIER_TEMPORAIRE() { return _get("ID_DOSSIER_TEMPORAIRE"); },
    get ID_DOCUMENT_CGV() { return _get("ID_DOCUMENT_CGV"); },
    get ID_MODELE_FACTURE() { return _get("ID_MODELE_FACTURE"); },
    get ID_FEUILLE_CALCUL() { return _get("ID_FEUILLE_CALCUL"); },

    // Identifiants Images & Assets
    get ID_LOGO() { return _get("ID_LOGO"); },
    get ID_LOGO_FACTURE() { return _get("ID_LOGO_FACTURE"); },

    // Informations Entreprise
    get NOM_ENTREPRISE() { return _get("NOM_ENTREPRISE"); },
    get ADRESSE_ENTREPRISE() { return _get("ADRESSE_ENTREPRISE"); },
    get EMAIL_ENTREPRISE() { return _get("EMAIL_ENTREPRISE"); },
    get ADMIN_EMAIL() { return _get("ADMIN_EMAIL"); }, // Souvent identique à EMAIL_ENTREPRISE mais séparé par sécurité
    get ID_CALENDRIER() { return _get("ID_CALENDRIER"); }, // Souvent l'email
    get SIRET() { return _get("SIRET"); },
    get RIB_ENTREPRISE() { return _get("RIB_ENTREPRISE"); },

    // Sécurité & API
    get GEMINI_API_KEY() { return _get("GEMINI_API_KEY"); },
    get ELS_SHARED_SECRET() { return _get("ELS_SHARED_SECRET"); },
    get TRACE_SECRET() { return _get("TRACE_SECRET"); },

    // URLs & WebHooks
    get LIVRAISON_WEBAPP_URL() { return _get("LIVRAISON_WEBAPP_URL"); },

    /**
     * Vérifie si la configuration minimale est présente.
     * @return {boolean} True si les clés critiques sont là.
     */
    isValid: function() {
      _loadCache();
      var criticalKeys = ["ID_DOSSIER_FACTURES", "NOM_ENTREPRISE", "ADMIN_EMAIL"];
      for (var i = 0; i < criticalKeys.length; i++) {
        if (!_cache[criticalKeys[i]]) return false;
      }
      return true;
    }
  };
})();

/**
 * FONCTION ADMINISTRATIVE UNIQUEMENT.
 * À exécuter manuellement UNE FOIS pour initialiser ou réparer les propriétés du script
 * basées sur l'export JSON du 25/11/2025.
 */
function SETUP_INIT_PROPERTIES() {
  var props = {
    "ID_DOSSIER_FACTURES": "1IGMRLuYcBnGzjWS9StI6slZjnkz8fa84",
    "ADMIN_EMAIL": "elservicestoulon@gmail.com",
    "NOM_ENTREPRISE": "EL Services",
    "GEMINI_API_KEY": "AIza...........secret", // ATTENTION: Remplace ceci par la vraie clé si tu ré-exécutes
    "RIB_ENTREPRISE": "FR76 4061 8804 7600 0403 5757 187",
    "ID_DOSSIER_ARCHIVES": "1HLBar6IvpJgrG_lfyRSKwNwib6U__w9U",
    "ID_DOCUMENT_CGV": "13nClmRx-6jsSf3NLT05gHy5QCFFDqAL5nA97aYPEMh0",
    "ID_CALENDRIER": "elservicestoulon@gmail.com",
    "LIVRAISON_WEBAPP_URL": "https://script.google.com/macros/s/AKfycbyiFQU2pfmb4GS7UfV4aU9Jre_IDJRsQbkOSaHdeNMoDgNcSE7ZScrjZ-HktkndUCqOYA/exec",
    "ADRESSE_ENTREPRISE": "255 B Avenue Marcel Castié, 83000 Toulon",
    "ELS_SHARED_SECRET": "Boofi",
    "EMAIL_ENTREPRISE": "elservicestoulon@gmail.com",
    "ID_DOSSIER_TEMPORAIRE": "1Rel3nGZBfUnt36WuuJ_IJVRmskEAFN9Y",
    "TRACE_SECRET": "ODE0ZTlkZTAtNGFmYy00NzkxLWEyMWEtZmIxOGEwOTUyZDkzMjUzYTU5ZjctNTQxOS00ZDFhLWFmMDYtNzgxZjUzYjZhOGExODM0Y2RlMWItNjMyZS00NTQwLTk4NjctMTQ2NTAxMmI0MTA3",
    "ID_LOGO": "1p10Rb3QBn3tUUs2M5zNiQzPn1YxnoPIW",
    "ID_MODELE_FACTURE": "1dceBMePjZhpSALkt2_wVxRM-2DtK9LGjEXS0qMqnZRo",
    "SIRET": "48091306000020",
    "ID_LOGO_FACTURE": "1p10Rb3QBn3tUUs2M5zNiQzPn1YxnoPIW",
    "ID_FEUILLE_CALCUL": "1AzWdQQ4UEq0Fvr_iTpDY5TiXn55ij30_okIxIG5p_OM"
  };

  try {
    // On ne supprime pas tout (.deleteAllProperties()) par sécurité, on écrase/ajoute seulement.
    PropertiesService.getScriptProperties().setProperties(props);
    console.log("SUCCÈS : Propriétés du script mises à jour avec " + Object.keys(props).length + " clés.");
  } catch (e) {
    console.error("ERREUR lors de l'initialisation des propriétés : " + e.toString());
  }
}
