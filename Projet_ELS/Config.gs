/**
 * @fileoverview Gestionnaire centralisé de la configuration pour EL Services.
 * Lit les propriétés du script (défini dans Projet > Paramètres > Propriétés du script).
 */

var Config = (function() {
  
  // Cache pour éviter de rappeler PropertiesService à chaque fois
  var _cache = {};

  /**
   * Récupère une propriété du script.
   * @param {string} key - La clé de la propriété (ex: 'ID_FEUILLE_CALCUL').
   * @param {boolean} isRequired - Si true, lance une erreur si la clé est manquante.
   * @return {string} La valeur de la propriété.
   */
  function get(key, isRequired) {
    if (_cache[key]) return _cache[key];

    // Valeur par défaut pour isRequired = true
    if (isRequired === undefined) isRequired = true;

    try {
      var value = PropertiesService.getScriptProperties().getProperty(key);
      
      if (!value && isRequired) {
        throw new Error("Erreur Configuration : La clé '" + key + "' est manquante dans les propriétés du script.");
      }
      
      if (value) _cache[key] = value;
      return value;

    } catch (e) {
      console.error("Erreur critique Config.get : " + e.message);
      throw e; // On bloque l'exécution si une config critique manque
    }
  }

  return {
    // --- IDs des Feuilles Google Sheets ---
    get SPREADSHEET_ID() { return get('ID_FEUILLE_CALCUL'); },
    
    // --- IDs des Dossiers Drive ---
    get DRIVE_FACTURES_FOLDER_ID() { return get('ID_DOSSIER_FACTURES'); },
    get DRIVE_ARCHIVES_FOLDER_ID() { return get('ID_DOSSIER_ARCHIVES'); },
    get DRIVE_TEMP_FOLDER_ID() { return get('ID_DOSSIER_TEMPORAIRE'); },
    
    // --- IDs Docs Templates ---
    get TEMPLATE_CGV_ID() { return get('ID_DOCUMENT_CGV'); },
    get LOGO_ID() { return get('ID_LOGO'); }, // Pour insertion dans factures HTML

    // --- Infos Entreprise & Admin ---
    get ADMIN_EMAIL() { return get('ADMIN_EMAIL'); },
    get COMPANY_EMAIL() { return get('EMAIL_ENTREPRISE'); },
    get COMPANY_ADDRESS() { return get('ADRESSE_ENTREPRISE'); }, // Pour map
    get SHARED_SECRET() { return get('ELS_SHARED_SECRET'); }, // Pour sécuriser l'API WebApp

    // --- Clés API Externes ---
    get OPENAI_API_KEY() { return get('OPENAI_API_KEY', false); }, // Optionnel si on coupe l'IA

    // --- Méthode utilitaire pour vérifier l'accès ---
    checkConfiguration: function() {
      var status = "OK";
      var missing = [];
      var keys = ['ID_FEUILLE_CALCUL', 'ADMIN_EMAIL', 'ID_DOSSIER_FACTURES'];
      
      keys.forEach(function(k) {
        if (!PropertiesService.getScriptProperties().getProperty(k)) {
          missing.push(k);
        }
      });

      if (missing.length > 0) return "MANQUANT: " + missing.join(", ");
      return status;
    }
  };
})();
