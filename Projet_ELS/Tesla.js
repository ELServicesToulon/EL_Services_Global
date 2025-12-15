/**
 * @fileoverview Gestion de la Tesla via l'API Tessie (suivi batterie et alertes).
 * Secrets stockes dans les ScriptProperties:
 * - VIN_TESLA_JUNIPER_2025
 * - TOKEN_TESSIE
 * - SECRET (optionnel)
 */

/**
 * Charge la configuration Tesla depuis les ScriptProperties,
 * avec retour en arriere sur l'ancien bloc Config.TESLA si besoin.
 * @return {{VIN:string,TOKEN:string,SECRET:string,SEUIL_ALERTE:number,EMAIL_ALERTE:string}}
 */
function getTeslaConfig_() {
  var props;
  try {
    props = PropertiesService.getScriptProperties();
  } catch (err) {
    Logger.log('Impossible de lire les ScriptProperties Tesla : ' + err.toString());
    props = null;
  }

  var fallbackConfig = (typeof Config !== 'undefined' && Config.TESLA) ? Config.TESLA : null;
  var vin = props && (props.getProperty('VIN_TESLA_JUNIPER_2025') || props.getProperty('TESLA_VIN')) || (fallbackConfig ? fallbackConfig.VIN : '');
  var token = props && (props.getProperty('TOKEN_TESSIE') || props.getProperty('TESLA_TOKEN')) || (fallbackConfig ? fallbackConfig.TOKEN : '');
  var secret = props && (props.getProperty('SECRET') || props.getProperty('TESLA_SECRET')) || '';

  return {
    VIN: (vin || '').trim(),
    TOKEN: (token || '').trim(),
    SECRET: (secret || '').trim(),
    SEUIL_ALERTE: parseTeslaNumber_(props, 'TESLA_SEUIL_ALERTE', fallbackConfig ? fallbackConfig.SEUIL_ALERTE : 20),
    EMAIL_ALERTE: (props && props.getProperty('TESLA_EMAIL_ALERTE')) ||
      (fallbackConfig ? fallbackConfig.EMAIL_ALERTE : '') ||
      (typeof ADMIN_EMAIL !== 'undefined' ? ADMIN_EMAIL : 'elservicestoulon@gmail.com')
  };
}

/**
 * Convertit une valeur ScriptProperty en nombre avec valeur par defaut.
 * @param {PropertiesService.ScriptProperties|null} props
 * @param {string} key
 * @param {number} defaultValue
 * @return {number}
 */
function parseTeslaNumber_(props, key, defaultValue) {
  var raw = props && props.getProperty(key);
  var num = Number(raw);
  if (!isFinite(num)) {
    num = Number(defaultValue);
  }
  if (!isFinite(num)) {
    num = 0;
  }
  return num;
}

/**
 * Recupere les donnees telemetriques de la Tesla via Tessie.
 * @param {boolean} forceWake Si true, force le reveil de la voiture.
 * @return {Object|null} Objet riche avec charge_state, drive_state, vehicle_state.
 */
