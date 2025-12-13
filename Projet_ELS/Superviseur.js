/**
 * Superviseur (Monitoring)
 * Vérifie la fraîcheur des données critiques et alerte en cas de panne silencieuse.
 */

/**
 * Vérifie l'activité des systèmes critiques (Tesla, Logs).
 * Alerte si aucune mise à jour depuis > 24h.
 */
function monitorSystemHealth() {
  try {
    var alerts = [];
    var now = new Date();
    var twentyFourHours = 24 * 60 * 60 * 1000;

    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. Vérification Tesla (Feuille 'Tesla_Rapport', Cellule B2 = Timestamp)
    var sheetTesla = ss.getSheetByName('Tesla_Rapport');
    if (sheetTesla) {
      // On suppose que B2 contient la date sous forme de string ou date object
      // Format écrit par Tesla.js : "dd/MM/yyyy HH:mm:ss" ou objet date selon implémentation
      // Dans Tesla.js Phase 2 : updateTeslaDashboard_ écrit un string formatted.
      // On va essayer de parser ou de lire la raw value si c'est reconnu comme date.
      var lastUpdateVal = sheetTesla.getRange("B2").getValue();
      var lastUpdateTesla = parseDate_(lastUpdateVal);

      if (!lastUpdateTesla || (now - lastUpdateTesla > twentyFourHours)) {
        alerts.push({
          system: "Module Tesla",
          lastSeen: lastUpdateVal || "Inconnu",
          status: "Inactif depuis > 24h"
        });
      }
    } else {
      alerts.push({ system: "Module Tesla", status: "Feuille 'Tesla_Rapport' introuvable" });
    }

    // 2. Vérification Logs Livraisons (Feuille 'TRACE_Livraisons', Dernière ligne)
    // Nom défini dans API_Mobile_Handler : "TRACE_Livraisons"
    var sheetTrace = ss.getSheetByName('TRACE_Livraisons');
    if (sheetTrace) {
      var lastRow = sheetTrace.getLastRow();
      if (lastRow > 1) { // Il y a des données (hors header)
        // Timestamp en colonne A (index 1)
        var lastLogVal = sheetTrace.getRange(lastRow, 1).getValue();
        var lastLogDate = new Date(lastLogVal);

        if (isNaN(lastLogDate.getTime()) || (now - lastLogDate > twentyFourHours)) {
          alerts.push({
            system: "Tracking Livraisons",
            lastSeen: lastLogVal,
            status: "Aucune livraison reçue depuis > 24h"
          });
        }
      } else {
         // Pas de données, peut-être normal au début, mais suspect en prod
         alerts.push({ system: "Tracking Livraisons", status: "Feuille vide (hors header)" });
      }
    } else {
      alerts.push({ system: "Tracking Livraisons", status: "Feuille 'TRACE_Livraisons' introuvable" });
    }

    // 3. Traitement des alertes
    if (alerts.length > 0) {
      sendSuperviseurAlert_(alerts);
    } else {
      Logger.log("Superviseur : Tous les systèmes sont nominaux.");
    }

  } catch (e) {
    Logger.log("Erreur monitorSystemHealth : " + e.toString());
  }
}

/**
 * Génère une alerte sarcastique via Gemini et l'envoie par email.
 */
function sendSuperviseurAlert_(alerts) {
  var alertsText = alerts.map(function(a) {
    return "- " + a.system + " : " + a.status + " (Dernière activité : " + a.lastSeen + ")";
  }).join("\n");

  var systemPrompt = `
    Tu es "Le Superviseur", une IA chargée de surveiller les scripts d'automatisation de EL Services.
    Tu as détecté des anomalies (scripts endormis ou plantés).

    Ton style est : Sarcastique, un peu passif-agressif, mais informatif.
    Tu dois te moquer gentiment du développeur (Emmanuel) tout en lui donnant les infos techniques précises.

    Anomalies détectées :
    ${alertsText}
  `;

  var userPrompt = "Génère une alerte email courte pour Emmanuel.";

  var emailBody = callGeminiFlash(systemPrompt, userPrompt, 0.4);

  // Envoi
  var adminEmail = (typeof Config !== 'undefined' && Config.ADMIN_EMAIL)
                   ? Config.ADMIN_EMAIL
                   : PropertiesService.getScriptProperties().getProperty("ADMIN_EMAIL");

  if (adminEmail) {
    MailApp.sendEmail({
      to: adminEmail,
      subject: "🚨 ALERTE SUPERVISEUR : Ça dort ici !",
      body: emailBody
    });
    Logger.log("Alerte Superviseur envoyée.");
  }
}

/**
 * Tente de parser une date (String FR ou Date Object).
 */
function parseDate_(val) {
  if (val instanceof Date) return val;
  if (typeof val === 'string') {
    // Format attendu "dd/MM/yyyy HH:mm:ss"
    // Hack simple pour GAS : reformatage pour new Date()
    // Attention : new Date() JS préfère "MM/dd/yyyy" ou ISO
    var parts = val.split(' ');
    if (parts.length === 2) {
      var dateParts = parts[0].split('/');
      var timeParts = parts[1].split(':');
      if (dateParts.length === 3) {
        return new Date(dateParts[2], dateParts[1] - 1, dateParts[0], timeParts[0] || 0, timeParts[1] || 0, timeParts[2] || 0);
      }
    }
  }
  return null;
}

/**
 * Configure le trigger quotidien (à lancer manuellement).
 */
function setupSuperviseurTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'monitorSystemHealth') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  // Trigger tous les matins à 8h
  ScriptApp.newTrigger('monitorSystemHealth')
    .timeBased()
    .everyDays(1)
    .atHour(8)
    .create();

  Logger.log("Trigger 'monitorSystemHealth' installé (Tous les jours à 08h00).");
}
