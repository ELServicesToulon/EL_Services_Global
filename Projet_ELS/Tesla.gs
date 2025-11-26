/**
 * @fileoverview Gestion de la flotte (Tesla Model Y) pour EL Services via API Tessie.
 * Ce module gère la récupération de l'état batterie et les alertes de sécurité.
 * * DÉPENDANCE : Nécessite l'objet 'Config.TESLA' dans le fichier Configuration.js
 */

// --- FONCTIONS PRINCIPALES ---

/**
 * Récupère les données télémétriques de la Tesla.
 * Utilise l'API Tessie pour minimiser l'impact sur la batterie du véhicule (Vampire drain).
 * * @param {boolean} forceWake - Si true, force le réveil de la voiture (A utiliser avec précaution).
 * @return {Object|null} Un objet contenant {batteryLevel, rangeKm, chargingState, isPlugged} ou null en cas d'erreur.
 */
function getTeslaData(forceWake) {
  // 1. VÉRIFICATION DE LA CONFIGURATION
  var configTesla = Config.TESLA;

  if (!configTesla || !configTesla.TOKEN || !configTesla.VIN || configTesla.TOKEN === 'TON_TOKEN_TESSIE_ICI' || configTesla.VIN === 'TON_VIN_TESLA_ICI') {
    Logger.log("ERREUR : Le module Tesla n'est pas correctement configuré. Le TOKEN ou le VIN sont manquants ou non initialisés dans Configuration.js.");
    return null;
  }

  // 2. PRÉPARATION DE LA REQUÊTE
  // Si forceWake est faux (par défaut), on utilise le cache de Tessie
  var useCache = forceWake ? 'false' : 'true';
  var url = 'https://api.tessie.com/' + configTesla.VIN + '/state?use_cache=' + useCache;

  var options = {
    'method': 'get',
    'headers': {
      'Authorization': 'Bearer ' + configTesla.TOKEN,
      'Accept': 'application/json'
    },
    'muteHttpExceptions': true
  };

  // 3. EXÉCUTION SÉCURISÉE
  try {
    var response = UrlFetchApp.fetch(url, options);
    var code = response.getResponseCode();
    var text = response.getContentText();

    if (code !== 200) {
      Logger.log('ERREUR API TESLA (Code ' + code + '): ' + text);
      return null;
    }

    var json = JSON.parse(text);

    // Vérification que les données de charge sont accessibles
    // Si la voiture dort profondément et qu'on utilise le cache, ces données peuvent être anciennes mais présentes
    if (!json.charge_state) {
      Logger.log("Données charge_state absentes du retour API.");
      return null;
    }

    // 4. NORMALISATION DES DONNÉES
    var data = {
      batteryLevel: json.charge_state.battery_level, // Pourcentage entier
      rangeKm: Math.round(json.charge_state.battery_range * 1.60934), // Conversion Miles -> Km
      chargingState: json.charge_state.charging_state, // ex: "Charging", "Stopped", "Disconnected", "Complete"
      minutesToFull: json.charge_state.minutes_to_full_charge,
      isPlugged: json.charge_state.charge_port_door_open || (json.charge_state.charging_state !== "Disconnected"),
      timestamp: new Date()
    };

    Logger.log('✅ Tesla Data : ' + data.batteryLevel + '% | ' + data.rangeKm + 'km | Statut: ' + data.chargingState);
    return data;

  } catch (e) {
    Logger.log("EXCEPTION CRITIQUE dans getTeslaData : " + e.toString());
    // Envoi d'un mail d'erreur admin si nécessaire (optionnel)
    return null;
  }
}

/**
 * TÂCHE PLANIFIÉE : Vérifie la santé de la batterie.
 * À déclencher via Trigger (ex: Tous les jours à 19h00 et 07h00).
 * N'envoie un email QUE si le niveau est critique.
 */
function checkBatteryHealth() {
  // Récupération de la config pour l'email
  var configTesla = Config.TESLA;

  // false = on ne réveille pas la voiture, on lit le dernier état connu
  var data = getTeslaData(false);

  if (!data) {
    Logger.log("Pas de données disponibles pour checkBatteryHealth.");
    return;
  }

  // LOGIQUE MÉTIER : Alerte seuil critique
  // Si batterie inférieure au seuil ET que la voiture ne charge pas
  if (data.batteryLevel < configTesla.SEUIL_ALERTE && data.chargingState !== 'Charging') {

    var subject = "⚠️ ALERTE BATTERIE TESLA : " + data.batteryLevel + "%";
    var body = "Bonjour Emmanuel,\n\n" +
               "Niveau de batterie critique détecté sur la Tesla Model Y.\n" +
               "---------------------------------------------------\n" +
               "🔋 Niveau actuel : " + data.batteryLevel + "%\n" +
               "🚗 Autonomie est. : " + data.rangeKm + " km\n" +
               "⚡ Statut : " + data.chargingState + "\n" +
               "---------------------------------------------------\n\n" +
               "Action requise : Pense à brancher le véhicule pour assurer les livraisons.\n\n" +
               "Cordialement,\n" +
               "Ton Assistant ELS";

    try {
      MailApp.sendEmail({
        to: configTesla.EMAIL_ALERTE,
        subject: subject,
        body: body
      });
      Logger.log("📧 Alerte batterie envoyée à " + configTesla.EMAIL_ALERTE);
    } catch (e) {
      Logger.log("Erreur lors de l'envoi de l'email d'alerte : " + e.toString());
    }
  } else {
    Logger.log("Santé batterie OK (Supérieure à " + configTesla.SEUIL_ALERTE + "% ou en charge).");
  }
}

/**
 * (Optionnel) Enregistre l'historique de charge dans un Google Sheet pour analyse.
 * Utile pour calculer le coût électrique vs Kilomètres.
 */
function logTeslaHistory() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = 'Suivi_Tesla';
    var sheet = ss.getSheetByName(sheetName);

    // Initialisation automatique si l'onglet n'existe pas
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(['Date', 'Heure', 'Batterie %', 'Autonomie Km', 'Statut', 'Branché ?']);
      sheet.setFrozenRows(1);
    }

    var data = getTeslaData(false); // Toujours privilégier le cache

    if (data) {
      var now = new Date();
      sheet.appendRow([
        Utilities.formatDate(now, Session.getScriptTimeZone(), "dd/MM/yyyy"),
        Utilities.formatDate(now, Session.getScriptTimeZone(), "HH:mm:ss"),
        data.batteryLevel,
        data.rangeKm,
        data.chargingState,
        data.isPlugged ? 'Oui' : 'Non'
      ]);
    }
  } catch (e) {
    Logger.log("Erreur dans logTeslaHistory : " + e.toString());
  }
}
