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
/**
 * Lance un audit de sécurité.
 */
function runSentinelAudit() {
    saveAgentLastRun('sentinel');
    const report = [];
    report.push("🛡️ **Rapport de Sécurité Sentinel**");

    // 0. Check External Security Reports (Local PC, ESET, etc.)
    const lastExternalReportStr = PropertiesService.getScriptProperties().getProperty('SENTINEL_LAST_EXTERNAL_REPORT');
    if (lastExternalReportStr) {
        try {
            const externalData = JSON.parse(lastExternalReportStr);
            const reportAge = (new Date().getTime() - new Date(externalData.timestamp).getTime()) / (1000 * 60); // minutes

            report.push("");
            report.push(`💻 **Sécurité Poste Local (${externalData.machineName})**`);
            report.push(`   Date du rapport : ${externalData.timestamp} (il y a ${Math.round(reportAge)} min)`);

            // Firewall
            const fwStatus = externalData.firewall ? "✅ ACTIF" : "❌ INACTIF";
            report.push(`   - Pare-feu Windows : ${fwStatus}`);

            // ESET
            const esetStatus = externalData.esetService ? "✅ EN COURS" : "⚠️ ÉTEINT";
            report.push(`   - Service ESET : ${esetStatus}`);

            if (reportAge > 60) {
                report.push("   ⚠️ **Attention** : Ce rapport est vieux de plus d'une heure.");
            }

        } catch (e) {
            report.push("⚠️ Erreur lors de la lecture du rapport externe.");
        }
    } else {
        report.push("");
        report.push("ℹ️ **Sécurité Poste Local** : Aucun rapport reçu.");
    }

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

    const finalReport = report.join("\n");

    // Archivage automatique
    if (typeof logAgentReport === 'function') {
        logAgentReport('sentinel', finalReport);
    }

    return finalReport;
}

/**
 * Reçoit un rapport de sécurité externe et le stocke.
 * @param {Object} payload - Données du rapport (machineName, firewall, esetService, etc.)
 */
function receiveSecurityReport(payload) {
    if (!payload) return { status: 'error', message: 'Empty payload' };

    const data = {
        timestamp: new Date().toISOString(),
        machineName: payload.machineName || 'Unknown',
        firewall: payload.firewall === true,
        esetService: payload.esetService === true,
        details: payload.details || {}
    };

    PropertiesService.getScriptProperties().setProperty('SENTINEL_LAST_EXTERNAL_REPORT', JSON.stringify(data));
    return { status: 'success', message: 'Report received' };
}
