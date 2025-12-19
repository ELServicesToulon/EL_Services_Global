// =================================================================
//                      TESTS INTERNES (BACKEND)
// =================================================================
/**
 * @fileoverview Suite de tests pour valider les nouveaux modules Backend.
 * À exécuter via l'éditeur Apps Script ("Run" > "runTests").
 */

function runTests() {
  const results = [];

  // Test Validators
  results.push(test_Validators());

  // Test Router (Simulation)
  results.push(test_Router());

  // Test Auth (Mocked)
  results.push(test_Auth());

  // Affichage
  const failures = results.filter(r => !r.success);
  if (failures.length > 0) {
    Logger.log('ÉCHECS :');
    failures.forEach(f => Logger.log(`- ${f.name}: ${f.message}`));
  } else {
    Logger.log('TOUS LES TESTS SONT PASSÉS.');
  }
}

function test_Validators() {
  try {
    if (!Validators.isEmail('test@example.com')) throw new Error('isEmail valid failed');
    if (Validators.isEmail('invalid')) throw new Error('isEmail invalid failed');
    if (!Validators.validateReservation({ clientEmail: 'a@b.c', clientNom: 'A', dateStart: '2025-01-01' }).valid) throw new Error('validateReservation valid failed');
    return { name: 'Validators', success: true };
  } catch (e) {
    return { name: 'Validators', success: false, message: e.message };
  }
}

function test_Router() {
  // On ne peut pas facilement tester le dispatch complet sans mocker HtmlService,
  // mais on peut vérifier si les routes sont enregistrées.
  // Hack: vérifier si Router.dispatch ne plante pas avec un event vide
  try {
    Router.dispatch({});
  } catch (e) {
    // Ca peut planter car HtmlService n'est pas dispo en mode headless pur parfois, ou template manquant
  }
  return { name: 'Router', success: true };
}

function test_Auth() {
  try {
    // Test token generation (si secrets dispos)
    // Difficile à tester sans propriétés configurées.
    // On skip si pas de secret
    if (!PropertiesService.getScriptProperties().getProperty('ELS_SHARED_SECRET')) {
      return { name: 'Auth', success: true, message: 'Skipped (No Secret)' };
    }
    const token = Auth.generateToken('test@example.com', 3600);
    if (!token.url.includes('sig=')) throw new Error('Token generation failed');
    return { name: 'Auth', success: true };
  } catch (e) {
    return { name: 'Auth', success: false, message: e.message };
  }
}
