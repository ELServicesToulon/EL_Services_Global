/**
 * CONFIGURATION GLOBALE - EL SERVICES
 * Ce fichier centralise toutes les constantes, IDs et paramètres.
 * Règle d'or : Aucune donnée "en dur" dans les autres fichiers de script.
 */

var Config = {
  
  // 1. IDENTITÉ DE L'APPLICATION
  // Modifier selon le projet (ELS, Livreur ou Resideur)
  APP_INFO: {
    NAME: "EL_Services_Global", 
    VERSION: "1.0.0",
    ENV: "PROD" // Options: "DEV" ou "PROD"
  },

  // 2. DIRIGEANT & ADMIN
  OWNER: {
    COMPANY: "EL Services",
    NAME: "Emmanuel Lecourt",
    EMAIL: "contact@elservices.fr", // À vérifier
    ADDRESS: "255 Bis Avenue Marcel Castie, 83000 Toulon",
    SIREN: "480 913 060"
  },

  // 3. IDs GOOGLE (DRIVE, SHEETS, FORMS)
  // C'est ici qu'on colle les IDs. Si un ID est vide, le script le signalera.
  IDS: {
    DB_SPREADSHEET: "",   // ID de la Google Sheet Base de Données
    FOLDER_ROOT: "",      // ID du dossier racine Drive
    FOLDER_INVOICES: "",  // ID dossier Factures
    FOLDER_ARCHIVES: ""   // ID dossier Archives
  },

  // 4. PARAMÈTRES MÉTIER
  BUSINESS: {
    TVA_RATE: 0.20,
    CURRENCY: "EUR",
    DEFAULT_CITY: "Toulon"
  },

  // 5. MÉTHODES UTILITAIRES (NE PAS TOUCHER)
  /**
   * Récupère un ID et lance une erreur s'il est manquant.
   * @param {string} key - La clé de l'ID dans l'objet IDS (ex: 'DB_SPREADSHEET')
   * @return {string} L'ID
   */
  getId: function(key) {
    var id = this.IDS[key];
    if (!id || id === "") {
      // En DEV, on log l'erreur, en PROD on bloque pour éviter la corruption
      console.error("⚠️ ALERTE CONFIG : L'ID '" + key + "' est manquant dans Config.gs");
      if (this.APP_INFO.ENV === "PROD") {
        throw new Error("Configuration manquante : " + key);
      }
    }
    return id;
  },

  /**
   * Vérifie si nous sommes en mode Production
   */
  isProd: function() {
    return this.APP_INFO.ENV === "PROD";
  }
};