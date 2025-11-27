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
 * @return {Object|null} {batteryLevel, rangeKm, chargingState, isPlugged, minutesToFull, timestamp} ou null en cas d'erreur.
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

    var data = {
      batteryLevel: json.charge_state.battery_level,
      rangeKm: Math.round(json.charge_state.battery_range * 1.60934),
      chargingState: json.charge_state.charging_state,
      minutesToFull: json.charge_state.minutes_to_full_charge,
      isPlugged: json.charge_state.charge_port_door_open || (json.charge_state.charging_state !== 'Disconnected'),
      timestamp: new Date()
    };

    Logger.log('Tesla Data : ' + data.batteryLevel + '% | ' + data.rangeKm + 'km | Statut: ' + data.chargingState);
    return data;
  } catch (e) {
    Logger.log('EXCEPTION dans getTeslaData : ' + e.toString());
    return null;
  }
}

/**
 * Tache planifiee : verifie la sante de la batterie et envoie un email si seuil critique.
 */
function checkBatteryHealth() {
  var configTesla = getTeslaConfig_();
  var data = getTeslaData(false);

  if (!data) {
    Logger.log('Pas de donnees disponibles pour checkBatteryHealth.');
    return;
  }

  if (data.batteryLevel < configTesla.SEUIL_ALERTE && data.chargingState !== 'Charging') {
    if (!configTesla.EMAIL_ALERTE) {
      Logger.log('Alerte batterie non envoyee : EMAIL_ALERTE manquant.');
      return;
    }

    var subject = 'ALERTE BATTERIE TESLA : ' + data.batteryLevel + '%';
    var body = 'Bonjour Emmanuel,\n\n' +
               'Niveau de batterie critique detecte sur la Tesla Model Y.\n' +
               '---------------------------------------\n' +
               '- Niveau actuel : ' + data.batteryLevel + '%\n' +
               '- Autonomie estimee : ' + data.rangeKm + ' km\n' +
               '- Statut : ' + data.chargingState + '\n' +
               '---------------------------------------\n\n' +
               'Action requise : branche le vehicule pour assurer les livraisons.\n\n' +
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
    Logger.log('Sante batterie OK (>= ' + configTesla.SEUIL_ALERTE + '% ou en charge).');
  }
}

/**
 * Optionnel : enregistre l'historique de charge dans un onglet Google Sheet.
 */
function logTeslaHistory() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = 'Suivi_Tesla';
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(['Date', 'Heure', 'Batterie %', 'Autonomie Km', 'Statut', 'Branche ?']);
      sheet.setFrozenRows(1);
    }

    var data = getTeslaData(false);

    if (data) {
      var now = new Date();
      sheet.appendRow([
        Utilities.formatDate(now, Session.getScriptTimeZone(), 'dd/MM/yyyy'),
        Utilities.formatDate(now, Session.getScriptTimeZone(), 'HH:mm:ss'),
        data.batteryLevel,
        data.rangeKm,
        data.chargingState,
        data.isPlugged ? 'Oui' : 'Non'
      ]);
    }
  } catch (e) {
    Logger.log('Erreur dans logTeslaHistory : ' + e.toString());
  }
}
