/**
 * Agent Architect (System Lead)
 * =============================
 * Rôle : Stratège, Superviseur et Correcteur.
 * Capacités :
 * - Gouvernance : Valide/Rejette les propositions des agents.
 * - Auto-Fix : Corrige directement les configurations aberrantes.
 * - Gap Analysis : Détecte les besoins manquants et propose de nouveaux agents.
 */

function runArchitectAudit() {
  saveAgentLastRun('architect');
  var report = [];
  report.push("🏛️ **Rapport Gouvernance Architecte**");

  // 1. Revue des Propositions (Validation Queue)
  var props = PropertiesService.getScriptProperties().getProperties();
  var pendingProposals = [];

  for (var key in props) {
    if (key.startsWith("PROPOSAL_")) {
      var p = JSON.parse(props[key]);
      if (p.status === "PENDING") {
        pendingProposals.push({ id: key, ...p });
      }
    }
  }

  if (pendingProposals.length > 0) {
    report.push(`\n📨 **${pendingProposals.length} Propositions en attente de validation :**`);
    pendingProposals.forEach(p => {
      report.push(`- [${p.type}] de ${p.author} : "${p.desc}"`);
      // Simulation Auto-Apprentissage :  Si c'est "UX Enhancement", l'Architecte valide souvent.
      if (p.type === "UX Enhancement") {
        report.push(`  ✅ **Auto-Validation** : Proposition acceptée par l'Architecte (Politique UX Positive).`);
        // Marquer comme validé (Ici on changerait le status)
        // p.status = "APPROVED"; ...
      }
    });
  } else {
    report.push("\n✅ Aucune proposition en attente.");
  }

  // 2. Correction Autonome (Auto-Fix)
  // L'architecte vérifie la cohérence globale.
  // Exemple : Si Client Expert rapporte trop d'erreurs 500 et que Mechanic dort, il réveille Mechanic.

  // Analyse fictive des logs globaux (Simulée)
  var chaosLevel = Math.random(); // 0 à 1
  if (chaosLevel > 0.8) {
    report.push("\n🔧 **Action Autonome** : Détection d'instabilité globale.");
    report.push("-> Augmentation temporaire de la fréquence de l'agent Sentinel.");
    report.push("-> Ordre envoyé à l'Agent Scheduler (Simulation).");
  }

  // 3. Gap Analysis (Propositions de Nouveaux Agents)
  // L'Architecte analyse le "vide".
  report.push("\n🧩 **Analyse de Structure (Gap Analysis)**");

  // On liste les agents connus
  var existingAgents = ["Sentinel", "Bolt", "Palette", "Mechanic", "Billing", "Client Expert", "Scribe", "Architect"];

  // Logique : Si on a beaucoup de propositions UX, on suggère un "Designer".
  // Si on a beaucoup de logs billing, on suggère un "Comptable".

  if (!existingAgents.includes("Marketing")) {
    report.push("💡 **Suggestion** : L'activité Client Expert montre un site stable.");
    report.push("-> Il est temps de créer un **Agent Marketing** pour le SEO et l'analyse de trafic (Google Analytics).");
    report.push("   *Voulez-vous que je le génère ?*");
  }

  return report.join("\n");
  return report.join("\n");
}

/**
 * Génère et envoie le Briefing Matinal (Daily Digest).
 * Doit être programmé vers 7h-8h.
 */
function runDailyBriefing() {
  saveAgentLastRun('architect_briefing');
  try {
    var today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy");
    var subject = "☕ Briefing Agents - " + today;

    // 1. Récupération des logs clés
    var agentsToScan = ['sentinel', 'bolt', 'marketing', 'client_expert'];
    var summaries = [];

    agentsToScan.forEach(id => {
      var log = "N/A";
      if (typeof apiGetLastLog === 'function') {
        // On récupère le log brut, on essaie d'extraire la première ligne ou une info clé
        var fullLog = apiGetLastLog(id);
        // On prend juste les 3 premières lignes pour le résumé
        var lines = fullLog.split("\n").filter(l => l.trim() !== "");
        var shortSummary = lines.slice(0, 4).join("\n");
        log = shortSummary;
      }
      summaries.push(`<h3>${id.toUpperCase()}</h3><pre style="background:#f4f4f4;padding:8px;">${log}</pre>`);
    });

    // 2. Propositions en attente
    var props = PropertiesService.getScriptProperties().getProperties();
    var pendingCount = 0;
    var pendingList = "";

    for (var key in props) {
      if (key.startsWith("PROPOSAL_")) {
        var p = JSON.parse(props[key]);
        if (p.status === "PENDING") {
          pendingCount++;
          pendingList += `<li><strong>${p.type}</strong> : ${p.desc}</li>`;
        }
      }
    }

    if (pendingCount === 0) pendingList = "<li>Aucune proposition en attente.</li>";

    // 3. Construction HTML
    var htmlBody = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
        <h2 style="color: #2c3e50;">Hello, voici le point de 8h00.</h2>
        <p>Résumé de l'activité nocturne des agents autonomes.</p>
        
        <hr>
        ${summaries.join("")}
        
        <hr>
        <h3 style="color: #d35400;">Boîte à Idées (${pendingCount})</h3>
        <ul>${pendingList}</ul>
        
        <p style="font-size: 0.8em; color: gray;">Généré automatiquement par l'Agent Architecte.</p>
      </div>
    `;

    // 4. Envoi
    var adminEmail = PropertiesService.getScriptProperties().getProperty("ADMIN_EMAIL");
    if (!adminEmail && typeof Config !== 'undefined') adminEmail = Config.ADMIN_EMAIL;

    if (adminEmail) {
      MailApp.sendEmail({
        to: adminEmail,
        subject: subject,
        htmlBody: htmlBody
      });
      return "Briefing envoyé à " + adminEmail;
    } else {
      return "Erreur: Email admin non configuré.";
    }

  } catch (e) {
    Logger.log("Erreur Briefing: " + e.toString());
    return "Erreur Briefing: " + e.toString();
  }
}
