/**
 * Agent Client Expert (ex-Mystère)
 * ================================
 * Rôle : Assurance Qualité (QA), Découverte & Dispatching.
 * Capacités :
 * - Apprentissage : Mémorise les erreurs passées.
 * - Dispatching : Déclenche Bolt (Perf) ou Mechanic (Fix) selon le problème.
 * - Proposition : Soumet des améliorations à l'Architecte.
 */

/**
 * Exécute l'analyse experte.
 */
function executerClientExpert() {
  saveAgentLastRun('client_mystere');
  try {
    var logs = [];
    logs.push("🕵️‍♂️ **Session Client Expert**");

    // 1. Initialisation & Mémoire
    var memory = getAgentMemory_("CLIENT_EXPERT");
    logs.push("🧠 *Mémoire* : " + memory.lastFailureCount + " échecs précédents.");

    var webAppUrl = PropertiesService.getScriptProperties().getProperty("WEBAPP_URL") || ScriptApp.getService().getUrl();
    if (!webAppUrl) return "⚠️ Pas d'URL définie.";

    var pages = [
      { name: "Home", path: "" },
      { name: "Admin", path: "?page=admin" }
    ];

    var sessionErrors = [];
    var triggeredAgents = [];
    var startGlobal = new Date().getTime();

    // 2. Exploration
    pages.forEach(p => {
      var t0 = new Date().getTime();
      try {
        var resp = UrlFetchApp.fetch(webAppUrl + p.path, { muteHttpExceptions: true });
        var code = resp.getResponseCode();
        var duration = (new Date().getTime()) - t0;

        // A. Analyse Performance -> Déclenchement BOLT
        if (duration > 2000) {
          logs.push(`⚠️ Lenteur sur ${p.name} (${duration}ms).`);
          if (typeof runBoltAudit === 'function') {
            logs.push("⚡ **Déclenchement automatique de l'Agent Bolt...**");
            var boltReport = runBoltAudit();
            // On pourrait parser le rapport Bolt, ici on log juste
            triggeredAgents.push("Bolt");
          }
        }

        // B. Analyse Erreur -> Déclenchement MECHANIC
        if (code !== 200) {
          sessionErrors.push(`Erreur ${code} sur ${p.name}`);
          logs.push(`❌ Erreur HTTP ${code} sur ${p.name}`);

          if (typeof runMechanicAudit === 'function') {
            logs.push("🔧 **Déclenchement automatique de l'Agent Mechanic...**");
            // Mechanic pourrait tenter un fix immédiat
            triggeredAgents.push("Mechanic");
          }
        } else {
          logs.push(`✅ ${p.name} : OK (${duration}ms)`);
        }

      } catch (e) {
        sessionErrors.push("Exception: " + e.message);
      }
    });

    // 3. Apprentissage & Proposition d'Amélioration
    var totalDuration = (new Date().getTime()) - startGlobal;

    // Si tout est parfait, on cherche à améliorer l'UX (Proposition à valider)
    if (sessionErrors.length === 0 && totalDuration < 1000) {
      logs.push("");
      logs.push("💡 **Découverte Positive** : Le site est très rapide aujourd'hui.");
      submitProposal_(
        "UX Enhancement",
        "Le temps de réponse permettrait d'ajouter des animations de transition sans ralentir l'expérience. Demander à 'Palette' ?",
        "Client Expert"
      );
    }

    // Si on a déclenché des agents, on notifie l'Architecte
    if (triggeredAgents.length > 0) {
      logs.push("");
      logs.push(`📢 **Escalade** : Les agents [${triggeredAgents.join(", ")}] ont été mobilisés.`);
    }

    // Mise à jour mémoire
    saveAgentMemory_("CLIENT_EXPERT", { lastFailureCount: sessionErrors.length, lastRun: new Date().getTime() });

    var finalLog = logs.join("\n");

    // Archivage automatique
    if (typeof logAgentReport === 'function') {
      logAgentReport('client_expert', finalLog);
    }

    return finalLog;

  } catch (e) {
    return "❌ Erreur Fatale Client Expert : " + e.toString();
  }
}

/**
 * Soumet une proposition à la "Boîte à Idées" supervisée par l'Architecte.
 */
function submitProposal_(type, description, author) {
  // Stockage simple dans PropertiesService (simulant une DB)
  var key = "PROPOSAL_" + new Date().getTime();
  var payload = JSON.stringify({ type: type, desc: description, author: author, status: "PENDING" });
  PropertiesService.getScriptProperties().setProperty(key, payload);
  Logger.log("Proposition soumise : " + description);
  return key;
}

/**
 * Gestionnaire de mémoire simple.
 */
function getAgentMemory_(agentId) {
  var raw = PropertiesService.getScriptProperties().getProperty("MEM_" + agentId);
  return raw ? JSON.parse(raw) : { lastFailureCount: 0 };
}

function saveAgentMemory_(agentId, data) {
  PropertiesService.getScriptProperties().setProperty("MEM_" + agentId, JSON.stringify(data));
}
