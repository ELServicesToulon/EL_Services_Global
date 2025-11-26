/**
 * @fileoverview Fonctions d'installation et de désinstallation
 * pour les déclencheurs (triggers) du module Tesla.
 *
 * Pour utiliser :
 * 1. Ouvrez votre projet Apps Script.
 * 2. Dans l'éditeur, sélectionnez la fonction `installerDeclencheursTesla`.
 * 3. Cliquez sur "Exécuter".
 * 4. Autorisez les permissions si demandé.
 *
 * Cela créera automatiquement les deux déclencheurs nécessaires.
 */

/**
 * Le nom de la fonction qui doit être exécutée par le déclencheur.
 * @const {string}
 */
const FONCTION_A_DECLENCHER = 'checkBatteryHealth';

/**
 * Installe les déclencheurs quotidiens pour la vérification de la batterie Tesla.
 *
 * Cette fonction supprime d'abord les anciens déclencheurs pour éviter les doublons,
 * puis en crée deux nouveaux :
 * - Un pour 7h du matin.
 * - Un pour 19h du soir.
 */
function installerDeclencheursTesla() {
  try {
    // Étape 1 : Supprimer les anciens déclencheurs pour cette fonction
    supprimerDeclencheursTesla();
    Logger.log('Anciens déclencheurs pour "' + FONCTION_A_DECLENCHER + '" supprimés.');

    // Étape 2 : Créer le déclencheur du matin (7h)
    ScriptApp.newTrigger(FONCTION_A_DECLENCHER)
      .timeBased()
      .atHour(7)
      .everyDays(1)
      .create();
    Logger.log('-> Déclencheur créé pour 7h00.');

    // Étape 3 : Créer le déclencheur du soir (19h)
    ScriptApp.newTrigger(FONCTION_A_DECLENCHER)
      .timeBased()
      .atHour(19)
      .everyDays(1)
      .create();
    Logger.log('-> Déclencheur créé pour 19h00.');

    SpreadsheetApp.getUi().alert(
      '✅ Succès !',
      'Les déclencheurs pour la surveillance de la Tesla ont été installés.\n\n' +
      'La batterie sera vérifiée tous les jours à 7h00 et 19h00.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );

    Logger.log('✅ Installation des déclencheurs terminée avec succès.');

  } catch (e) {
    Logger.log('Une erreur est survenue lors de l`installation des déclencheurs : ' + e.toString());
    SpreadsheetApp.getUi().alert(
      '❌ Erreur',
      'Une erreur est survenue : ' + e.message,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

/**
 * Supprime tous les déclencheurs associés à la fonction de vérification de la batterie.
 * Utile pour la maintenance ou la désactivation du module.
 */
function supprimerDeclencheursTesla() {
  try {
    const tousLesDeclencheurs = ScriptApp.getProjectTriggers();
    let declencheursSupprimes = 0;

    tousLesDeclencheurs.forEach(function(declencheur) {
      if (declencheur.getHandlerFunction() === FONCTION_A_DECLENCHER) {
        ScriptApp.deleteTrigger(declencheur);
        declencheursSupprimes++;
      }
    });

    if (declencheursSupprimes > 0) {
      Logger.log(declencheursSupprimes + ' déclencheur(s) ont été supprimés pour la fonction "' + FONCTION_A_DECLENCHER + '".');
    } else {
      Logger.log('Aucun déclencheur existant trouvé pour la fonction "' + FONCTION_A_DECLENCHER + '".');
    }
  } catch (e) {
    Logger.log('Erreur lors de la suppression des déclencheurs : ' + e.toString());
     SpreadsheetApp.getUi().alert(
      '❌ Erreur lors de la suppression',
      'Une erreur est survenue : ' + e.message,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}
