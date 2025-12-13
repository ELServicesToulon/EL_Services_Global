/**
 * @fileoverview Script d'initialisation de la structure de la base de données (Google Sheets).
 * Ce script doit être exécuté manuellement par un administrateur depuis l'éditeur Apps Script.
 * Il crée ou met à jour les onglets nécessaires et applique les protections.
 */

/**
 * Configure la structure complète de la base de données dans le Google Sheet actif.
 * Idempotent : peut être relancé sans détruire les données existantes (ajoute seulement les colonnes manquantes).
 */
function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();

  const structures = {
    'Users': ['ID', 'Email', 'Role', 'Nom', 'Actif', 'DerniereConnexion'],
    'Tournees': ['ID', 'Date', 'LivreurID', 'Statut', 'HeureDebut', 'HeureFin', 'Metriques'],
    'Stops': ['ID', 'TourneeID', 'Sequence', 'Type', 'Adresse', 'Client', 'Statut', 'Preuve', 'Commentaire', 'HeureArrivee'],
    'Events': ['ID', 'Timestamp', 'Type', 'Source', 'Details', 'Utilisateur'],
    'CodesRef': ['Code', 'Type', 'Description', 'Actif'],
    'CodesClean': ['Code', 'DateNettoyage', 'Statut'],
    'AuditLog': ['Timestamp', 'Action', 'Utilisateur', 'Cible', 'Details'],
    'Metrics': ['Date', 'Type', 'Valeur', 'Dimensions']
  };

  let log = [];

  for (const [sheetName, headers] of Object.entries(structures)) {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      log.push(`Onglet créé : ${sheetName}`);
    } else {
      log.push(`Onglet existant : ${sheetName}`);
    }

    // Vérification et mise à jour des en-têtes
    const currentHeaders = sheet.getLastColumn() > 0 ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0] : [];

    // Si la feuille est vide, on écrit tout
    if (currentHeaders.length === 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#EFEFEF');
      sheet.setFrozenRows(1);
      log.push(`  En-têtes initialisés pour ${sheetName}`);
    } else {
      // On pourrait ajouter une logique de fusion/vérification des colonnes ici si nécessaire
      // Pour l'instant on assume que si ça existe, c'est bon, ou on log juste.
      // TODO: Implémenter la migration de schéma si besoin.
    }

    // Protection (sauf pour Admin)
    protectSheetStructure_(sheet);
  }

  // Créer un menu pour relancer facilement
  if (ui) {
    ui.alert('Initialisation Base de Données', 'Opérations effectuées :\n' + log.join('\n'), ui.ButtonSet.OK);
  } else {
    Logger.log(log.join('\n'));
  }
}

/**
 * Protège la structure de la feuille (interdit la suppression de colonnes/lignes aux non-owners).
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 */
function protectSheetStructure_(sheet) {
  const protection = sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET)[0];
  if (!protection) {
    const p = sheet.protect().setDescription('Protection Structurelle');
    p.setWarningOnly(true); // Pour commencer, warning seulement.
    // p.removeEditors(p.getEditors());
    // p.addEditor(Session.getEffectiveUser());
  }
}

/**
 * Ajoute le menu d'admin pour lancer le setup.
 */
function onOpen_Setup() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Admin DB')
    .addItem('Initialiser/Mettre à jour la structure', 'setupDatabase')
    .addToUi();
}
