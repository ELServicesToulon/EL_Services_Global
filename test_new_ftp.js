const ftp = require('basic-ftp');

async function inspect() {
    const client = new ftp.Client();
    // client.ftp.verbose = true;

    try {
        console.log("🔌 Connexion au NOUVEAU FTP...");
        await client.access({
            host: "ftp.yuda1395.odns.fr",
            user: "antigravity@yuda1395.odns.fr", // New user provided
            password: "1970-Manolo-145",
            secure: false
        });
        console.log("✅ Connecté !");

        console.log("\n--- Racine (/) ---");
        const listRoot = await client.list("/");
        listRoot.forEach(f => console.log(`- ${f.name} (${f.type === 2 ? 'DIR' : 'FILE'})`));

        // Check if we see the WordPress files that are currently live on mediconvoi.fr
        // Typical WP files: wp-config.php, wp-content, wp-admin, etc.
        const wpFiles = listRoot.find(f => f.name === 'wp-config.php' || f.name === 'wp-content');
        if (wpFiles) {
            console.log("🎯 BINGO ! J'ai trouvé des fichiers WordPress. C'est sûrement le bon endroit !");
        } else {
            // Maybe inside public_html?
            try {
                const listPublic = await client.list("/public_html");
                console.log("\n--- /public_html ---");
                listPublic.forEach(f => console.log(`- ${f.name}`));

                const wpFilesPublic = listPublic.find(f => f.name === 'wp-config.php' || f.name === 'wp-content');
                if (wpFilesPublic) {
                    console.log("🎯 BINGO ! J'ai trouvé des fichiers WordPress dans public_html.");
                } else {
                    console.log("⚠️ Toujours pas de fichiers WordPress visibles...");
                }
            } catch (e) {
                console.log("Pas de public_html.");
            }
        }

    } catch (err) {
        console.error("❌ Erreur FTP:", err.message);
    }
    client.close();
}

inspect();
