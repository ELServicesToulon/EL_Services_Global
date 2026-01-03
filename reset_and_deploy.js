const ftp = require('basic-ftp');
const path = require('path');
const fs = require('fs');

async function deploy() {
    const client = new ftp.Client();
    // client.ftp.verbose = true;

    try {
        console.log("🔌 Connexion au FTP o2switch...");
        await client.access({
            host: "ftp.yuda1395.odns.fr",
            user: "AntigravityELS@yuda1395.odns.fr",
            password: "1970-Manolo-145",
            secure: false
        });
        console.log("✅ Connecté !");

        const remoteRoot = "/public_html";
        await client.ensureDir(remoteRoot);

        // 1. BACKUP / CLEANING
        console.log("🧹 Préparation du nettoyage...");
        const list = await client.list(remoteRoot);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDirName = `_BACKUP_RESET_${timestamp}`;
        const backupPath = `${remoteRoot}/${backupDirName}`;

        // Filtrer ce qui doit être déplacé (ne pas déplacer le dossier de backup qu'on vient de créer ou d'autres backups)
        const itemsToMove = list.filter(item =>
            item.name !== '.' &&
            item.name !== '..' &&
            !item.name.startsWith('_BACKUP') &&
            item.name !== '.well-known' // Often important for SSL
        );

        if (itemsToMove.length > 0) {
            console.log(`📦 Déplacement des fichiers existants vers ${backupPath}...`);
            await client.ensureDir(backupPath);

            for (const item of itemsToMove) {
                const src = `${remoteRoot}/${item.name}`;
                const dest = `${backupPath}/${item.name}`;
                try {
                    await client.rename(src, dest);
                    // console.log(`   -> ${item.name} déplacé.`);
                } catch (e) {
                    console.error(`   ⚠️ Impossible de déplacer ${item.name}:`, e.message);
                }
            }
            console.log("✅ Nettoyage terminé (fichiers archivés).");
        } else {
            console.log("ℹ️ Dossier déjà vide (ou presque).");
        }

        // 2. UPLOADING
        console.log("🚀 Téléversement de la nouvelle version (V2)...");
        const localDist = path.join(__dirname, 'V2_App', 'dist');

        if (!fs.existsSync(localDist)) {
            throw new Error(`Le dossier local ${localDist} n'existe pas ! Avez-vous buildé ?`);
        }

        await client.uploadFromDir(localDist, remoteRoot);
        console.log("✅ UPLOAD TERMINÉ !");

    } catch (err) {
        console.error("❌ Erreur:", err);
    }
    client.close();
}

deploy();