function getTeslaData(forceWake) {
  var configTesla = getTeslaConfig_();

  if (!configTesla.TOKEN || !configTesla.VIN) {
    Logger.log('ERREUR : configuration Tessie absente (TOKEN_TESSIE ou VIN_TESLA_JUNIPER_2025).');
    return null;
  }

  var useCache = forceWake ? 'false' : 'true';
  var url = 'https://api.tessie.com/' + encodeURIComponent(configTesla.VIN) + '/state?use_cache=' + useCache;

  var headers = {
    Authorization: 'Bearer ' + configTesla.TOKEN,
    Accept: 'application/json'
  };
  if (configTesla.SECRET) {
    headers['X-Tessie-Secret'] = configTesla.SECRET;
  }

  var options = {
    method: 'get',
    headers: headers,
    muteHttpExceptions: true
  };

  try {
    var response = UrlFetchApp.fetch(url, options);
    var code = response.getResponseCode();
    var text = response.getContentText();

    if (code !== 200) {
      Logger.log('ERREUR API TESLA (Code ' + code + '): ' + text);
      return null;
    }

    var json = JSON.parse(text);
    if (!json.charge_state) {
      Logger.log('Donnees charge_state absentes du retour Tessie.');
      return null;
    }

    // Extraction des donnees etendues pour le rapport complet
    var data = {
      batteryLevel: json.charge_state.battery_level,
      rangeKm: Math.round(json.charge_state.battery_range * 1.60934),
      chargingState: json.charge_state.charging_state,
      minutesToFull: json.charge_state.minutes_to_full_charge,
      isPlugged: json.charge_state.charge_port_door_open || (json.charge_state.charging_state !== 'Disconnected'),

      // Donnees de localisation et deplacement
      latitude: (json.drive_state && json.drive_state.latitude) || null,
      longitude: (json.drive_state && json.drive_state.longitude) || null,
      speed: (json.drive_state && json.drive_state.speed) || 0,

      // Etat vehicule et climat
      odometer: (json.vehicle_state && json.vehicle_state.odometer) ? Math.round(json.vehicle_state.odometer * 1.60934) : 0,
      insideTemp: (json.climate_state && json.climate_state.inside_temp) || null,
      isClimateOn: (json.climate_state && json.climate_state.is_climate_on) || false,

      timestamp: new Date()
    };

    // Enrichissement avec adresse si coordonnees presentes
    if (data.latitude && data.longitude) {
      data.address = getAddressFromCoords_(data.latitude, data.longitude);
    } else {
      data.address = "Localisation inconnue";
    }

    Logger.log('Tesla Data : ' + data.batteryLevel + '% | ' + data.rangeKm + 'km | Statut: ' + data.chargingState);
    return data;
  } catch (e) {
    Logger.log('EXCEPTION dans getTeslaData : ' + e.toString());
    return null;
  }
}

/**
 * Convertit lat/lng en adresse via Google Maps Geocoder.
 * @param {number} lat
 * @param {number} lng
 * @return {string}
 */
function getAddressFromCoords_(lat, lng) {
  try {
    var geo = Maps.newGeocoder().reverseGeocode(lat, lng);
    if (geo.status === 'OK' && geo.results && geo.results.length > 0) {
      return geo.results[0].formatted_address;
    }
  } catch (e) {
    Logger.log('Erreur Geocoding: ' + e.toString());
  }
  return lat + ', ' + lng;
}

/**
 * FONCTION PRINCIPALE DECLENCHEE PAR TRIGGER (07h/19h).
 * Genere un rapport complet dans Sheet pour Gemini, loggue l'historique et verifie les alertes.
 */
function genererRapportTesla() {
  // On tente d'utiliser le cache (false) pour eviter de reveiller la voiture inutilement,
  // sauf si l'utilisateur prefere des donnees fraiches le matin.
  // Pour le rapport du matin (planification), des donnees fraiches sont preferables -> forceWake=true ?
  // Tessie gere bien le cache, mettons forceWake=false par defaut pour economiser la batterie 12V,
  // car Tessie reveille la voiture periodiquement de toute facon.
  var data = getTeslaData(false);

  if (!data) {
    Logger.log("Echec de recuperation des donnees Tesla pour le rapport.");
    return;
  }

  // 1. Mise a jour du Dashboard pour Gemini
  updateTeslaDashboard_(data);

  // 2. Historisation (passe data pour eviter rappel API)
  logTeslaHistory(data);

  // 3. Verification sante batterie (passe data pour eviter rappel API)
  checkBatteryHealth(data);
}

/**
 * Met a jour l'onglet 'Tesla_Rapport' avec les donnees cles pour Gemini.
 * @param {Object} data Donnees issues de getTeslaData
 */
