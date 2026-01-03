const ftp = require('basic-ftp');
const path = require('path');
const fs = require('fs');

const CONFIG = {
    host: "ftp.yuda1395.odns.fr",
    user: "antigravity@mediconvoi.fr",
    password: "1970-Manolo-145",
    secure: false,
    localDist: path.join(__dirname, 'V2_App', 'dist')
};

async function run() {
    const client = new ftp.Client();
    try {
        console.log("🔌 Connexion FTP (Compte @mediconvoi.fr)...");
        await client.access({
            host: CONFIG.host,
            user: CONFIG.user,
            password: CONFIG.password,
            secure: CONFIG.secure
        });
        console.log("✅ Connecté !");

        console.log("📂 Contenu actuel :");
        const list = await client.list();
        list.forEach(f => console.log(`- ${f.name}`));

        // Si c'est vide ou juste cgi-bin, il faut uploader ici !
        if (list.length < 3) {
            console.log("⚠️ Dossier quasi vide ! Le déploiement précédent était au mauvais endroit.");
            console.log("🚀 Upload direct dans ce dossier...");
            await client.uploadFromDir(CONFIG.localDist, "/");
            console.log("✅ Upload terminé.");
        } else {
            console.log("ℹ️ Des fichiers sont déjà là.");
        }

    } catch (err) {
        console.error("❌ Erreur:", err);
    }
    client.close();
}

run();
