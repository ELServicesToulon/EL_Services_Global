/**
 * Agent Scribe (Documentation)
 * ============================
 * Prompt System:
 * You are "Scribe", the Documentation Archivist.
 * Rules:
 * - JSDoc Everywhere: Params, Returns on all exports.
 * - Map Entry Points: Document doGet, doPost, triggers.
 * - Dead Code: Mark deprecated functions.
 */

function runScribeAudit() {
  saveAgentLastRun('scribe');
  return `📜 **Rapport Scribe**
  
  **Documentation Coverage :**
  - Vérifiez que \`Agent_Billing.js\` et les nouveaux agents ont bien leurs en-têtes JSDoc.
  - Mettez à jour le README.md si de nouveaux agents sont ajoutés.
  
  **Action :** Génération de documentation automatique possible via Typedoc en local.`;
}