function updateTeslaDashboard_(data) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = 'Tesla_Rapport';
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      // Formatage initial pour lisibilite Gemini
      sheet.getRange("A1:B1").merge().setValue("RAPPORT ETAT TESLA").setFontWeight("bold").setHorizontalAlignment("center").setBackground("#cccccc");
    }

    var now = new Date();
    var timestampStr = Utilities.formatDate(now, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss');

    // Structure Key-Value claire pour l'IA
    var reportData = [
      ["DERNIERE MAJ", timestampStr],
      ["NIVEAU BATTERIE", data.batteryLevel + "%"],
      ["AUTONOMIE ESTIMEE", data.rangeKm + " km"],
      ["STATUT CHARGE", data.chargingState],
      ["TEMPS RESTANT CHARGE", data.minutesToFull > 0 ? Math.round(data.minutesToFull) + " min" : "N/A"],
      ["CABLE BRANCHE", data.isPlugged ? "OUI" : "NON"],
      ["LOCALISATION", data.address],
      ["LATITUDE", data.latitude],
      ["LONGITUDE", data.longitude],
      ["ODOMETRE", data.odometer + " km"],
      ["TEMPERATURE INT.", data.insideTemp ? data.insideTemp + " °C" : "N/A"],
      ["CLIMATISATION", data.isClimateOn ? "ACTIVE" : "ARRET"]
    ];

    // Ecriture en bloc (A2:B13)
    sheet.getRange(2, 1, reportData.length, 2).setValues(reportData);

    // Ajustement colonnes
    sheet.autoResizeColumn(1);
    sheet.setColumnWidth(2, 300); // Plus large pour l'adresse

    Logger.log("Rapport Tesla mis a jour avec succes.");
  } catch (e) {
    Logger.log("Erreur updateTeslaDashboard_: " + e.toString());
  }
}

/**
 * Tache planifiee : verifie la sante de la batterie par rapport a la tournee de DEMAIN
 * et envoie un email si seuil critique ou autonomie insuffisante.
 * @param {Object=} dataOptional Donnees deja recuperees (optionnel)
 */
function checkBatteryHealth(dataOptional) {
  var configTesla = getTeslaConfig_();
  var data = dataOptional || getTeslaData(false);

  if (!data) {
    Logger.log('Pas de donnees disponibles pour checkBatteryHealth.');
    return;
  }

  // 1. Estimation du besoin pour demain
  var needForTomorrow = calculateTomorrowDistance_();
  var safetyMargin = 1.2; // +20%
  var requiredRange = Math.round(needForTomorrow * safetyMargin);

  Logger.log('Besoin estime demain: ' + needForTomorrow + ' km. Autonomie requise (+20%): ' + requiredRange + ' km. Actuel: ' + data.rangeKm + ' km.');

  var isCritical = false;
  var alertReason = "";

  // Cas 1 : Batterie sous le seuil minimal absolu (ex: 20%)
  if (data.batteryLevel < configTesla.SEUIL_ALERTE) {
    isCritical = true;
    alertReason = "Niveau de batterie critique (< " + configTesla.SEUIL_ALERTE + "%)";
  }
  // Cas 2 : Autonomie insuffisante pour la tournee de demain
  else if (data.rangeKm < requiredRange) {
    isCritical = true;
    alertReason = "Autonomie insuffisante pour la tournée de demain (" + requiredRange + " km requis)";
  }

  // Envoi de l'alerte si critique ET pas en charge
  if (isCritical && data.chargingState !== 'Charging') {
    if (!configTesla.EMAIL_ALERTE) {
      Logger.log('Alerte batterie non envoyee : EMAIL_ALERTE manquant.');
      return;
    }

    var subject = 'ALERTE FLOTTE : ' + alertReason;
    var body = 'Bonjour Emmanuel,\n\n' +
      'Attention, un probleme d\'energie est detecte pour les operations a venir.\n\n' +
      'DETAILS VEHICULE :\n' +
      '------------------\n' +
      '- Niveau actuel : ' + data.batteryLevel + '%\n' +
      '- Autonomie : ' + data.rangeKm + ' km\n' +
      '- Statut : ' + data.chargingState + ' (NON BRANCHE)\n\n' +
      'PREVISIONS DEMAIN :\n' +
      '-------------------\n' +
      '- Km estimes : ' + needForTomorrow + ' km\n' +
      '- Besoins securises : ' + requiredRange + ' km (+20%)\n\n' +
      'ACTION REQUISE IMMEDIATEMENT :\n' +
      '>>> BRANCHER LE VEHICULE <<<\n\n' +
      'Assistant ELS';

    try {
      MailApp.sendEmail({
        to: configTesla.EMAIL_ALERTE,
        subject: subject,
        body: body
      });
      Logger.log('Alerte batterie envoyee a ' + configTesla.EMAIL_ALERTE);
    } catch (e) {
      Logger.log("Erreur lors de l'envoi de l'email d'alerte : " + e.toString());
    }
  } else {
    Logger.log('Sante batterie OK pour demain.');
  }
}

