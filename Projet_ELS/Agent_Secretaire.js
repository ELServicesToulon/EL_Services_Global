/**
 * Agent Secrétaire (Relation Client)
 * Scanne les emails à traiter et prépare des brouillons de réponse via IA.
 */

const LABEL_TO_PROCESS = "A_TRAITER";

/**
 * Fonction principale : Traite les emails non lus du label "A_TRAITER".
 * Crée un brouillon de réponse et marque comme lu.
 */
function processEmailsToDraft() {
  try {
    // 1. Récupération du label
    var label = GmailApp.getUserLabelByName(LABEL_TO_PROCESS);
    if (!label) {
      Logger.log("Label '" + LABEL_TO_PROCESS + "' introuvable. Veuillez le créer dans Gmail.");
      return;
    }

    // 2. Récupération des threads non lus
    var threads = label.getThreads(0, 10); // Traite par lot de 10 max pour éviter timeouts
    var count = 0;

    threads.forEach(function(thread) {
      if (thread.isUnread()) {
        var messages = thread.getMessages();
        var lastMessage = messages[messages.length - 1];
        var body = lastMessage.getPlainBody();
        var sender = lastMessage.getFrom();
        var subject = lastMessage.getSubject();

        // 3. Analyse et Rédaction via Gemini
        var draftContent = generateDraftContent_(sender, subject, body);

        if (draftContent) {
          // 4. Création du brouillon
          thread.createDraftReply(draftContent);

          // 5. Marquer comme lu pour éviter le re-traitement
          thread.markRead();
          count++;
        }
      }
    });

    Logger.log("Agent Secrétaire : " + count + " brouillons générés.");

  } catch (e) {
    Logger.log("Erreur processEmailsToDraft : " + e.toString());
  }
}

/**
 * Appelle Gemini pour analyser l'email et rédiger une réponse.
 */
function generateDraftContent_(sender, subject, body) {
  var systemPrompt = `
    Tu es l'Assistant Secrétaire de la société EL Services (Logistique Santé).
    Ton rôle est de préparer des brouillons de réponse aux emails entrants.

    Instructions :
    1. Analyse l'intention de l'email (ex: Demande de facture, Problème livraison, Info tarif, Autre).
    2. Rédige une réponse POLIE, PROFESSIONNELLE et CONCISE en français.
    3. Ne signe pas, laisse l'espace pour la signature de l'humain.
    4. Si l'email est une demande de facture, indique qu'elle est en pièce jointe (l'humain l'ajoutera).
    5. Si c'est une réclamation, sois empathique et indique qu'on vérifie immédiatement.

    Contexte :
    - Expéditeur : ${sender}
    - Sujet : ${subject}
  `;

  var userPrompt = `Voici le contenu de l'email reçu :\n\n${body}`;

  return callGeminiFlash(systemPrompt, userPrompt, 0.3);
}

/**
 * Configure le trigger horaire (à lancer manuellement une fois).
 */
function setupSecretaireTrigger() {
  // Supprime les triggers existants pour éviter les doublons
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'processEmailsToDraft') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  // Crée un trigger toutes les heures
  ScriptApp.newTrigger('processEmailsToDraft')
    .timeBased()
    .everyHours(1)
    .create();

  Logger.log("Trigger 'processEmailsToDraft' installé (toutes les heures).");
}
