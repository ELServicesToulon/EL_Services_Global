const SHEET_TRACE = "TRACE_Livraisons";
const SHEET_RESERVATIONS = "Réservations";

/**
 * Récupère les propriétés de configuration.
 * @return {Object} L'objet de configuration.
 */
function getConfig() {
  try {
    return PropertiesService.getScriptProperties().getProperties();
  } catch (e) {
    Logger.log("Erreur lors de la récupération des propriétés : " + e.toString());
    return {};
  }
}

/**
 * Récupère les données d'une feuille.
 * @param {string} sheetName Le nom de la feuille.
 * @return {Array<Array<any>>} Les données de la feuille.
 */
function getSheetData(sheetName) {
  const config = getConfig();
  const ssId = config.ID_FEUILLE_CALCUL;
  if (!ssId) {
    Logger.log("ID_FEUILLE_CALCUL non trouvé.");
    return [];
  }
  try {
    const ss = SpreadsheetApp.openById(ssId);
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      Logger.log("Feuille non trouvée: " + sheetName);
      return [];
    }
    const range = sheet.getDataRange();
    return range.getValues();
  } catch (e) {
    Logger.log(`Erreur lors de la lecture de la feuille ${sheetName}: ${e.toString()}`);
    return [];
  }
}

/**
 * Enregistre une nouvelle ligne de trace dans la feuille TRACE_Livraisons.
 * @param {Object} data Les données à enregistrer.
 * @param {string} data.tournee_id L'ID de la tournée (Event ID du calendrier).
 * @param {string} data.livraison_id L'ID unique de l'arrêt (ex: email client + index).
 * @param {string} data.ehpad_id L'ID de l'établissement (email ou autre ID).
 * @param {string} data.chauffeur_id L'ID du chauffeur.
 * @param {string} data.status Le statut de livraison (Livrée, RAS, Problème, etc.).
 * @param {string} [data.anomalie_note=""] Note du livreur.
 * @param {string} [data.app_version="1.0"] Version de l'application.
 * @param {string} [data.by_user="LivreurApp"] Source de l'action.
 * @param {string} [data.patient_hash=""] Hash du patient (si pertinent).
 */
function enregistrerStatutLivraison(data) {
  const config = getConfig();
  const ssId = config.ID_FEUILLE_CALCUL;
  const traceSheetName = config.SHEET_TRACE_LIVRAISON || SHEET_TRACE; // Assurez-vous d'avoir SHEET_TRACE_LIVRAISON dans les propriétés si besoin
  
  if (!ssId) {
    return { success: false, message: "ID_FEUILLE_CALCUL non configuré." };
  }

  try {
    const ss = SpreadsheetApp.openById(ssId);
    const sheet = ss.getSheetByName(traceSheetName);

    if (!sheet) {
      return { success: false, message: `Feuille non trouvée: ${traceSheetName}` };
    }

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    // Correspondance des champs pour la feuille TRACE_Livraisons
    const row = {};
    row.ts_iso = new Date().toISOString();
    row.tournee_id = data.tournee_id || "";
    row.livraison_id = data.livraison_id || ""; // ID unique de l'arrêt
    row.ehpad_id = data.ehpad_id || "";
    row.patient_hash = data.patient_hash || "";
    row.chauffeur_id = data.chauffeur_id || "";
    row.status = data.status || "Inconnu";
    row.anomalie_code = data.anomalie_code || ""; // Par exemple: 'RAS', 'MANQUANT', 'CASSÉ'
    row.anomalie_note = data.anomalie_note || "";
    row.app_version = data.app_version || "1.0";
    row.device_id = data.device_id || ""; // Peut être ajouté si l'app le fournit
    row.by_user = data.by_user || "LivreurApp";
    row.gps_lat = data.gps_lat || "";
    row.gps_lng = data.gps_lng || "";
    row.photo_url = data.photo_url || "";
    row.signature_hash = data.signature_hash || "";

    const values = headers.map(header => row[header.toLowerCase().replace(/ /g, '_').replace(/é/g, 'e').replace(/[^\w]/g, '')] || "");

    sheet.appendRow(values);

    // Validation de l'établissement et calcul de distance
    let validationInfo = {
      match: false,
      distance: null,
      etab_adresse: "Non trouvée",
      message: "Etablissement non trouvé dans la base."
    };

    if (data.etablissement_nom && data.gps_lat && data.gps_lng) {
      const etabData = getEstablishmentData(data.etablissement_nom);
      if (etabData) {
        validationInfo.etab_adresse = etabData.adresse;

        if (etabData.lat && etabData.lng) {
          const dist = calculateDistance(data.gps_lat, data.gps_lng, etabData.lat, etabData.lng);
          validationInfo.distance = Math.round(dist);

          if (dist <= 100) {
            validationInfo.match = true;
            validationInfo.message = "Position validée (distance: " + Math.round(dist) + "m)";
          } else {
            validationInfo.match = false;
            validationInfo.message = "Attention: Vous êtes à " + Math.round(dist) + "m de l'établissement.";
          }
        } else {
             validationInfo.message = "Coordonnées GPS de l'établissement manquantes en base.";
        }
      }
    } else if (!data.gps_lat || !data.gps_lng) {
        validationInfo.message = "Position GPS du livreur non reçue.";
    }

    return {
      success: true,
      message: "Statut de livraison enregistré.",
      validation: validationInfo
    };

  } catch (e) {
    Logger.log("Erreur dans enregistrerStatutLivraison: " + e.toString());
    return { success: false, message: "Erreur serveur lors de l'enregistrement: " + e.toString() };
  }
}

