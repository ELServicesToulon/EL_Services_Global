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
  // Sécurisation basique via clé d'accès (Stockée dans Script Properties)
  // Si la clé n'est pas fournie ou invalide, on ne charge pas les données sensibles.
  // Le frontend gérera l'affichage du formulaire de login.

  return HtmlService.createTemplateFromFile('Index').evaluate()
      .setTitle('Tableau de Bord ELS')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Vérifie la clé d'accès fournie par le client.
 * @param {string} key La clé à vérifier.
 * @return {boolean} True si valide.
 */
function verifyAccessKey(key) {
  const props = PropertiesService.getScriptProperties();
  const validKey = props.getProperty('RESIDEUR_ACCESS_KEY');

  // Si aucune clé n'est configurée, on considère que c'est ouvert (ou bloqué par défaut selon politique)
  // Pour la sécurité, si pas de clé configurée, on bloque tout sauf si mode DEV explicite.
  if (!validKey) {
    return false; // Sécurité par défaut: fermé si non configuré
  }

  return key === validKey;
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
 * Wrapper sécurisé pour les appels API.
 * Vérifie la clé avant de retourner les données.
 */
function secureCall(key, callback) {
  if (!verifyAccessKey(key)) {
    return { error: "Accès refusé. Clé invalide.", authRequired: true };
  }
  return callback();
}

/**
 * API: Récupère les indicateurs clés (KPI).
 * @param {string} key Clé d'accès.
 * @returns {Object} { totalTours, tauxAnomalie, satisfaction }
 */
function getKpiData(key) {
  return secureCall(key, () => {
    try {
      const data = getSheetData('TRACE_Livraisons');
      if (!data || data.length < 2) {
        return { totalTours: 0, tauxAnomalie: 0, topAnomalies: [] };
      }

      const headers = data[0].map(h => String(h).toLowerCase());
      const idxStatus = headers.indexOf('status');

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
      };

    } catch (e) {
      Logger.log("Erreur KPI: " + e.toString());
      return { error: e.message };
    }
  });
}

/**
 * API: Récupère les tournées récentes pour supervision.
 * @param {string} key Clé d'accès.
 * @returns {Array} Liste des tournées.
 */
function getSupervisionTournees(key) {
  return secureCall(key, () => {
    try {
      const data = getSheetData('Facturation');
      if (!data || data.length < 2) return [];

      const headers = data[0];
      const rows = data.slice(1);

      return rows.slice(-50).reverse().map(row => {
        let obj = {};
        headers.forEach((h, i) => {
          obj[h] = row[i];
        });
        return obj;
      });
    } catch (e) {
      return [];
    }
  });
}

/**
 * API: Récupère les codes d'accès.
 * @param {string} key Clé d'accès.
 * @returns {Array} Liste des codes.
 */
function getCodesAccess(key) {
  return secureCall(key, () => {
    try {
      const data = getSheetData('CodesRef');
      if (!data || data.length < 2) return [];

      const headers = data[0];
      return data.slice(1).map(row => {
        let obj = {};
        headers.forEach((h, i) => obj[h] = row[i]);
        return obj;
      });
    } catch (e) {
      return [];
    }
  });
}
