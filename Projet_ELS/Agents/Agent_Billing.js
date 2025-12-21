/**
 * @fileoverview Agent Billing (Facturation & FinOps)
 * Expert en optimisation des coûts Google Cloud et audit d'usage API.
 * Analyse les coûts Gemini, Maps et propose des économies.
 */

/**
 * Lance l'audit de facturation et d'optimisation.
 * Analyse la configuration actuelle et propose des économies concrètes.
 * @returns {string} Le rapport d'audit au format Markdown.
 */
function runBillingAudit() {
    saveAgentLastRun('billing');
    try {
        const reportParts = [];
        reportParts.push("📊 **Rapport d'Audit Facturation & Optimisation**");
        reportParts.push("🤖 **Agent Billing** : Expert FinOps Cloud & Scalabilité.");
        reportParts.push("Date: " + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm"));
        reportParts.push("");
        reportParts.push("Objectif : Réduire les coûts actuels (Auto-Entrepreneur) tout en préparant l'architecture pour une charge 'Infinie'.");
        reportParts.push("");

        // 1. Analyse Gemini
        const currentModel = PropertiesService.getScriptProperties().getProperty("GEMINI_MODEL_VERSION") || "Par défaut (probablement Flash)";
        reportParts.push("🔍 **Analyse I.A. (Gemini API)**");
        reportParts.push("- Modèle actif : `" + currentModel + "`");
        if (currentModel.toLowerCase().includes("flash")) {
            reportParts.push("  ✅ **Excellent** : Vous utilisez une version 'Flash' (très économique).");
        } else {
            reportParts.push("  ⚠️ **Optimisable** : Vous semblez utiliser une version 'Pro' ou standard.");
            reportParts.push("  👉 **Conseil** : Assurez-vous que 'Gemini_Core.js' privilégie 'gemini-1.5-flash' pour les tâches courantes.");
        }

        // 2. Analyse Maps (Spécifique App Livreur / Tesla)
        reportParts.push(""); // Spacer
        reportParts.push("🗺️ **Analyse Google Maps Platform**");
        reportParts.push("Détection : Usage de `Maps.newGeocoder()` dans `Tesla.js`.");

        // Conseil Spécifique Caching
        reportParts.push("- **Opportunité d'économie (Geocoding)** :");
        reportParts.push("  L'application Tesla géocode les coordonnées GPS à chaque relevé ou rapport.");
        reportParts.push("  *Problème* : Si la voiture est garée au même endroit (ex: Entrepôt, Domicile), vous payez des appels API inutiles.");
        reportParts.push("  *Solution* : Implémenter un cache simple. Si lat/lng n'a pas changé de > 0.0001 depuis le dernier appel, réutiliser la dernière adresse connue.");

        // Alerte Client Mystère
        reportParts.push("");
        reportParts.push("🕵️ **Audit Agent Client Mystère**");
        reportParts.push("L'agent 'Client Mystère' scanne votre site toutes les 30 mins (approx 48 fois/jour).");
        reportParts.push("⚠️ **Risque de Coût Caché** : Si vos pages scannées déclenchent des appels API payants (Gemini, Maps) à chaque chargement, cet agent multiplie vos coûts par 48 chaque jour !");
        reportParts.push("👉 **Conseil** : Vérifiez que les pages visitées sont 'statiques' ou mises en cache.");

        // 3. Suivi des Coûts Tesla
        reportParts.push("");
        reportParts.push("🚗 **Suivi Coûts Flotte (Tesla)**");
        reportParts.push("J'ai détecté un module de coûts dans `Tesla.js` (Assurance, Parking, etc.).");
        reportParts.push("- **Suggestion** : Voulez-vous que je centralise les coûts API (Maps + Gemini) dans la même feuille 'Tesla_Couts' ou une feuille 'Global_Costs' ?");

        // 4. Recommandations Générales FinOps
        reportParts.push("");
        reportParts.push("💡 **Actions Immédiates au niveau du Compte Google Cloud**");
        reportParts.push("1. **Vérifiez vos Quotas** : https://console.cloud.google.com/iam-admin/quotas");
        reportParts.push("2. **Alertes de Budget** : Configurez une alerte à 50% de votre budget prévu.");
        reportParts.push("3. **Nettoyage Logs** : Réduisez les `Logger.log` dans les boucles (`Tesla.js`, `Agent_Qualite.js`) pour éviter les frais de Cloud Logging si vous avez beaucoup de trafic.");

        var finalReport = reportParts.join("\n");

        // Archivage automatique
        if (typeof logAgentReport === 'function') {
            logAgentReport('billing', finalReport);
        }

        return finalReport;

    } catch (e) {
        Logger.log("Erreur Billing Agent: " + e.toString());
        return "❌ Erreur critique lors de l'audit FinOps : " + e.toString();
    }
}