/**
 * Calcule l'estimation kilometrique pour la tournee de demain.
 * Base sur le nombre de reservations dans la feuille 'Réservations'.
 * Hypothese simplifiee : 40km de base + 5km par reservation.
 * @return {number} Distance estimee en km.
 */
function calculateTomorrowDistance_() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    // Utilise le nom de feuille defini dans Config ou par defaut 'Réservations'
    var sheetName = (typeof Config !== 'undefined' && Config.SHEET_RESERVATIONS) ? Config.SHEET_RESERVATIONS : 'Réservations';
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      Logger.log("Feuille Reservations introuvable pour calcul distance.");
      return 40; // Valeur par defaut securitaire
    }

    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return 40; // Pas de donnees

    // Determination de la date de "Demain" (sans heure)
    var tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    var tomorrowString = Utilities.formatDate(tomorrow, Session.getScriptTimeZone(), 'dd/MM/yyyy');

    // Index des colonnes (A adapter selon la structure reelle, ici hypothese standard)
    // On suppose que la date est en colonne A (index 0) ou B (index 1) - scan rapide
    // Dans ELS, la date est souvent colonne A (Date)
    var colDateIndex = 0;

    var countReservations = 0;

    // On saute l'en-tete
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var rowDate = row[colDateIndex];

      if (rowDate instanceof Date) {
        var rowDateString = Utilities.formatDate(rowDate, Session.getScriptTimeZone(), 'dd/MM/yyyy');
        if (rowDateString === tomorrowString) {
          countReservations++;
        }
      }
    }

    // Modele de calcul : Base journaliere (aller-retour entrepot) + detour par client
    // Base fixe : 40 km (Toulon periph)
    // Par client : +5 km (moyenne urbaine)
    var estimatedKm = 40 + (countReservations * 5);

    Logger.log("Estimation pour demain (" + tomorrowString + ") : " + countReservations + " reservations -> " + estimatedKm + " km.");

    return estimatedKm;

  } catch (e) {
    Logger.log("Erreur calculateTomorrowDistance_: " + e.toString());
    return 50; // Valeur par defaut en cas d'erreur
  }
}

/**
 * Optionnel : enregistre l'historique de charge dans un onglet Google Sheet.
 * @param {Object=} dataOptional Donnees deja recuperees (optionnel)
 */
function logTeslaHistory(dataOptional) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = 'Suivi_Tesla';
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(['Date', 'Heure', 'Batterie %', 'Autonomie Km', 'Statut', 'Branche ?', 'Localisation', 'Odomètre']);
      sheet.setFrozenRows(1);
    }

    var data = dataOptional || getTeslaData(false);

    if (data) {
      var now = new Date();
      sheet.appendRow([
        Utilities.formatDate(now, Session.getScriptTimeZone(), 'dd/MM/yyyy'),
        Utilities.formatDate(now, Session.getScriptTimeZone(), 'HH:mm:ss'),
        data.batteryLevel,
        data.rangeKm,
        data.chargingState,
        data.isPlugged ? 'Oui' : 'Non',
        data.address || '',
        data.odometer || 0
      ]);
    }
  } catch (e) {
    Logger.log('Erreur dans logTeslaHistory : ' + e.toString());
  }
}

/**
 * Retourne un etat simplifie pour l'interface chauffeur (Tesla Junyper + mobile).
 * @param {boolean=} forceWake Force un reveil Tessie si true.
 * @return {Object} Payload pour google.script.run.
 */
