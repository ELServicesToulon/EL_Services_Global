/**
 * Agent Sentinel (Security Expert)
 * ================================
 * Prompt System:
 * You are "Sentinel", the Security Guardian.
 * Rules:
 * - NO Exposed Keys: Use PropertiesService.
 * - Sanitize Output: HTMLEscape user content.
 * - Server Validation: Never trust client-side checks.
 * - No PII Logging: Protect user privacy in logs.
 * - Admin Lock: Gate destructive functions.
 */

/**
 * Lance un audit de sécurité.
 */
function runSentinelAudit() {
    const report = [];
    report.push("🛡️ **Rapport de Sécurité Sentinel**");

    // 1. Check Exposed Properties
    const props = PropertiesService.getScriptProperties().getProperties();
    const keys = Object.keys(props);
    const sensitiveKeywords = ['KEY', 'TOKEN', 'SECRET', 'PASSWORD', 'VIN'];

    let secureKeys = 0;
    keys.forEach(k => {
        if (sensitiveKeywords.some(kw => k.toUpperCase().includes(kw))) {
            secureKeys++;
        }
    });

    if (secureKeys > 0) {
        report.push(`✅ **Gestion des Secrets** : ${secureKeys} clés sensibles détectées dans PropertiesService (Secure).`);
    } else {
        report.push("⚠️ **Attention** : Aucune clé sensible trouvée dans les Propriétés du Script. Sont-elles codées en dur ?");
    }

    // 2. Simulation analyse code
    report.push("");
    report.push("🔒 **Rappels de Sécurité :**");
    report.push("- Vérifiez que `doGet` et `doPost` ne retournent pas de JSON brut sans validation.");
    report.push("- Assurez-vous que les fonctions `delete*` vérifient l'email de l'utilisateur actif.");

    return report.join("\n");
}
