/**
 * CONFIGURATION GLOBALE - EL SERVICES (PROJET ELS)
 * Centralisation des IDs et paramètres.
 */

var Config = {
  
  // 1. IDENTITÉ
  APP_INFO: {
    NAME: "EL_Services_Admin", 
    VERSION: "2.0.2", // Mise à jour ID Sheet
    ENV: "PROD" 
  },

  // 2. DIRIGEANT
  OWNER: {
    COMPANY: "EL Services Littoral",
    NAME: "Emmanuel Lecourt",
    EMAIL: "elservicestoulon@gmail.com",
    ADDRESS: "255 Bis Avenue Marcel Castie, 83000 Toulon",
    SIREN: "480 913 060",
    RIB: "FR76 4061 8804 7600 0403 5757 187"
  },

  // 3. IDs GOOGLE (MIS À JOUR)
  IDS: {
    // --- LE CERVEAU (Base de Données) ---
    // ID extrait de ton lien
    DB_SPREADSHEET: "1AzWdQQ4UEq0Fvr_iTpDY5TiXn55ij30_okIxIG5p_OM", 
    
    // Le Calendrier Principal
    CALENDAR_ID: "elservicestoulon@gmail.com",
    
    // Dossiers Drive (Archives/Factures)
    FOLDER_ARCHIVES: "1UavaEsq6TkDw1QzJZ91geKyF7hrQY4S8", 
    FOLDER_INVOICES: "1UavaEsq6TkDw1QzJZ91geKyF7hrQY4S8", 
    
    // --- LE MODÈLE FACTURE ---
    // ID détecté pour 'Modele_Facture_ELS (1)'
    TEMPLATE_INVOICE: "1dceBMePjZhpSALkt2_wVxRM-2DtK9LGjEXS0qMqnZRo"
  },

  // 4. PARAMÈTRES MÉTIER
  BUSINESS: {
    TVA_APPLICABLE: false,
    TVA_RATE: 0.20,
    CURRENCY: "EUR",
    SERVICE_START: "08:30",
    SERVICE_END: "18:30"
  },

  // 5. MÉTHODES UTILITAIRES
  getId: function(key) {
    var id = this.IDS[key];
    if (!id || id === "") {
      console.error("⚠️ ALERTE CONFIG : L'ID '" + key + "' est manquant.");
      if (this.APP_INFO.ENV === "PROD") throw new Error("Config manquante : " + key);
    }
    return id;
  },
  
  isProd: function() { return this.APP_INFO.ENV === "PROD"; }
};