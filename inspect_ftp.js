const ftp = require('basic-ftp');

async function inspect() {
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

        console.log("\n--- Racine (/) ---");
        const listRoot = await client.list("/");
        listRoot.forEach(f => console.log(`- ${f.name} (${f.type === 2 ? 'DIR' : 'FILE'})`));

        // Check public_html
        console.log("\n--- /public_html ---");
        try {
            const listPublic = await client.list("/public_html");
            listPublic.forEach(f => console.log(`- ${f.name} (${f.type === 2 ? 'DIR' : 'FILE'})`));
        } catch (e) {
            console.log("Pas de dossier public_html ou erreur d'accès.");
        }

    } catch (err) {
        console.error("❌ Erreur FTP:", err);
    }
    client.close();
}

inspect();
