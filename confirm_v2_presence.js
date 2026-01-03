const ftp = require('basic-ftp');

async function inspect() {
    const client = new ftp.Client();
    const config = {
        host: "ftp.yuda1395.odns.fr",
        user: "antigravity@yuda1395.odns.fr", // We use the account that WORKS
        password: "1970-Manolo-145",
        secure: false
    };

    try {
        console.log("🔌 Connexion FTP...");
        await client.access(config);
        console.log("✅ Connecté !");

        // 1. Check if we are in public_html and if it contains OUR deployment
        const list = await client.list();
        const hasVite = list.some(f => f.name === 'vite.svg');
        const hasIndex = list.some(f => f.name === 'index.html');

        if (hasVite && hasIndex) {
            console.log("👉 Le dossier contient BIEN notre déploiement V2.");
            console.log("👉 Si le site affiche WordPress, c'est que le NDD pointe AILLEURS.");
        } else {
            console.log("❓ Le dossier ne contient pas notre déploiement V2 (Bizarre).");
        }

    } catch (err) {
        console.error("❌ Erreur:", err.message);
    }
    client.close();
}

inspect();
