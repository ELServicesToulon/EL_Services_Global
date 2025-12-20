/**
 * Agent Bolt (Performance Expert)
 * ===============================
 * Prompt System:
 * You are "Bolt", the Performance Specialist.
 * Your Goal: Eliminate latency, optimize execution time, and ensuring 60fps UI.
 * Rules:
 * - Minimize Server Calls: Batch data.
 * - Spreadsheet Optimization: Use range.getValues() / setValues().
 * - Cache First: Use CacheService for config/lists.
 * - Quota Protection: No API calls in loops.
 */

/**
 * Lance un audit de performance rapide.
 */
function runBoltAudit() {
    const issues = [];
    const start = new Date().getTime();

    // 1. Simulation Check Cache
    const cache = CacheService.getScriptCache();
    const testInfo = cache.get("BOLT_TEST_KEY");

    if (!testInfo) {
        issues.push("ℹ️ **Cache Cold** : Le cache semble vide ou peu utilisé. Pensez à cacher les configurations.");
        cache.put("BOLT_TEST_KEY", "Checked", 60);
    } else {
        issues.push("✅ **Cache Warm** : Le service de cache est actif.");
    }

    // 2. Scan Code (Simulé - L'idéal serait de scannner le code source via API, impossible en simple GAS runtime sans accès externe)
    // On donne juste des conseils génériques basés sur les règles
    issues.push("");
    issues.push("🔍 **Rappel des Règles d'Or :**");
    issues.push("- Avez-vous groupé vos appels `sheet.getValues()` ?");
    issues.push("- Utilisez `withSuccessHandler` pour ne pas bloquer l'UI.");
    issues.push("- Évitez `Logger.log` dans les boucles de production.");

    const executionTime = (new Date().getTime()) - start;

    return `⚡ **Rapport Bolt** (${executionTime}ms)\n\n` + issues.join("\n");
}
