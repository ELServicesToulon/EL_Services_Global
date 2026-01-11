/**
 * Agent Qualité
 * Analyse les rapports de livraison pour détecter les anomalies récurrentes.
 */

/**
 * Analyse les livraisons des 7 derniers jours et envoie un rapport synthétique.
 */
function generateWeeklyQualityReport() {
  try {
    // 1. Récupération des données
    // On utilise Config.ID_FEUILLE_CALCUL si dispo, sinon fallback sur PropertiesService
    var sheetId = (typeof Config !== 'undefined' && Config.ID_FEUILLE_CALCUL)
                  ? Config.ID_FEUILLE_CALCUL
                  : PropertiesService.getScriptProperties().getProperty("ID_FEUILLE_CALCUL");

    if (!sheetId) {
      Logger.log("ID_FEUILLE_CALCUL manquant.");
      return;
    }

    var ss = SpreadsheetApp.openById(sheetId);
    var sheetName = "TRACE_Livraisons"; // Nom standard défini dans API_Mobile_Handler
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      Logger.log("Feuille " + sheetName + " introuvable.");
      return;
    }

    var data = sheet.getDataRange().getValues();
    if (data.length < 2) {
      Logger.log("Pas assez de données dans " + sheetName);
      return;
    }

    // Headers attendus: ["Timestamp", "Livreur", "Etablissement", "Statut", "Note", "GPS_Lat", "GPS_Lng"]
    var headers = data[0];
    var idxTime = headers.indexOf("Timestamp");
    var idxEtab = headers.indexOf("Etablissement");
    var idxStatut = headers.indexOf("Statut");
    var idxNote = headers.indexOf("Note");

    if (idxTime === -1 || idxStatut === -1) {
      Logger.log("Colonnes Timestamp ou Statut manquantes.");
      return;
    }

    // 2. Filtrage (7 derniers jours + Anomalies)
    var now = new Date();
    var sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);

    var anomalies = [];

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var rowDate = new Date(row[idxTime]);

      if (rowDate >= sevenDaysAgo && rowDate <= now) {
        var statut = row[idxStatut] ? String(row[idxStatut]).toUpperCase() : "";
        var note = row[idxNote] ? String(row[idxNote]) : "";

        // Critère d'anomalie : Statut != RAS ou Note explicite
        if (statut !== "RAS" || (note && note !== "RAS" && note !== "Aucune note")) {
          anomalies.push({
            date: Utilities.formatDate(rowDate, Session.getScriptTimeZone(), "dd/MM HH:mm"),
            etablissement: row[idxEtab],
            statut: statut,
            note: note
          });
        }
      }
    }

    if (anomalies.length === 0) {
      Logger.log("Aucune anomalie détectée cette semaine.");
      return;
    }

    // 3. Préparation du Prompt pour Gemini
    var anomaliesText = anomalies.map(function(a) {
      return "- " + a.date + " | " + a.etablissement + " | " + a.statut + " | " + a.note;
    }).join("\n");

    var systemPrompt = `
      Tu es l'Agent Qualité de EL Services. Ta mission est d'analyser les incidents de livraison.
      Voici la liste des anomalies signalées par les livreurs ces 7 derniers jours.
      Rédige un "Rapport Hebdomadaire Qualité" concis en français.

      Structure attendue :
      1. Résumé global (ex: "X anomalies détectées").
      2. Top des problèmes récurrents par Client (ex: "La Pharmacie Y est souvent fermée").
      3. Suggestions d'amélioration si pertinent.

      Reste factuel et professionnel.
    `;

    var userPrompt = "Voici les logs d'anomalies :\n" + anomaliesText;

    // 4. Appel IA
    var reportContent = callGeminiFlash(systemPrompt, userPrompt, 0.3);

    // 5. Envoi Email
    var adminEmail = (typeof Config !== 'undefined' && Config.ADMIN_EMAIL)
                     ? Config.ADMIN_EMAIL
                     : PropertiesService.getScriptProperties().getProperty("ADMIN_EMAIL");

    if (adminEmail) {
      MailApp.sendEmail({
        to: adminEmail,
        subject: "Rapport Qualité Hebdomadaire - EL Services",
        body: reportContent
      });
      Logger.log("Rapport envoyé à " + adminEmail);
    } else {
      Logger.log("Email Admin non configuré.");
    }

  } catch (e) {
    Logger.log("Erreur generateWeeklyQualityReport: " + e.toString());
  }
}
