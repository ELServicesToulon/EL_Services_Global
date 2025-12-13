// =================================================================
//                      REPOSITORY GOOGLE SHEETS
// =================================================================
/**
 * @fileoverview Couche d'abstraction pour l'accès aux données Google Sheets.
 * Centralise les lectures/écritures pour éviter la dispersion des appels SpreadsheetApp.
 */

var SheetsRepo = (function() {
  'use strict';

  let _spreadsheet = null;

  function getSpreadsheet() {
    if (!_spreadsheet) {
      // Tente de récupérer l'ID depuis le cache ou les propriétés
      let id = PropertiesService.getScriptProperties().getProperty('ID_FEUILLE_CALCUL');
      if (!id) {
        // Fallback: utilise le conteneur actif si le script est lié au sheet
        try {
          _spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
          id = _spreadsheet.getId();
          // On pourrait sauvegarder l'ID pour la prochaine fois
        } catch (e) {
          throw new Error('Impossible de localiser le Spreadsheet cible (ID_FEUILLE_CALCUL manquant).');
        }
      } else {
        _spreadsheet = SpreadsheetApp.openById(id);
      }
    }
    return _spreadsheet;
  }

  function getSheet(name) {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(name);
    if (!sheet) {
      throw new Error(`Onglet introuvable : ${name}`);
    }
    return sheet;
  }

  /**
   * Lit toutes les données d'un onglet sous forme d'objets (mappés sur les en-têtes).
   * @param {string} sheetName
   * @returns {Array<Object>}
   */
  function getAll(sheetName) {
    const sheet = getSheet(sheetName);
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return []; // Juste en-tête ou vide

    const headers = data[0];
    const rows = data.slice(1);

    return rows.map(row => {
      let obj = {};
      headers.forEach((h, i) => {
        obj[h] = row[i];
      });
      return obj;
    });
  }

  /**
   * Ajoute une ligne à un onglet.
   * @param {string} sheetName
   * @param {Object} dataObject Objet avec clés correspondant aux en-têtes.
   */
  function append(sheetName, dataObject) {
    const sheet = getSheet(sheetName);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    const row = headers.map(h => {
      return dataObject.hasOwnProperty(h) ? dataObject[h] : '';
    });

    sheet.appendRow(row);
  }

  /**
   * Ajoute une entrée dans l'Audit Log.
   * @param {string} action
   * @param {string} user
   * @param {string} target
   * @param {string} details
   */
  function logAudit(action, user, target, details) {
    try {
      append('AuditLog', {
        'Timestamp': new Date(),
        'Action': action,
        'Utilisateur': user,
        'Cible': target,
        'Details': details
      });
    } catch (e) {
      Logger.log('Audit Log Failure: ' + e.message);
    }
  }

  return {
    getSpreadsheet: getSpreadsheet,
    getSheet: getSheet,
    getAll: getAll,
    append: append,
    logAudit: logAudit
  };

})();
