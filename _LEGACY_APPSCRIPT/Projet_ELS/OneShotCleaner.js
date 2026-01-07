/**
 * SCRIPT DE MAINTENANCE PONCTUELLE
 * Objectif : Résoudre les "34 incohérences" historiques entre Agenda et Sheet.
 * Méthode : Calendar First (L'agenda a raison).
 * Action : Ne supprime rien physiquement, marque "Annulée" ou met à jour les horaires.
 */

// --- CONFIGURATION DU NETTOYAGE ---
var CLEANER_CONFIG = {
  // Période à scanner (large pour couvrir les logs de novembre)
  DAYS_BACK: 60, 
  DAYS_FORWARD: 30,
  
  // Mapping des colonnes (Basé sur tes fichiers Facturation_X.csv)
  // [0]Date, [1]Client, ... [6]Statut, [11]ID_Reservation
  COL_DATE: 0,
  COL_STATUT: 6,
  COL_ID_RESA: 11,
  
  // Nom de la feuille cible (celle qui contient les réservations actives)
  // Si tu utilises des feuilles mensuelles, change ce nom ou mets l'ID exact dans Config
  SHEET_NAME_OR_INDEX: 0 // 0 = La première feuille du classeur
};

function runManualCleanup() {
  console.log("🧹 DÉBUT DU NETTOYAGE MANUEL...");
  var report = [];

  try {
    // 1. ACCÈS AUX DONNÉES
    var calendarId = (typeof Config !== 'undefined') ? Config.IDS.CALENDAR : PropertiesService.getScriptProperties().getProperty('ID_CALENDRIER');
    var sheetId = (typeof Config !== 'undefined') ? Config.FILES.RESERVATIONS_DB : PropertiesService.getScriptProperties().getProperty('ID_SHEET_RESERVATIONS');

    if (!calendarId || !sheetId) {
      throw new Error("Impossible de trouver les IDs (Calendar ou Sheet) dans la Config.");
    }

    var calendar = CalendarApp.getCalendarById(calendarId);
    var sheet = SpreadsheetApp.openById(sheetId).getSheets()[0]; // Cible la 1ère feuille par défaut
    
    // Définir la plage de temps
    var now = new Date();
    var startDate = new Date(now.getTime() - (CLEANER_CONFIG.DAYS_BACK * 24 * 60 * 60 * 1000));
    var endDate = new Date(now.getTime() + (CLEANER_CONFIG.DAYS_FORWARD * 24 * 60 * 60 * 1000));

    console.log("Période analysée : " + startDate.toLocaleDateString() + " au " + endDate.toLocaleDateString());

    // 2. LECTURE CALENDRIER
    var calEvents = calendar.getEvents(startDate, endDate);
    // Création d'une Map pour recherche rapide : { "RESA-XXX": EventObject }
    var calMap = {};
    calEvents.forEach(function(evt) {
      var desc = evt.getDescription();
      var match = desc.match(/RESA-[a-zA-Z0-9-]+/);
      if (match) {
        calMap[match[0]] = evt;
      }
    });
    console.log("Agenda : " + Object.keys(calMap).length + " réservations identifiées.");

    // 3. LECTURE SHEET
    var dataRange = sheet.getDataRange();
    var values = dataRange.getValues();
    var modifications = 0;

    // 4. ANALYSE LIGNE PAR LIGNE
    // On commence à i=1 pour sauter les en-têtes
    for (var i = 1; i < values.length; i++) {
      var row = values[i];
      var resaId = String(row[CLEANER_CONFIG.COL_ID_RESA]).trim();
      var dateSheet = row[CLEANER_CONFIG.COL_DATE];
      var statutSheet = row[CLEANER_CONFIG.COL_STATUT];

      // On ne traite que les lignes avec un ID RESA valide et une date dans la plage
      if (resaId.indexOf("RESA-") === 0 && dateSheet instanceof Date && dateSheet >= startDate && dateSheet <= endDate) {
        
        // CAS A : La réservation est dans le Sheet, mais existe-t-elle dans l'Agenda ?
        if (calMap[resaId]) {
          // OUI -> Elle existe. Vérifions la cohérence horaire.
          var calEvent = calMap[resaId];
          var calDate = calEvent.getStartTime();
          
          // Tolérance de 1 minute
          if (Math.abs(calDate.getTime() - dateSheet.getTime()) > 60000) {
            // Incohérence horaire -> On corrige le Sheet (L'agenda gagne)
            sheet.getRange(i + 1, CLEANER_CONFIG.COL_DATE + 1).setValue(calDate);
            sheet.getRange(i + 1, CLEANER_CONFIG.COL_STATUT + 1).setValue("Modifiée (Synchro)");
            report.push("FIX HORAIRE : " + resaId + " (" + dateSheet.toLocaleTimeString() + " -> " + calDate.toLocaleTimeString() + ")");
            modifications++;
          } else {
            // Tout va bien, on s'assure juste que le statut n'est pas "Annulée" si l'event existe
            if (statutSheet === "Annulée" || statutSheet === "Supprimée") {
              sheet.getRange(i + 1, CLEANER_CONFIG.COL_STATUT + 1).setValue("Confirmée");
              report.push("RÉACTIVATION : " + resaId + " (Retrouvée dans l'agenda)");
              modifications++;
            }
          }

        } else {
          // NON -> Elle est dans le Sheet mais PAS dans l'Agenda (Fantôme).
          // Action : On la marque Annulée dans le Sheet.
          if (statutSheet !== "Annulée" && statutSheet !== "Supprimée" && statutSheet !== "Archivée") {
            sheet.getRange(i + 1, CLEANER_CONFIG.COL_STATUT + 1).setValue("Annulée");
            // Optionnel : Ajouter une note
            // sheet.getRange(i + 1, 5).setValue(row[4] + " [Annulé auto: Absent Agenda]"); 
            report.push("NETTOYAGE FANTÔME : " + resaId + " (Marquée Annulée)");
            modifications++;
          }
        }
      }
    }

    console.log("✅ NETTOYAGE TERMINÉ.");
    console.log("Modifications effectuées : " + modifications);
    if (report.length > 0) {
      console.log("Détails :\n" + report.join("\n"));
    } else {
      console.log("Aucune incohérence trouvée sur cette période.");
    }

  } catch (e) {
    console.error("⛔ ERREUR DURANT LE NETTOYAGE : " + e.toString());
  }
}
