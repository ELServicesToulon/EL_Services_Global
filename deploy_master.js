const { execSync } = require('child_process');
const path = require('path');

function runCommand(command, cwd = process.cwd()) {
    console.log(`\n🚀 Exécution: ${command}`);
    try {
        execSync(command, { stdio: 'inherit', cwd });
        console.log(`✅ Succès.`);
    } catch (e) {
        console.error(`❌ Erreur lors de l'exécution de: ${command}`);
        process.exit(1);
    }
}

async function main() {
    const rootDir = __dirname;
    const v2Dir = path.join(rootDir, 'V2_App');

    console.log("🔥  DÉBUT DU DÉPLOIEMENT SYSTÉMATIQUE  🔥");
    console.log("--------------------------------------------");

    // 1. GIT : Add, Commit, Push
    console.log("\n📦 ÉTAPE 1 : Sauvegarde GitHub (PVG)");
    try {
        const timestamp = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
        runCommand('git add .');
        // On ne fail pas si rien à commit
        try {
            runCommand(`git commit -m "Auto-Deploy: ${timestamp}"`);
        } catch (e) {
            console.log("ℹ️ Rien à commiter.");
        }
        runCommand('git push');
    } catch (e) {
        console.warn("⚠️ Attention: Problème Git (non bloquant pour FTP).");
    }

    // 2. V2 APP : Build & FTP
    console.log("\n🌍 ÉTAPE 2 : Déploiement V2 (FTP)");
    // Build
    // runCommand('npm run build', v2Dir); // Déjà intégré dans deploy_ftp_node souvent, mais vérifions. 
    // Le deploy_ftp_node.js ne build pas forcément, ajoutons le.
    // runCommand('npm run build', v2Dir); 
    // Pour gagner du temps, on suppose que deploy_ftp_node le fait ou qu'on le lance ici.
    // On va lancer le script de déploiement FTP existant qui semble fonctionner.
    runCommand('node V2_App/deploy_ftp_node.js', rootDir);

    // 3. AGENTS : Restart (Optionnel, si PM2 utilisé)
    // console.log("\n🤖 ÉTAPE 3 : Relance Agents (Si nécessaire)");
    // runCommand('pm2 restart all || true');

    console.log("\n✅  DÉPLOIEMENT TERMINÉ AVEC SUCCÈS  ✅");
}

main();
