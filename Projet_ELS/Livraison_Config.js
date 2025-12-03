/**
 * Charge la configuration du module livraison depuis les ScriptProperties.
 * Noms attendus:
 * - LIVRAISON_SPREADSHEET_ID (ou ID_FEUILLE_LIVRAISON / ID_FEUILLE_CALCUL en secours)
 * - LIVRAISON_SHEET_TOURNEES
 * - LIVRAISON_SHEET_NOTES
 * - CALENDRIER_LIVRAISON_ID
 * Fallback: Config.FILES.RESERVATIONS_DB et Config.IDS.CALENDAR si disponibles.
 * @returns {{spreadsheetId:string,sheetNameTournees:string,sheetNameNotes:string,calendarLivraisonId:string}}
 */
function getLivraisonConfig() {
  var props;
  try {
    props = PropertiesService.getScriptProperties();
  } catch (err) {
    Logger.log('Impossible de lire les ScriptProperties Livraison: ' + err);
    props = null;
  }

  var spreadsheetId = props
    ? (props.getProperty('LIVRAISON_SPREADSHEET_ID') ||
      props.getProperty('ID_FEUILLE_LIVRAISON') ||
      props.getProperty('ID_FEUILLE_CALCUL') ||
      '')
    : '';

  try {
    if (!spreadsheetId && typeof Config !== 'undefined' && Config.FILES && Config.FILES.RESERVATIONS_DB) {
      spreadsheetId = Config.FILES.RESERVATIONS_DB;
    }
  } catch (_e) {
    // Fallback silencieux.
  }

  var sheetNameTournees = (props && props.getProperty('LIVRAISON_SHEET_TOURNEES')) || 'Tournees';
  var sheetNameNotes = (props && props.getProperty('LIVRAISON_SHEET_NOTES')) || 'Notes_Livraison';

  var calendarLivraisonId = props ? (props.getProperty('CALENDRIER_LIVRAISON_ID') || '') : '';
  try {
    if (!calendarLivraisonId && typeof Config !== 'undefined' && Config.IDS && Config.IDS.CALENDAR) {
      calendarLivraisonId = Config.IDS.CALENDAR;
    }
  } catch (_err) {
    // Fallback silencieux.
  }

  return {
    spreadsheetId: String(spreadsheetId || '').trim(),
    sheetNameTournees: String(sheetNameTournees || 'Tournees').trim() || 'Tournees',
    sheetNameNotes: String(sheetNameNotes || 'Notes_Livraison').trim() || 'Notes_Livraison',
    calendarLivraisonId: String(calendarLivraisonId || '').trim()
  };
}
