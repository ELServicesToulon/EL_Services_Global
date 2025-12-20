/**
 * Agent Client Mystère
 * ====================
 * Cet agent simule un utilisateur (Client Mystère) qui navigue sur le site
 * pour vérifier la disponibilité et la performance des pages clés.
 */

/**
 * Exécute la tournée du Client Mystère.
 * Scanne les pages configurées et génère un rapport.
 */
function executerClientMystere() {
    try {
        var webAppUrl = PropertiesService.getScriptProperties().getProperty("WEBAPP_URL");

        // Tentative de récupération automatique si non défini (ne fonctionne que si déployé proprement)
        if (!webAppUrl) {
            try {
                webAppUrl = ScriptApp.getService().getUrl();
            } catch (e) {
                // Ignorer, peut échouer si pas publié
            }
        }

        if (!webAppUrl) {
            return "⚠️ Configuration manquante : Impossible de trouver l'URL de l'application.\n" +
                "Veuillez définir la propriété de script 'WEBAPP_URL' avec l'URL de votre déploiement.";
        }

        // Liste des pages à tester
        // Format: { nom: "", page: "", attendu: "" }
        var pagesATester = [
            {
                nom: "Accueil",
                page: "",
                attendu: 200 // Code HTTP 200
            },
            {
                nom: "Infos Confidentialité",
                page: "infos",
                attendu: "Confidentialité" // Texte à trouver dans le corps
            },
            {
                nom: "Administration (Accès)",
                page: "admin",
                // On s'attend à être bloqué ou redirigé si on n'est pas auth, mais la page doit répondre
                attendu: 200
            }
        ];

        var rapport = ["🕵️ **Rapport du Client Mystère**", "URL Cible : " + webAppUrl, ""];
        var erreurs = 0;
        var tempsTotal = 0;

        for (var i = 0; i < pagesATester.length; i++) {
            var test = pagesATester[i];
            var url = webAppUrl + (url.indexOf('?') === -1 ? '?' : '&') + "page=" + test.page;

            var debut = new Date().getTime();
            var response = null;
            var erreurMsg = null;

            try {
                response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
            } catch (e) {
                erreurMsg = e.toString();
            }
            var fin = new Date().getTime();
            var duree = fin - debut;
            tempsTotal += duree;

            var statusIcon = "✅";
            var detail = "";

            if (erreurMsg) {
                statusIcon = "❌";
                detail = "Erreur technique : " + erreurMsg;
                erreurs++;
            } else {
                var code = response.getResponseCode();
                var content = response.getContentText();

                // Vérification du code HTTP (si attendu est un nombre)
                if (typeof test.attendu === 'number') {
                    if (code !== test.attendu) {
                        statusIcon = "⚠️";
                        detail = "Code HTTP " + code + " (Attendu : " + test.attendu + ")";
                        erreurs++;
                    } else {
                        detail = "Code " + code + " OK";
                    }
                }
                // Vérification de contenu textuel (si attendu est une string)
                else if (typeof test.attendu === 'string') {
                    if (content.indexOf(test.attendu) === -1) {
                        statusIcon = "⚠️";
                        detail = "Contenu '" + test.attendu + "' introuvable.";
                        erreurs++;
                    } else {
                        detail = "Contenu vérifié OK";
                    }
                }
            }

            rapport.push(statusIcon + " **" + test.nom + "** (" + duree + "ms) : " + detail);
        }

        rapport.push("");
        rapport.push("⏱️ Temps total de navigation : " + tempsTotal + "ms");

        if (erreurs > 0) {
            rapport.push("💣 Bilan : " + erreurs + " problème(s) détecté(s).");
        } else {
            rapport.push("✨ Bilan : Navigation fluide, aucun problème détecté.");
        }

        // Convertir le tableau en chaîne
        var rapportFinal = rapport.join("\n");

        // Envoyer un email d'alerte seulement s'il y a des erreurs critiques (Optionnel)
        if (erreurs > 0) {
            envoyerAlerteEmail(rapportFinal);
        }

        return rapportFinal;

    } catch (e) {
        return "Erreur critique de l'agent Client Mystère : " + e.toString();
    }
}

/**
 * Envoie une alerte email
 */
function envoyerAlerteEmail(contenu) {
    var adminEmail = PropertiesService.getScriptProperties().getProperty("ADMIN_EMAIL");
    if (adminEmail) {
        MailApp.sendEmail({
            to: adminEmail,
            subject: "⚠️ Alerte Client Mystère - Problème détecté sur Els Global",
            body: contenu
        });
    }
}

/**
 * Installe le déclencheur pour le Client Mystère (toutes les 30 minutes).
 * A lancer une fois manuellement.
 */
function installerDeclencheursClientMystere() {
    // Supprime les anciens déclencheurs pour éviter les doublons
    var triggers = ScriptApp.getProjectTriggers();
    for (var i = 0; i < triggers.length; i++) {
        if (triggers[i].getHandlerFunction() === 'executerClientMystere') {
            ScriptApp.deleteTrigger(triggers[i]);
        }
    }

    // Crée un nouveau déclencheur toutes les 30 minutes
    ScriptApp.newTrigger('executerClientMystere')
        .timeBased()
        .everyMinutes(30)
        .create();

    Logger.log("Déclencheur Client Mystère installé (30 min).");
}
