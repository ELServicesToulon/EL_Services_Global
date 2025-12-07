/**
 * Backend_Handler.gs
 * Gestion des requêtes provenant de l'App Livreur (Tesla/Android)
 * Rôle : Servir les données établissements et enregistrer les rapports de livraison.
 */

var MobileAPI_Config = {
  // Remplacer par les IDs réels ou utiliser PropertiesService
  ID_SPREADSHEET_DATA: PropertiesService.getScriptProperties().getProperty("ID_FEUILLE_CALCUL"),
  NOM_ONGLET_ETABLISSEMENTS: "Base_Etablissements",
  NOM_ONGLET_TRACE: "TRACE_Livraisons",
  ID_CALENDRIER: PropertiesService.getScriptProperties().getProperty("ID_CALENDRIER")
};

/**
 * Récupère les réservations du jour depuis Google Calendar.
 * Sert à afficher la "Feuille de route" au chauffeur.
 * @return {Object} {status: "success", data: Array}
 */
function api_getDailyReservations() {
  try {
    var calId = MobileAPI_Config.ID_CALENDRIER;
    if (!calId) {
      // Fallback si ID_CALENDRIER n'est pas dans les Props mais accessible via config globale simulée ou erreur
      throw new Error("ID_CALENDRIER non défini dans les ScriptProperties.");
    }

    var cal = CalendarApp.getCalendarById(calId);
    if (!cal) {
      throw new Error("Calendrier introuvable avec ID: " + calId);
    }

    var now = new Date();
    var startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    var endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    var events = cal.getEvents(startOfDay, endOfDay);
    var reservations = [];

    // Formatage des événements pour l'UI
    for (var i = 0; i < events.length; i++) {
      var evt = events[i];
      var title = evt.getTitle();

      // On filtre pour ne garder que ce qui ressemble à une réservation ELS
      // (ex: "Réservation EL Services - NomClient")
      // Ou on prend tout si c'est le calendrier dédié.

      reservations.push({
        id: evt.getId(),
        title: title,
        startTime: Utilities.formatDate(evt.getStartTime(), Session.getScriptTimeZone(), "HH:mm"),
        endTime: Utilities.formatDate(evt.getEndTime(), Session.getScriptTimeZone(), "HH:mm"),
        description: evt.getDescription() || "",
        location: evt.getLocation() || ""
      });
    }

    return {
      status: "success",
      date: Utilities.formatDate(now, Session.getScriptTimeZone(), "dd/MM/yyyy"),
      count: reservations.length,
      data: reservations
    };

  } catch (e) {
    console.error("Erreur api_getDailyReservations: " + e.toString());
    return {
      status: "error",
      message: e.toString()
    };
  }
}

/**
 * Récupère la liste complète des établissements avec leurs coordonnées GPS
 * pour le cache local de l'application mobile.
 * @return {Object} {status: "success", data: Array}
 */
function api_getEtablissementsGPS() {
  try {
    var ss = SpreadsheetApp.openById(MobileAPI_Config.ID_SPREADSHEET_DATA);
    var sheet = ss.getSheetByName(MobileAPI_Config.NOM_ONGLET_ETABLISSEMENTS);

    if (!sheet) {
      throw new Error("Onglet 'Base_Etablissements' introuvable.");
    }

    // Récupération des données (suppose que la ligne 1 est l'en-tête)
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var establishments = [];

    // Mapping des colonnes (basé sur tes fichiers CSV)
    // On cherche les index dynamiquement pour plus de robustesse
    var idxNom = headers.indexOf("Nom");
    var idxLat = headers.indexOf("Latitude");
    var idxLng = headers.indexOf("Longitude");
    var idxId = headers.indexOf("PlaceID"); // Ou un ID unique interne

    if (idxLat === -1 || idxLng === -1) {
      throw new Error("Colonnes Latitude/Longitude manquantes dans la base.");
    }

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      // On ne prend que les lignes avec des coordonnées valides
      if (row[idxLat] && row[idxLng]) {
        establishments.push({
          id: row[idxId] || "UNK-" + i,
          nom: row[idxNom],
          lat: parseFloat(String(row[idxLat]).replace(',', '.')), // Gestion virgule/point
          lng: parseFloat(String(row[idxLng]).replace(',', '.'))
        });
      }
    }

    return {
      status: "success",
      count: establishments.length,
      data: establishments
    };

  } catch (e) {
    console.error("Erreur api_getEtablissementsGPS: " + e.toString());
    return {
      status: "error",
      message: e.toString()
    };
  }
}

/**
 * Enregistre un rapport de livraison (RAS ou Note)
 * @param {Object} reportData - {livreurId, etablissementId, statut, note, lat, lng, timestamp}
 */
function api_saveLivraisonReport(reportData) {
  try {
    var ss = SpreadsheetApp.openById(MobileAPI_Config.ID_SPREADSHEET_DATA);
    var sheet = ss.getSheetByName(MobileAPI_Config.NOM_ONGLET_TRACE);

    if (!sheet) {
      // Création de l'onglet s'il n'existe pas (sécurité)
      sheet = ss.insertSheet(MobileAPI_Config.NOM_ONGLET_TRACE);
      sheet.appendRow(["Timestamp", "Livreur", "Etablissement", "Statut", "Note", "GPS_Lat", "GPS_Lng"]);
    }

    var timestamp = new Date();

    // Nettoyage des données entrantes
    var noteFinale = (reportData.statut === "RAS") ? "RAS" : (reportData.note || "Aucune note");

    sheet.appendRow([
      timestamp,
      reportData.livreurId,
      reportData.etablissementId || "Inconnu",
      reportData.statut, // "RAS" ou "ANOMALIE" ou "NOTE"
      noteFinale,
      reportData.lat,
      reportData.lng
    ]);

    return { status: "success", savedAt: timestamp };

  } catch (e) {
    console.error("Erreur api_saveLivraisonReport: " + e.toString());
    return { status: "error", message: e.toString() };
  }
}
