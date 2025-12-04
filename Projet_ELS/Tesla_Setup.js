/**
 * @fileoverview Declencheurs du module Tesla (Tessie).
 * Prerequis: ScriptProperties VIN_TESLA_JUNIPER_2025, TOKEN_TESSIE, SECRET (optionnel).
 */

/**
 * Le nom de la fonction qui doit etre executee par le declencheur.
 * @const {string}
 */
const FONCTION_A_DECLENCHER = 'genererRapportTesla';

/**
 * Installe deux declencheurs quotidiens (07h et 19h) pour surveiller la batterie Tesla.
 * - Verifie d'abord la presence des secrets Tessie.
 * - Supprime les anciens declencheurs avant de recreer les nouveaux.
 */
function installerDeclencheursTesla() {
  try {
    const statutConfig = verifierConfigTesla();
    if (!statutConfig.ok) {
      const ui = SpreadsheetApp.getUi();
      ui.alert(
        'Configuration Tesla manquante',
        'Ajoute les ScriptProperties suivantes avant d installer les declencheurs : ' +
          statutConfig.missing.join(', '),
        ui.ButtonSet.OK
      );
      return;
    }

    supprimerDeclencheursTesla();
    Logger.log('Ancien(s) declencheur(s) pour "' + FONCTION_A_DECLENCHER + '" supprime(s).');

    ScriptApp.newTrigger(FONCTION_A_DECLENCHER)
      .timeBased()
      .atHour(7)
      .everyDays(1)
      .create();
    Logger.log('Declencheur cree pour 07h00.');

    ScriptApp.newTrigger(FONCTION_A_DECLENCHER)
      .timeBased()
      .atHour(19)
      .everyDays(1)
      .create();
    Logger.log('Declencheur cree pour 19h00.');

    SpreadsheetApp.getUi().alert(
      'Succes',
      'Les declencheurs Tesla ont ete installes (07h00 et 19h00).',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } catch (e) {
    Logger.log('Erreur pendant l installation des declencheurs Tesla : ' + e.toString());
    SpreadsheetApp.getUi().alert(
      'Erreur',
      'Une erreur est survenue : ' + e.message,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

/**
 * Supprime tous les declencheurs associes a la verification de batterie.
 */
function supprimerDeclencheursTesla() {
  try {
    const tousLesDeclencheurs = ScriptApp.getProjectTriggers();
    let supprimes = 0;

    tousLesDeclencheurs.forEach(function(declencheur) {
      if (declencheur.getHandlerFunction() === FONCTION_A_DECLENCHER) {
        ScriptApp.deleteTrigger(declencheur);
        supprimes++;
      }
    });

    if (supprimes > 0) {
      Logger.log(supprimes + ' declencheur(s) supprime(s) pour "' + FONCTION_A_DECLENCHER + '".');
    } else {
      Logger.log('Aucun declencheur existant pour "' + FONCTION_A_DECLENCHER + '".');
    }
  } catch (e) {
    Logger.log('Erreur lors de la suppression des declencheurs : ' + e.toString());
    SpreadsheetApp.getUi().alert(
      'Erreur lors de la suppression',
      'Une erreur est survenue : ' + e.message,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

/**
 * Verifie que les secrets Tessie sont bien definis dans les ScriptProperties.
 * @return {{ok:boolean, missing:string[]}} Statut et liste des cles manquantes.
 */
function verifierConfigTesla() {
  try {
    const props = PropertiesService.getScriptProperties();
    const vin = props.getProperty('VIN_TESLA_JUNIPER_2025') || props.getProperty('TESLA_VIN');
    const token = props.getProperty('TOKEN_TESSIE') || props.getProperty('TESLA_TOKEN');
    const secret = props.getProperty('SECRET') || props.getProperty('TESLA_SECRET');

    const missing = [];
    const optional = [];
    if (!token) missing.push('TOKEN_TESSIE');
    if (!vin) missing.push('VIN_TESLA_JUNIPER_2025');
    if (!secret) optional.push('SECRET (optionnel)');

    return { ok: missing.length === 0, missing: missing.concat(optional) };
  } catch (err) {
    Logger.log('Erreur lors du controle des ScriptProperties Tesla : ' + err.toString());
    return { ok: false, missing: ['TOKEN_TESSIE', 'VIN_TESLA_JUNIPER_2025'] };
  }
}
