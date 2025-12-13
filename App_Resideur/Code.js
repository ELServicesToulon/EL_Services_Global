// =================================================================
//                      MODULE BACKEND (App_Resideur)
// =================================================================
/**
 * @fileoverview Contrôleur principal pour l'application Résideur.
 * Gère l'accès aux données (Tournées, KPI) et sert le Dashboard.
 */

// Importation de la configuration si nécessaire (via Config.js qui est dans le même projet)

/**
 * Point d'entrée de l'application Web.
 */
function doGet(e) {
  // On peut ajouter une sécurité ici (token, etc.) si besoin.
  return HtmlService.createTemplateFromFile('Index').evaluate()
      .setTitle('Tableau de Bord ELS')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Helper pour inclure des fichiers HTML (JS/CSS).
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Récupère l'ID du Spreadsheet depuis la config ou les propriétés.
 */
function getSpreadsheetId() {
  // Priorité : Script Properties > Config.js > Hardcoded (à éviter)
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty('DB_SPREADSHEET') || props.getProperty('ID_FEUILLE_CALCUL');
  
  if (!id && typeof Config !== 'undefined' && Config.IDS) {
    id = Config.IDS.DB_SPREADSHEET;
  }

  if (!id) throw new Error("ID de Spreadsheet non configuré (DB_SPREADSHEET).");
  return id;
}

/**
 * Récupère les données brutes d'un onglet.
 * @param {string} sheetName
 */
function getSheetData(sheetName) {
  const ssId = getSpreadsheetId();
  const ss = SpreadsheetApp.openById(ssId);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  return sheet.getDataRange().getValues();
}

/**
 * API: Récupère les indicateurs clés (KPI).
 * @returns {Object} { totalTours, tauxAnomalie, satisfaction }
 */
function getKpiData() {
  try {
    const data = getSheetData('TRACE_Livraisons'); // Suppose que cette feuille existe
    if (!data || data.length < 2) {
      return { totalTours: 0, tauxAnomalie: 0, topAnomalies: [] };
    }

    const headers = data[0].map(h => String(h).toLowerCase());
    const idxStatus = headers.indexOf('status'); // ou 'statut'
    const idxNote = headers.indexOf('anomalie_note');

    // Stats basiques sur les 100 dernières lignes pour la perf
    const recentData = data.slice(1).slice(-100);
    const total = recentData.length;
    let anomalies = 0;

    recentData.forEach(row => {
      const status = idxStatus > -1 ? String(row[idxStatus]).toLowerCase() : '';
      if (status.includes('problème') || status.includes('anomalie') || status.includes('echec')) {
        anomalies++;
      }
    });

    const taux = total > 0 ? Math.round((anomalies / total) * 100) : 0;

    return {
      totalLivraisons: total,
      tauxAnomalie: taux,
      // Placeholder pour d'autres stats
    };

  } catch (e) {
    Logger.log("Erreur KPI: " + e.toString());
    return { error: e.message };
  }
}

/**
 * API: Récupère les tournées récentes pour supervision.
 * @returns {Array} Liste des tournées.
 */
function getSupervisionTournees() {
  try {
    // On lit 'Facturation' (qui sert de source pour les réservations/tournées dans ce projet)
    const data = getSheetData('Facturation');
    if (!data || data.length < 2) return [];

    const headers = data[0];
    const rows = data.slice(1);

    // Mapping simple (à adapter selon les vrais en-têtes)
    // On suppose: Date, Client, Statut, Détails
    // On prend les 50 dernières
    return rows.slice(-50).reverse().map(row => {
      // On fait un mapping positionnel "best effort" ou on cherche les index
      // Pour l'exemple, on retourne un objet générique basé sur les headers
      let obj = {};
      headers.forEach((h, i) => {
        obj[h] = row[i];
      });
      return obj;
    });
  } catch (e) {
    return [];
  }
}

/**
 * API: Récupère les codes d'accès.
 * @returns {Array} Liste des codes.
 */
function getCodesAccess() {
  try {
    // Si une feuille 'CodesRef' existe
    const data = getSheetData('CodesRef');
    if (!data || data.length < 2) return [];

    const headers = data[0];
    return data.slice(1).map(row => {
      let obj = {};
      headers.forEach((h, i) => obj[h] = row[i]);
      return obj;
    });
  } catch (e) {
    return []; // Pas de feuille CodesRef
  }
}
