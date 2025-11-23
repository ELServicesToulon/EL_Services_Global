

// =================================================================
//                      7. CORRECTION DE DONNÉES
// =================================================================

/**
 * Corrige les numéros de SIRET invalides dans la feuille "Clients".
 * Remplace les valeurs "undefined" ou vides pour les comptes "Pro" par "A VERIFIER".
 * 
 * Pour l'exécuter :
 * 1. Ouvrez l'éditeur de scripts Google Apps Script.
 * 2. Sélectionnez la fonction "fixSiretNumbers" dans le menu déroulant.
 * 3. Cliquez sur "Exécuter".
 * 4. Vérifiez les logs pour le résumé de l'opération.
 */
function fixSiretNumbers() {
  try {
    // Utilise le Config pour récupérer l'ID de la feuille de calcul
    var spreadsheetId = Config.SPREADSHEET_ID;
    if (!spreadsheetId) {
      throw new Error("Impossible de récupérer 'ID_FEUILLE_CALCUL' depuis Config.gs. Assurez-vous que la propriété du script est définie.");
    }
    var sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('Clients');
    
    if (!sheet) {
      throw new Error("La feuille 'Clients' est introuvable.");
    }

    var dataRange = sheet.getDataRange();
    var values = dataRange.getValues();
    
    var headers = values[0];
    var siretColIndex = headers.indexOf('SIRET');
    var accountTypeColIndex = headers.indexOf('TypeCompte'); // Supposons que cette colonne existe pour cibler les "Pro"
    
    if (siretColIndex === -1) {
      throw new Error("La colonne 'SIRET' est introuvable dans la feuille 'Clients'.");
    }
    if (accountTypeColIndex === -1) {
      Logger.log("Avertissement : La colonne 'TypeCompte' est introuvable. La correction sera appliquée à toutes les lignes sans distinction de type de compte.");
    }
    
    var correctedCount = 0;
    // Boucle à partir de la deuxième ligne (index 1) pour ignorer les en-têtes
    for (var i = 1; i < values.length; i++) {
      var row = values[i];
      // Si accountTypeColIndex n'est pas trouvé, on considère toutes les lignes comme potentiellement "Pro"
      var isProAccount = (accountTypeColIndex === -1) || (row[accountTypeColIndex] === 'Pro');
      var currentSiret = row[siretColIndex];
      
      // Cible les comptes "Pro" où le SIRET est manquant, null, undefined ou une chaîne vide.
      if (isProAccount && (currentSiret === undefined || currentSiret === null || currentSiret === '' || currentSiret === 'undefined')) {
        values[i][siretColIndex] = 'A VERIFIER';
        correctedCount++;
      }
    }
    
    if (correctedCount > 0) {
      dataRange.setValues(values);
      Logger.log("Correction terminée. " + correctedCount + " numéro(s) de SIRET ont été mis à jour avec la valeur 'A VERIFIER'.");
      SpreadsheetApp.getUi().alert("Correction terminée", correctedCount + " numéro(s) de SIRET ont été mis à jour avec la valeur 'A VERIFIER'.");
    } else {
      Logger.log("Aucun numéro de SIRET n'a nécessité de correction.");
      SpreadsheetApp.getUi().alert("Aucune correction nécessaire", "Tous les numéros de SIRET semblent valides.");
    }
    
  } catch (e) {
    Logger.log("Erreur lors de la correction des SIRETs : " + e.message);
    console.error("Erreur lors de la correction des SIRETs : " + e.toString());
    SpreadsheetApp.getUi().alert("Erreur", "La correction a échoué : " + e.message);
  }
}