/**
 * Récupère les données d'un établissement depuis la base.
 * @param {string} nom Le nom de l'établissement.
 * @return {Object|null} Les données (adresse, lat, lng) ou null si non trouvé.
 */
function getEstablishmentData(nom) {
  const data = getSheetData("Base_Etablissements");
  if (!data || data.length < 2) return null;

  const headers = data[0].map(h => String(h).toLowerCase().trim());
  const nomIndex = headers.findIndex(h => h.includes("nom") || h === "etablissement");
  const adresseIndex = headers.findIndex(h => h === "adresse" || h.includes("rue"));
  const cpIndex = headers.findIndex(h => h.includes("code postal") || h === "cp");
  const villeIndex = headers.findIndex(h => h === "ville" || h === "commune");
  const latIndex = headers.findIndex(h => h.includes("lat"));
  const lngIndex = headers.findIndex(h => h.includes("long") || h.includes("lng"));

  if (nomIndex === -1) return null;

  // Recherche approximative (case insensitive)
  const targetName = nom.toLowerCase().trim();

  // On parcourt les lignes (data[1] à data[length-1])
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowName = String(row[nomIndex] || "").toLowerCase().trim();

    // Correspondance exacte ou partielle forte
    if (rowName === targetName || (rowName.includes(targetName) && targetName.length > 5)) {
      const adresse = (adresseIndex > -1 ? row[adresseIndex] : "") + " " +
                      (cpIndex > -1 ? row[cpIndex] : "") + " " +
                      (villeIndex > -1 ? row[villeIndex] : "");

      return {
        nom: row[nomIndex],
        adresse: adresse.trim(),
        lat: latIndex > -1 ? row[latIndex] : null,
        lng: lngIndex > -1 ? row[lngIndex] : null
      };
    }
  }
  return null;
}

/**
 * Calcule la distance entre deux points GPS (Haversine).
 * @param {number} lat1 Latitude point 1.
 * @param {number} lon1 Longitude point 1.
 * @param {number} lat2 Latitude point 2.
 * @param {number} lon2 Longitude point 2.
 * @return {number} Distance en mètres.
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Rayon de la terre en mètres
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const deltaPhi = (lat2 - lat1) * Math.PI / 180;
  const deltaLambda = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}


/**
 * Récupère la liste des tournées d'un livreur pour la journée.
 * Note: Cette fonction est un stub et devrait être implémentée
 * pour communiquer avec le calendrier ou la feuille de réservations de Projet_ELS.
 *
 * Pour l'instant, on retourne un exemple statique.
 * @param {string} chauffeurEmail L'email du chauffeur.
 * @return {Array<Object>} La liste des tournées.
 */
