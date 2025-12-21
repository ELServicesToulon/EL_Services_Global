/**
 * @fileoverview Agent Marketing (SEO & Analytics)
 * Expert en visibilité, acquisition de trafic et analyse d'audience.
 * Analyse la présence des balises SEO et l'intégration Google Analytics.
 */

/**
 * Lance l'audit marketing complet.
 * Vérifie la configuration SEO de base et les tags de tracking.
 * @returns {string} Le rapport d'audit au format Markdown.
 */
function runMarketingAudit() {
    saveAgentLastRun('marketing');
    try {
        const reportParts = [];
        reportParts.push("📈 **Rapport d'Audit Marketing & SEO**");
        reportParts.push("🚀 **Agent Marketing** : Expert Visibilité & Analytics.");
        reportParts.push("Date: " + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm"));
        reportParts.push("");

        // 1. Audit SEO (Simulation basique sur la conf)
        reportParts.push("🔍 **Analyse SEO (Search Engine Optimization)**");
        // On essaie de récupérer le nom de l'entreprise depuis la configuration globale si possible
        const appName = (typeof Config !== 'undefined' && Config.NOM_ENTREPRISE) ? Config.NOM_ENTREPRISE : "EL Services";

        reportParts.push(`- **Identité** : Audit pour ${appName}.`);
        reportParts.push("- **Titre de la WebApp** : Vérifiez que `setTitle()` est bien utilisé dans `Code.js` avec des mots-clés pertinents (ex: 'Livraison Médicaments Toulon').");
        reportParts.push("- **Meta Description** : Indispensable pour le CTR (Taux de clic) dans Google.");
        reportParts.push("  👉 *Action* : Assurez-vous que votre fichier HTML principal contient `<meta name='description' content='...'>`.");

        // 2. Google Analytics
        reportParts.push("");
        reportParts.push("📊 **Google Analytics (GA4)**");
        const gaId = PropertiesService.getScriptProperties().getProperty("GOOGLE_ANALYTICS_ID");

        if (gaId) {
            reportParts.push("✅ **Tracking Actif** : ID détecté `" + gaId + "`.");
            reportParts.push("- Vérifiez que le script `gtag.js` est bien inséré dans `Index.html` ou le template principal.");
            reportParts.push("- Assurez-vous d'avoir configuré les conversions (ex: 'Réservation Terminée').");
        } else {
            reportParts.push("⚠️ **Tracking Manquant** : Aucun ID Google Analytics trouvé dans les propriétés du script.");
            reportParts.push("  👉 *Conseil* : Créez une propriété GA4 (gratuit) et ajoutez l'ID `GOOGLE_ANALYTICS_ID` (format G-XXXXXXXX) dans les Propriétés du Script.");
            reportParts.push("  Cela vous permettra de connaître : nombre de visiteurs, sources de trafic (Facebook, Direct, etc.), et taux de conversion.");
        }

        // 3. Social Proof / Réassurance
        reportParts.push("");
        reportParts.push("⭐ **Preuve Sociale & Réassurance**");
        const proofEnabled = (typeof Config !== 'undefined') ? Config.proofSocialEnabled : "Inconnu";
        if (proofEnabled === true) {
            reportParts.push("✅ **Preuve sociale active** : Le flag `proofSocialEnabled` est à true.");
        } else {
            reportParts.push("ℹ️ **Preuve sociale inactive** : Le flag `proofSocialEnabled` est false ou indéfini.");
            reportParts.push("  👉 *Conseil* : Affichez les logos partenaires ou une note moyenne pour rassurer les nouveaux prospects.");
        }

        // 4. Recommendation Stratégique
        reportParts.push("");
        reportParts.push("💡 **Plan d'Action Marketing**");
        reportParts.push("1. **Google My Business** : Indispensable pour le SEO local 'Livraison Toulon'. Vérifiez que votre fiche est à jour avec des horaires et des photos.");
        reportParts.push("2. **Campagnes Emailing** : Utilisez la base clients (onglet `Clients`) pour envoyer une newsletter mensuelle (nouveaux services, jours fériés...).");
        reportParts.push("3. **Vitesse de chargement** : L'Agent Bolt surveille la perf, c'est aussi un critère SEO majeur.");

        return reportParts.join("\n");

    } catch (e) {
        Logger.log("Erreur Marketing Agent: " + e.toString());
        return "❌ Erreur critique lors de l'audit Marketing : " + e.toString();
    }
}
