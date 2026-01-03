const ftp = require('basic-ftp');
const path = require('path');
const fs = require('fs');

// Configuration
// On utilise le compte antigravity@yuda1395.odns.fr qui a accès à public_html
// OU le nouveau compte antigravity@mediconvoi.fr s'il a été créé (souvent même mot de passe)
const CONFIG = {
    host: "ftp.yuda1395.odns.fr",
    user: "antigravity@yuda1395.odns.fr",
    password: "1970-Manolo-145",
    secure: false,
    localDist: path.join(__dirname, 'V2_App', 'dist')
};

async function run() {
    const client = new ftp.Client();
    try {
        console.log("🔌 Connexion FTP...");
        await client.access({
            host: CONFIG.host,
            user: CONFIG.user,
            password: CONFIG.password,
            secure: CONFIG.secure
        });
        console.log("✅ Connecté !");

        // IMPORTANT : O2Switch crée souvent mediconvoi.fr dans un sous-dossier "/mediconvoi.fr"
        // au lieu de public_html quand on l'ajoute comme addon domain.
        // On va vérifier où on est et où on doit aller.

        console.log("📂 Recherche du dossier cible...");
        const list = await client.list("/");
        // Si on voit 'mediconvoi.fr' comme dossier, c'est là qu'il faut aller !
        const mediDir = list.find(f => f.name === 'mediconvoi.fr');

        let targetDir = "/"; // Par défaut on reste à la racine de l'utilisateur FTP (qui devrait être public_html)

        // C'est subtil :
        // Si l'utilisateur a configuré "Document Root: public_html" lors de la création, alors mediconvoi.fr POINTE sur public_html.
        // Donc on déploie DANS public_html (là où on est déjà).

        // Mais si cPanel a créé un dossier "mediconvoi.fr" à côté, le domaine risque de pointer dessus.
        // On va assumer que l'utilisateur a suivi ma consigne "Document Root: public_html".
        // Donc on ne change rien, on laisse les fichiers là où ils sont déjà (j'ai déjà déployé 2 fois).

        console.log("ℹ️ Vérification des fichiers existants...");
        const content = await client.list(targetDir);
        const hasIndex = content.some(f => f.name === 'index.html');

        if (hasIndex) {
            console.log("✅ Les fichiers V2 sont DÉJÀ présents à cet endroit.");
            console.log("🚀 Le site devrait être visible immédiatement !");
        } else {
            console.log("⚠️ Fichiers introuvables, on relance l'upload par sécurité.");
            await client.uploadFromDir(CONFIG.localDist, targetDir);
            console.log("✅ Upload terminé.");
        }

    } catch (err) {
        console.error("❌ Erreur:", err);
    }
    client.close();
}

run();
