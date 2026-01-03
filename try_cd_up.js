const ftp = require('basic-ftp');

async function inspect() {
    const client = new ftp.Client();
    try {
        console.log("🔌 Connexion...");
        await client.access({
            host: "ftp.yuda1395.odns.fr",
            user: "antigravity@yuda1395.odns.fr",
            password: "1970-Manolo-145",
            secure: false
        });

        console.log("PWD:", await client.pwd());

        try {
            await client.cd("..");
            console.log("⬆️  CD .. réussi ! PWD:", await client.pwd());
            const list = await client.list();
            list.forEach(f => console.log(`- ${f.name}`));
        } catch (e) {
            console.log("⛔ Impossible de remonter (Jail).");
        }

    } catch (err) {
        console.error(err);
    }
    client.close();
}

inspect();