function getListeTournees(chauffeurEmail) {
  // En l'absence de la connexion Calendrier réelle pour cette démo, on utilise un stub.
  // En production, cette fonction irait chercher les événements/réservations
  // assignés à 'chauffeurEmail' pour la journée.
  // Pour le test, on filtre sur la raison sociale "Pharmacie de Portissol" ou "Tamaris" si l'email correspond
  // à l'un des emails de client dans Clients.csv pour simuler une tournée active.
  
  const reservationsData = getSheetData("Facturation"); // Utiliser Facturation comme source de Réservations
  if (reservationsData.length === 0) {
    Logger.log("Aucune donnée de facturation trouvée.");
    return [];
  }
  
  const headers = reservationsData[0];
  const data = reservationsData.slice(1);
  const ID_RESERVATION_COL = headers.indexOf("ID Réservation");
  const CLIENT_EMAIL_COL = headers.indexOf("Client (Email)");
  const CLIENT_NOM_COL = headers.indexOf("Client (Raison S. Client)");
  const DETAILS_COL = headers.indexOf("Détails");
  const DATE_COL = headers.indexOf("Date");
  const STATUT_COL = headers.indexOf("Statut");
  const EVENT_ID_COL = headers.indexOf("Event ID");
  
  if (ID_RESERVATION_COL === -1) {
    Logger.log("Colonne 'ID Réservation' non trouvée dans Facturation.");
    return [];
  }
  
  const today = new Date().toLocaleDateString('fr-FR');
  
  const tournées = data.filter(row => {
    const dateCell = row[DATE_COL];
    let rowDateStr = '';
    if (dateCell instanceof Date) {
      rowDateStr = dateCell.toLocaleDateString('fr-FR');
    } else if (typeof dateCell === 'string') {
       // Tenter de parser si c'est une chaîne, par exemple "02/12/2025 10:45:00"
      const datePart = dateCell.split(' ')[0];
      if (datePart) {
        // Simple vérification de la date formatée: DD/MM/YYYY
        rowDateStr = datePart;
      }
    }
    
    // Simuler l'assignation du livreur: Ici, on considère que toutes les tournées
    // non livrées du jour sont potentiellement pour le livreur connecté.
    // L'implémentation réelle nécessiterait une colonne 'Chauffeur ID' dans la feuille de Facturation
    // ou de lire l'agenda du chauffeur.
    return rowDateStr === today && row[STATUT_COL] !== 'Livrée';
    
  }).map((row, index) => {
    const details = row[DETAILS_COL] || "";
    // Extraire le nombre d'arrêts supplémentaires pour simuler les arrêts détaillés.
    // Ex: "Tournée de 120min (6 arrêt(s) total(s) (dont 5 supp. + retour), retour: oui)"
    const match = details.match(/\((\d+)\s+arr.t\(s\)\s+total\(s\)/);
    const totalArrets = match ? parseInt(match[1], 10) : 1; // Au moins 1 arrêt (le client principal)
    
    // Créer une liste d'arrêts pour la vue du livreur
    const arrets = [];
    arrets.push({
      livraison_id: row[ID_RESERVATION_COL] + "-main",
      nom: row[CLIENT_NOM_COL] || "Client Principal",
      adresse: "Adresse Principale (à récupérer via un lookup client)",
      type_arret: "Client Principal"
    });
    
    for (let i = 1; i < totalArrets; i++) {
      arrets.push({
        livraison_id: row[ID_RESERVATION_COL] + "-supp" + i,
        nom: `Arrêt Supplémentaire #${i} (à déterminer)`,
        adresse: `Adresse Arrêt Supp #${i} (à déterminer)`,
        type_arret: "Supplémentaire"
      });
    }

    // Récupérer les données de traçage existantes pour cet ID Réservation
    const traces = getTracesForTournee(row[EVENT_ID_COL] || row[ID_RESERVATION_COL]);
    
    // Mettre à jour les arrêts avec les statuts et notes déjà enregistrés
    arrets.forEach(arret => {
        const existingTrace = traces.find(t => t.livraison_id === arret.livraison_id);
        arret.status = existingTrace ? existingTrace.status : 'À livrer';
        arret.note = existingTrace ? existingTrace.anomalie_note : '';
    });
    
    return {
      event_id: row[EVENT_ID_COL] || row[ID_RESERVATION_COL],
      client_nom: row[CLIENT_NOM_COL],
      client_email: row[CLIENT_EMAIL_COL],
      details: row[DETAILS_COL],
      arrets: arrets
    };
  });
  
  return tournées;
}

/**
 * Récupère les traces de livraison pour une tournée donnée.
 * @param {string} tourneeId L'ID de la tournée.
 * @return {Array<Object>} Les traces de livraison.
 */
function getTracesForTournee(tourneeId) {
  const config = getConfig();
  const traceSheetName = config.SHEET_TRACE_LIVRAISON || SHEET_TRACE;
  const data = getSheetData(traceSheetName);
  
  if (data.length < 2) return [];
  
  const headers = data[0];
  const traceData = data.slice(1);
  const TOURNEE_ID_COL = headers.indexOf("tournee_id");
  
  if (TOURNEE_ID_COL === -1) {
    Logger.log("Colonne 'tournee_id' non trouvée dans TRACE_Livraisons.");
    return [];
  }
  
  return traceData.filter(row => row[TOURNEE_ID_COL] === tourneeId).map(row => {
    const trace = {};
    headers.forEach((header, index) => {
        trace[header.toLowerCase().replace(/ /g, '_').replace(/é/g, 'e').replace(/[^\w]/g, '')] = row[index];
    });
    return trace;
  });
}

/**
 * Interface pour la Web App (GET).
 * @param {Object} e L'événement de requête.
 * @return {GoogleAppsScript.HTML.HtmlOutput} La page HTML.
 */
function doGet(e) {
  return HtmlService.createTemplateFromFile('Index').evaluate()
      .setTitle('EL Services Livreur')
      .setSandboxMode(HtmlService.SandboxMode.IFRAME);
}

/**
 * Ajoute les fichiers HTML inclus (JS/CSS).
 * @param {string} filename Le nom du fichier HTML à inclure.
 * @return {string} Le contenu HTML.
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
