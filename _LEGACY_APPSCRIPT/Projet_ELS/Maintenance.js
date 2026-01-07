/**
 * Utilitaire de maintenance pour supprimer les anciens déclencheurs.
 * À lancer MANUELLEMENT une fois.
 */
function cleanOrphanTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  var removed = 0;
  var targetFunction = "executerClientMystere";

  Logger.log("Analyse des " + triggers.length + " triggers...");

  triggers.forEach(function (t) {
    if (t.getHandlerFunction() === targetFunction) {
      ScriptApp.deleteTrigger(t);
      removed++;
      Logger.log("Trigger supprimé pour : " + targetFunction);
    }
  });

  Logger.log("Nettoyage terminé. " + removed + " triggers supprimés.");
  return "Nettoyage OK : " + removed + " supprimés.";
}
