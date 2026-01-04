const ftp = require('basic-ftp');

async function inspect() {
    const client = new ftp.Client();
    // client.ftp.verbose = true;

    try {
        console.log("🔌 Tentative de connexion FTP (Main User: yuda1395)...");
        await client.access({
            host: "ftp.yuda1395.odns.fr",
            user: "yuda1395", // Confirmed cPanel username
            password: "Manolo-145",
            secure: false
        });
        console.log("✅ Connecté en tant que Root/Main user !");

        console.log("\n--- Racine (/) ---");
        const listRoot = await client.list("/");
        listRoot.forEach(f => console.log(`- ${f.name} (${f.type === 2 ? 'DIR' : 'FILE'})`));

        // Check potential directories for mediconvoi
        const possibleDirs = ['public_html', 'mediconvoi.fr', 'sites'];

        for (const dir of possibleDirs) {
            try {
                const list = await client.list("/" + dir);
                console.log(`\n--- /${dir} ---`);
                list.slice(0, 15).forEach(f => console.log(`- ${f.name}`)); // Limit output
                if (list.length > 15) console.log(`... (+${list.length - 15} others)`);
            } catch (e) {
                // Ignore if dir doesn't exist
            }
        }

    } catch (err) {
        console.error("❌ Erreur FTP (Test 1 - yuda1395):", err.message);

        // Retry with pure email just in case, though unlikely for FTP/SFTP usually
        try {
            console.log("\n🔌 Tentative de connexion FTP (Email)...");
            await client.access({
                host: "ftp.yuda1395.odns.fr",
                user: "elservicestoulon@gmail.com",
                password: "Manolo-145",
                secure: false
            });
            console.log("✅ Connecté avec l'email !");
            console.log("\n--- Racine (/) ---");
            const listRoot = await client.list("/");
            listRoot.forEach(f => console.log(`- ${f.name}`));
        } catch (err2) {
            console.error("❌ Erreur FTP (Test 2 - Email):", err2.message);
        }
    }
    client.close();
}

inspect();
