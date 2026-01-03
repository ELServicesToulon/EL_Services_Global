const ftp = require('basic-ftp');
const path = require('path');

async function deploy() {
    const client = new ftp.Client();
    // client.ftp.verbose = true; // Décommenter pour debug

    try {
        console.log("🔌 Connexion au FTP o2switch...");
        await client.access({
            host: "ftp.yuda1395.odns.fr",
            user: "AntigravityELS@yuda1395.odns.fr",
            password: "1970-Manolo-145",
            secure: false // FTP simple (ou essayer true pour FTPS)
        });
        console.log("✅ Connecté !");

        // Lister pour trouver le bon dossier
        const list = await client.list();
        console.log("📂 Contenu Racine:", list.map(f => f.name).join(', '));

        // Cible : On suppose que le domaine principal pointe sur public_html ou www
        // Si c'est un domaine supplémentaire, il peut avoir son propre dossier.
        // On va déposer dans 'public_html' pour commencer (standard cPanel).

        const remoteDir = "/public_html";
        // Note: Si 'mediconvoi.fr' est un domaine Addon, il faudrait peut-être aller dans /public_html/mediconvoi.fr
        // Je vais check si un dossier mediconvoi existe.

        const hasMediconvoiDir = list.find(f => f.name === 'mediconvoi.fr' || f.name === 'mediconvoi');
        let target = remoteDir;

        if (hasMediconvoiDir) {
            target = "/" + hasMediconvoiDir.name;
            console.log(`ℹ️ Dossier spécifique détecté, déploiement vers ${target}`);
        } else {
            // Vérifier dans public_html si il y a un sous-dossier
            try {
                const subList = await client.list("/public_html");
                const subMed = subList.find(f => f.name === 'mediconvoi.fr' || f.name === 'mediconvoi');
                if (subMed) {
                    target = "/public_html/" + subMed.name;
                    console.log(`ℹ️ Dossier spécifique détecté dans public_html: ${target}`);
                }
            } catch (e) { }
        }

        console.log(`🚀 Déploiement vers ${target}...`);

        // Upload du dossier dist
        await client.ensureDir(target);
        await client.clearWorkingDir(); // Optionnel : vide le dossier avant (Attention !) -> Je commente par sécurité pour l'instant
        // await client.removeDir(target); // Trop dangereux

        await client.uploadFromDir("ELS_Livreur_App/dist", target);

        console.log("✅ DÉPLOIEMENT TERMINÉ !");

    } catch (err) {
        console.error("❌ Erreur FTP:", err);
    }
    client.close();
}

deploy();
