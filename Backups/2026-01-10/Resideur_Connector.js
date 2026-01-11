/**
 * @file Resideur_Connector.gs
 * @description Snippet client pour se connecter à la bibliothèque Resideur_Lib.
 * @author Gemini Code Assist
 * @version 1.0.0
 * 
 * @instructions
 * 1. Déployez le projet "Resideur_Core" (contenant le code de Resideur_Lib.gs) en tant que Bibliothèque.
 *    - Dans l'éditeur Apps Script, cliquez sur "Déployer" > "Nouveau déploiement".
 *    - Sélectionnez "Type" : "Bibliothèque".
 *    - Copiez l' "ID de la bibliothèque" (Library ID).
 * 
 * 2. Dans votre projet applicatif principal :
 *    - Allez dans la section "Bibliothèques" (icône +).
 *    - Collez l'ID de la bibliothèque et cliquez sur "Rechercher".
 *    - Choisissez la dernière version et laissez l'identifiant par défaut (ex: `ResideurLib`).
 *    - Cliquez sur "Ajouter".
 * 
 * 3. Copiez-collez le code de ce fichier dans un nouveau script de votre projet principal.
 * 
 * 4. Utilisez `surveiller('nomDeLaFonction')` au début de vos fonctions clés et
 *    `signalerAuPiluleur('message')` pour les retours utilisateurs.
 */


/**
 * Wrapper pour logguer un appel de fonction.
 * Ultra-léger et silencieux : ne bloque jamais l'exécution de l'application principale.
 * 
 * @param {string} nomFonction - Le nom de la fonction à surveiller.
 */
function surveiller(nomFonction) {
  try {
    // Remplacer 'ResideurLib' par l'identifiant que vous avez choisi pour la bibliothèque.
    ResideurLib.logEvent(
      "FONCTION",
      nomFonction,
      Session.getActiveUser().getEmail(),
      ""
    );
  } catch (e) {
    // Échoue silencieusement pour ne pas impacter l'expérience utilisateur.
    // console.error(`Erreur du connecteur Résideur: ${e.toString()}`); // Décommenter pour le débogage.
  }
}

/**
 * Permet à un agent (ou à une interface utilisateur) de remonter un feedback, un bug, ou une suggestion.
 * 
 * @param {string} message - Le message de feedback à enregistrer.
 */
function signalerAuPiluleur(message) {
  try {
    // Remplacer 'ResideurLib' par l'identifiant que vous avez choisi pour la bibliothèque.
    ResideurLib.logEvent(
      "PILULEUR",
      "Feedback",
      Session.getActiveUser().getEmail(),
      message
    );
  } catch (e) {
    // Échoue silencieusement.
    // console.error(`Erreur du connecteur Résideur: ${e.toString()}`); // Décommenter pour le débogage.
  }
}
