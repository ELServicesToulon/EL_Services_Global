/**
 * @fileoverview Script pour compléter les noms de communes à partir des codes postaux.
 * Ajoute un menu pour traiter automatiquement la feuille active.
 */

/**
 * Point d'entrée pour le menu: demande confirmation et lance le traitement.
 */
function menuCompleterCommunes() {
  const ui = SpreadsheetApp.getUi();
  const confirm = ui.alert(
    'Compléter les communes',
    'Ce script va compléter la colonne "Libellé/Commune" à partir des codes postaux de la feuille active.\n\nContinuer ?',
    ui.ButtonSet.YES_NO
  );

  if (confirm !== ui.Button.YES) return;

  try {
    const res = completerCommunes_();
    ui.alert('Terminé', `${res.processed} lignes traitées.\n${res.updated} communes ajoutées.`, ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('Erreur', e.message, ui.ButtonSet.OK);
  }
}

/**
 * Fonction interne qui réalise le traitement.
 * @returns {Object} Résultat { processed: number, updated: number }
 */
function completerCommunes_() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  if (lastRow < 2) return { processed: 0, updated: 0 };

  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const colCP = headers.findIndex(h => String(h).match(/code\s*postal/i));
  // On cherche "Libellé/Commune", "Commune", "Ville" ou "Libellé" (si pas Code)
  const colVille = headers.findIndex(h => String(h).match(/(libellé|commune|ville)/i) && !String(h).match(/code/i));

  if (colCP === -1) {
    throw new Error('Colonne "Code Postal" introuvable. Vérifiez les en-têtes.');
  }
  if (colVille === -1) {
    throw new Error('Colonne "Libellé/Commune" ou "Ville" introuvable. Vérifiez les en-têtes.');
  }

  // On lit toutes les données pour l'analyse (CP + Ville existante)
  // Mais on préparera un tableau séparé pour l'écriture (une seule colonne)
  const dataRange = sheet.getRange(2, 1, lastRow - 1, lastCol);
  const data = dataRange.getValues();

  // Tableau de sortie pour la colonne Ville uniquement
  // Initialisé avec les valeurs actuelles pour ne pas écraser si on ne change rien
  const villesOutput = data.map(row => [row[colVille]]);

  let updated = 0;

  for (let i = 0; i < data.length; i++) {
    const cp = data[i][colCP];
    const existingVille = data[i][colVille];

    // On traite si CP présent et Ville vide
    if (cp && !existingVille) {
      try {
        Utilities.sleep(200); // Rate limiting pour l'API Maps
        const response = Maps.newGeocoder().setRegion('fr').geocode(String(cp).trim() + ', France');

        if (response.status === 'OK' && response.results.length > 0) {
          const result = response.results[0];
          let ville = '';

          for (const component of result.address_components) {
            if (component.types.includes('locality')) {
              ville = component.long_name;
              break;
            }
          }

          if (!ville) {
            for (const component of result.address_components) {
              if (component.types.includes('administrative_area_level_2')) {
                ville = component.long_name;
                break;
              }
            }
          }

          if (ville) {
            villesOutput[i][0] = ville;
            updated++;
          }
        }
      } catch (e) {
        Logger.log(`Erreur pour CP ${cp}: ${e.message}`);
      }
    }
  }

  if (updated > 0) {
    // On écrit uniquement la colonne Ville pour ne pas toucher aux formules des autres colonnes
    sheet.getRange(2, colVille + 1, lastRow - 1, 1).setValues(villesOutput);
  }

  return { processed: data.length, updated: updated };
}
