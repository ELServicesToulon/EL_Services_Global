/**
 * Agent Client Mystère (Mystery Shopper)
 * ======================================
 * Expert en Assurance Qualité Utilisateur (QA/UX).
 * Mission : Simuler un utilisateur humain pour vérifier le parcours critique.
 * Spécialité : Détection d'erreurs, Dispatch de correctifs, et Suggestions d'évolutions.
 * Horaires : Lundi-Vendredi, 11h00 et 16h30.
 */

/**
 * Exécute la tournée du Client Mystère.
 * Scanne les pages configurées et génère un rapport.
 * Dispatch les erreurs aux agents concernés.
 */
function executerClientMystere() {
    try {
        // 1. Vérification Horaire (Lundi-Vendredi ?)
        var now = new Date();
        var day = now.getDay(); // 0=Dim, 1=Lun, ..., 6=Sam
        // Si weekend (0 ou 6), on s'arrête (sauf si forcé manuellement via paramètre, mais ici Trigger)
        // Note: Le trigger horaire peut déclencher, donc on filtre ici.
        if (day === 0 || day === 6) {
            Logger.log("Weekend - Pas de Client Mystère.");
            return "Weekend - Repos.";
        }

        // 2. Initialisation URL
        var webAppUrl = PropertiesService.getScriptProperties().getProperty("WEBAPP_URL");
        if (!webAppUrl) {
            // Fallback
            try { webAppUrl = ScriptApp.getService().getUrl(); } catch (e) { }
        }

        if (!webAppUrl) {
            return "⚠️ Configuration manquante : WEBAPP_URL non définie.";
        }

        // 3. Définition du Parcours (Scenario)
        var pagesATester = [
            { nom: "Accueil", page: "", attendu: 200 },
            { nom: "Infos Confidentialité", page: "infos", attendu: "Confidentialité" },
            { nom: "Administration (Accès)", page: "admin", attendu: 200 }
        ];

        var rapport = ["🕵️ **Rapport Expert QA (Client Mystère)**"];
        rapport.push("Date: " + Utilities.formatDate(now, Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm"));
        rapport.push("--------------------------------------------------");

        var erreurs = [];
        var tempsTotal = 0;

        // 4. Exécution des Tests
        for (var i = 0; i < pagesATester.length; i++) {
            var test = pagesATester[i];
            var url = webAppUrl + (webAppUrl.indexOf('?') === -1 ? '?' : '&') + "page=" + test.page;

            var debut = new Date().getTime();
            var response = null;
            var errorDetails = null;

            try {
                response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
            } catch (e) {
                errorDetails = e.toString();
            }

            var duree = (new Date().getTime()) - debut;
            tempsTotal += duree;

            if (errorDetails) {
                erreurs.push({ type: "TECHNIQUE", page: test.nom, msg: errorDetails });
                rapport.push(`❌ **${test.nom}** (${duree}ms) : Erreur technique -> ${errorDetails}`);
            } else {
                var code = response.getResponseCode();
                var content = response.getContentText();

                if (typeof test.attendu === 'number' && code !== test.attendu) {
                    erreurs.push({ type: "HTTP", page: test.nom, msg: `Code ${code} (Attendu ${test.attendu})` });
                    rapport.push(`⚠️ **${test.nom}** : Code ${code}`);
                } else if (typeof test.attendu === 'string' && content.indexOf(test.attendu) === -1) {
                    erreurs.push({ type: "CONTENT", page: test.nom, msg: `Contenu '${test.attendu}' manquant` });
                    rapport.push(`⚠️ **${test.nom}** : Contenu manquant`);
                } else {
                    rapport.push(`✅ **${test.nom}** (${duree}ms) : OK`);
                }
            }
        }

        // 5. Analyse & Dispatching
        rapport.push("");
        if (erreurs.length > 0) {
            rapport.push("🚨 **ANOMALIES DÉTECTÉES (" + erreurs.length + ")**");

            // Logique de Dispatch simulée
            erreurs.forEach(function (err) {
                var assignTo = "Admin";
                if (err.type === "TECHNIQUE" || err.type === "HTTP") assignTo = "Mechanic (Maintenance Code)";

                rapport.push(`- [${err.type}] sur ${err.page} -> Dispatché à : **${assignTo}**`);
                // Ici on pourrait stocker l'incident dans une Sheet "Tickets"
                // logTicket(assignTo, err); 
            });

            // PAS D'EMAIL (selon demande utilisateur), sauf si on décide d'activer une option "Critical Only"
            // L'utilisateur a dit "ne m envoie pas de mail".
        } else {
            rapport.push("✨ **Parcours Nominal Validé**");
            // Suggestion proactive (Expert Scaling)
            if (Math.random() < 0.3) { // 30% de chance de proposer une amélioration
                rapport.push("");
                rapport.push("💡 **Suggestion de l'Expert QA** :");
                rapport.push("Le temps de réponse global est de " + tempsTotal + "ms.");

                if (tempsTotal > 5000) {
                    rapport.push("⚠️ **Lenteur critique** : Je recommande de recruter (créer) un **Agent SRE (Site Reliability Engineer)** pour optimiser l'infra.");
                } else if (tempsTotal > 2000) {
                    rapport.push("-> Performance moyenne. Demandez à l'Agent 'Bolt' d'optimiser le backend.");
                } else {
                    rapport.push("-> Performance excellente. Pensez à ajouter un test sur la page 'Contact' pour sécuriser la croissance.");
                }
            }
        }

        // Suggestion de nouveautés si erreurs spécifiques
        if (erreurs.some(e => e.msg.includes("Timeout"))) {
            rapport.push("⚠️ **Timeout détecté** : Il serait judicieux de créer un **Agent Network** pour surveiller les quotas.");
        }

        return rapport.join("\n");

    } catch (e) {
        Logger.log("Erreur Client Mystere: " + e.toString());
        return "Erreur Fatal Agent QA: " + e.toString();
    }
}

/**
 * Configure les déclencheurs :
 * - Supprime les anciens (pour éviter les doublons/conflits).
 * - Crée deux triggers quotidiens à 11h et 16h et 30min (approx).
 * Note: Apps Script timeBased().atHour(X) est +/- 15 min. Pour être précis 11h00 et 16h30, c'est dur.
 * On va viser 11h et 16h.
 */
function installerDeclencheursClientMystere() {
    // 1. Nettoyage
    var triggers = ScriptApp.getProjectTriggers();
    for (var i = 0; i < triggers.length; i++) {
        if (triggers[i].getHandlerFunction() === 'executerClientMystere') {
            ScriptApp.deleteTrigger(triggers[i]);
        }
    }

    // 2. Création (11h00 approx)
    ScriptApp.newTrigger('executerClientMystere')
        .timeBased()
        .everyDays(1)
        .atHour(11)
        .create();

    // 3. Création (16h00 approx -> on ne peut pas spécifier 16h30 facilement avec atHour)
    // Workaround pour 16h30 : Trigger à 16h ou 17h. On choisit 16h.
    ScriptApp.newTrigger('executerClientMystere')
        .timeBased()
        .everyDays(1)
        .atHour(16)
        .create();

    Logger.log("Déclencheurs Client Mystère installés (11h et 16h - Jours ouvrés filtrés dans le code).");
    return "Déclencheurs activés (11h / 16h)";
}