function getTeslaStatusForUI(forceWake) {
  try {
    var config = getTeslaConfig_();
    if (!config.VIN || !config.TOKEN) {
      return {
        success: false,
        error: 'Configuration Tesla manquante (VIN_TESLA_JUNIPER_2025 ou TOKEN_TESSIE).'
      };
    }

    var data = getTeslaData(forceWake === true);
    if (!data) {
      return { success: false, error: 'Impossible de recuperer les donnees Tesla via Tessie.' };
    }

    var status = {
      batteryLevel: data.batteryLevel,
      rangeKm: data.rangeKm,
      chargingState: data.chargingState,
      isPlugged: data.isPlugged,
      minutesToFull: data.minutesToFull,
      timestamp: (data.timestamp instanceof Date) ? data.timestamp.toISOString() : data.timestamp
    };

    return {
      success: true,
      status: status,
      advice: buildTeslaAdvice_(status, config.SEUIL_ALERTE),
      threshold: config.SEUIL_ALERTE,
      source: forceWake ? 'forced_refresh' : 'cached_refresh'
    };
  } catch (err) {
    Logger.log('Erreur getTeslaStatusForUI : ' + err.toString());
    return { success: false, error: err.message || 'Erreur inconnue' };
  }
}

/**
 * Ajoute un message conseil pour le chauffeur selon le niveau de charge.
 * @param {{batteryLevel:number, rangeKm:number, chargingState:string, isPlugged:boolean, minutesToFull:number}|null} status
 * @param {number} threshold
 * @return {string}
 */
function buildTeslaAdvice_(status, threshold) {
  if (!status) return '';

  if (status.chargingState === 'Charging') {
    if (status.minutesToFull && status.minutesToFull > 0) {
      var hours = Math.round(status.minutesToFull / 60);
      return 'Charge en cours - plein estime dans ~' + hours + 'h';
    }
    return 'Charge en cours - verifier la prise avant de partir';
  }

  if (status.batteryLevel <= threshold) {
    return 'Batterie basse (' + status.batteryLevel + '%). Brancher avant le prochain depart.';
  }

  if (status.rangeKm && status.rangeKm < 80) {
    return 'Autonomie reduite (' + status.rangeKm + ' km). Prevoir une charge rapide.';
  }

  return 'Vehicule pret pour la tournee.';
}

/**
 * ==============================================================================
 * MODULE DE SUIVI DES COUTS (TESLA)
 * ==============================================================================
 */

// Configuration des coûts
var TESLA_COUT_KM = 0.20; // €/km (Electricité + Pneus + Usure)
var TESLA_ASSURANCE_MOIS = 90; // €/mois
var TESLA_PARKING_MOIS = 100; // €/mois
var TESLA_ENTRETIEN_ANNEE = 600; // €/an

/**
 * Crée le dossier de suivi dans le dossier Drive spécifié.
 * Folder ID: 144qdIbP-njNmy-m6F425s6WxRjntN4yb
 */
function createTeslaReportsFolder() {
  var parentId = '144qdIbP-njNmy-m6F425s6WxRjntN4yb';
  try {
    var parentFolder = DriveApp.getFolderById(parentId);
    var folderName = "Suivi_Couts_Tesla";

    var folders = parentFolder.getFoldersByName(folderName);
    var targetFolder;

    if (folders.hasNext()) {
      targetFolder = folders.next();
      Logger.log("Dossier existant trouvé: " + targetFolder.getUrl());
    } else {
      targetFolder = parentFolder.createFolder(folderName);
      Logger.log("Nouveau dossier créé: " + targetFolder.getUrl());
    }
    return targetFolder;
  } catch (e) {
    Logger.log("Erreur lors de la création du dossier Drive: " + e.toString());
    return null;
  }
}

/**
 * Calcule et enregistre les couts de la journée (ou de la veille).
 * A appeler via un trigger quotidien.
 * @param {Date=} dateOptionnelle Date à traiter (défaut: hier).
 */
