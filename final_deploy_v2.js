const ftp = require('basic-ftp');
const path = require('path');
const fs = require('fs');

// Configuration
const CONFIG = {
    host: "ftp.yuda1395.odns.fr",
    user: "antigravity@yuda1395.odns.fr",
    password: "1970-Manolo-145",
    secure: false,
    localDist: path.join(__dirname, 'V2_App', 'dist')
};

async function run() {
    const client = new ftp.Client();
    // client.ftp.verbose = true;

    try {
        console.log("🔌 Connexion au FTP (Check final)...");
        await client.access({
            host: CONFIG.host,
            user: CONFIG.user,
            password: CONFIG.password,
            secure: CONFIG.secure
        });
        console.log("✅ Connecté !");

        // 1. Lister le contenu pour confirmer qu'on est au bon endroit
        console.log("📂 Contenu actuel du dossier distant :");
        const list = await client.list();
        // Afficher quelques fichiers clés
        list.slice(0, 10).forEach(f => console.log(`- ${f.name}`));

        const hasWP = list.some(f => f.name.includes('wp-content') || f.name.includes('wp-config'));
        const hasV2 = list.some(f => f.name === 'index.html' && f.size < 2000); // Simple heuristic

        if (hasWP) {
            console.log("🎯 CIBLE CONFIRMÉE : Fichiers WordPress détectés. On est au bon endroit !");
        } else if (hasV2) {
            console.log("ℹ️ Dossier contient déjà potentiellement une app JS/Vite.");
        } else {
            console.log("⚠️ Dossier vide ou inconnu. On installe quand même ? OUI.");
        }

        // 2. BACKUP (Move all current content to a backup folder)
        console.log("\n🧹 Début du RESET (Backup & Nettoyage)...");
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDirName = `_BACKUP_OLD_SITE_${timestamp}`;

        // Créer le dossier de backup
        await client.ensureDir(backupDirName);

        // Déplacer tout le monde sauf le backup lui-même
        // On reliste pour être sûr
        const listToMove = await client.list();
        let moveCount = 0;

        for (const item of listToMove) {
            if (item.name === backupDirName || item.name === '.' || item.name === '..') continue;

            try {
                await client.rename(item.name, `${backupDirName}/${item.name}`);
                moveCount++;
            } catch (e) {
                console.log(`   ⚠️ Echec déplacement ${item.name}: ${e.message}`);
            }
        }
        console.log(`✅ Nettoyage terminé. ${moveCount} éléments archivés dans ${backupDirName}.`);

        // 3. UPLOAD V2
        console.log("\n🚀 Upload de la nouvelle application V2...");
        if (!fs.existsSync(CONFIG.localDist)) {
            throw new Error("Dossier dist local introuvable !");
        }

        await client.uploadFromDir(CONFIG.localDist, "/"); // Upload to root of FTP user (which is public_html)

        console.log("✅ DÉPLOIEMENT TERMINÉ AVEC SUCCÈS !");

    } catch (err) {
        console.error("❌ Erreur:", err);
    }
    client.close();
}

run();