function traiterCoutsJournaliersTesla(dateOptionnelle) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetName = 'Tesla_Couts';
  var sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    var headers = [
      'Date',
      'Client',
      'Km_Jour_Total',
      'Km_Impute_Client',
      'Cout_Variable_Client',
      'Cout_Fixe_Client',
      'Cout_Total_Client',
      'Type_Frais'
    ];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#f3f3f3');
    sheet.setFrozenRows(1);
  }

  var targetDate = dateOptionnelle || new Date(new Date().getTime() - 24 * 60 * 60 * 1000);
  var dateStr = Utilities.formatDate(targetDate, Session.getScriptTimeZone(), 'dd/MM/yyyy');

  Logger.log("Traitement des coûts pour la date : " + dateStr);

  var kmParcourus = getDailyKmFromHistory_(targetDate);
  if (kmParcourus <= 0) {
    kmParcourus = calculateEstimatedDistanceForDate_(targetDate);
  }

  Logger.log("Kilometrage retenu : " + kmParcourus + " km");

  var clients = getClientsServedOnDate_(targetDate);
  var nbClients = clients.length;

  if (nbClients === 0) {
    clients = ['STRUCTURE_INTERNE'];
    nbClients = 1;
  }

  var coutAssuranceJour = TESLA_ASSURANCE_MOIS / 30;
  var coutParkingJour = TESLA_PARKING_MOIS / 30;
  var coutEntretienJour = TESLA_ENTRETIEN_ANNEE / 365;
  var totalFixeJour = coutAssuranceJour + coutParkingJour + coutEntretienJour;

  var totalVariableJour = kmParcourus * TESLA_COUT_KM;

  var partFixeParClient = totalFixeJour / nbClients;
  var partVariableParClient = totalVariableJour / nbClients;
  var kmParClient = kmParcourus / nbClients;

  clients.forEach(function (client) {
    sheet.appendRow([
      targetDate,
      client,
      kmParcourus,
      kmParClient,
      partVariableParClient,
      partFixeParClient,
      partVariableParClient + partFixeParClient,
      "Quotidien"
    ]);
  });

  Logger.log("Coûts enregistrés pour " + dateStr);
}

/**
 * Récupère le kilométrage parcouru (Max - Min de la journée) via 'Suivi_Tesla'.
 */
function getDailyKmFromHistory_(dateObj) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  try {
    var sheet = ss.getSheetByName('Suivi_Tesla');
    if (!sheet) return 0;

    var dateStr = Utilities.formatDate(dateObj, Session.getScriptTimeZone(), 'dd/MM/yyyy');
    var data = sheet.getDataRange().getValues();

    var minOdo = -1;
    var maxOdo = -1;

    for (var i = 1; i < data.length; i++) {
      var rawDate = data[i][0];
      var rDateStr = rawDate;
      if (rawDate instanceof Date) {
        rDateStr = Utilities.formatDate(rawDate, Session.getScriptTimeZone(), 'dd/MM/yyyy');
      }

      if (rDateStr === dateStr) {
        var odo = parseFloat(data[i][7]); // Colonne H (index 7) odomètre
        if (!isNaN(odo) && odo > 0) {
          if (minOdo === -1 || odo < minOdo) minOdo = odo;
          if (maxOdo === -1 || odo > maxOdo) maxOdo = odo;
        }
      }
    }

    if (minOdo > 0 && maxOdo > 0) {
      return maxOdo - minOdo;
    }
  } catch (e) {
    Logger.log("Erreur getDailyKmFromHistory_: " + e);
  }
  return 0;
}

/**
 * Estime la distance si pas de télémétrie.
 */
function calculateEstimatedDistanceForDate_(dateObj) {
  var clients = getClientsServedOnDate_(dateObj);
  var nb = clients.length;
  if (nb === 0) return 0;
  return 40 + (nb * 5);
}

/**
 * Récupère les clients uniques livrés.
 */
function getClientsServedOnDate_(dateObj) {
  var clients = [];
  var dateStr = Utilities.formatDate(dateObj, Session.getScriptTimeZone(), 'dd/MM/yyyy');
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Réservations');

  if (!sheet) return [];

  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idxDate = -1;
  var idxClient = -1;

  for (var j = 0; j < headers.length; j++) {
    var h = String(headers[j]).toLowerCase();
    if (h === 'date') idxDate = j;
    if (h.indexOf('client') !== -1 && h.indexOf('raison') !== -1) idxClient = j;
    if (idxClient === -1 && h.indexOf('client') !== -1) idxClient = j;
  }

  if (idxDate === -1 || idxClient === -1) return [];

  for (var i = 1; i < data.length; i++) {
    var rDate = data[i][idxDate];
    if (rDate instanceof Date) {
      var rDateStr = Utilities.formatDate(rDate, Session.getScriptTimeZone(), 'dd/MM/yyyy');
      if (rDateStr === dateStr) {
        var cName = String(data[i][idxClient]).trim();
        if (cName && clients.indexOf(cName) === -1) {
          clients.push(cName);
        }
      }
    }
  }
  return clients;
}

