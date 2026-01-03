const ftp = require('basic-ftp');

async function inspect() {
    const client = new ftp.Client();
    const password = "1970-Manolo-145";

    // Scenarios to test based on the new info
    const scenarios = [
        { host: "truchat.o2switch.net", user: "truchat" },
        { host: "truchat.o2switch.net", user: "mediconvoi" },
        { host: "ftp.mediconvoi.fr", user: "truchat" },
        { host: "ftp.mediconvoi.fr", user: "mediconvoi" },
        { host: "ftp.yuda1395.odns.fr", user: "truchat" }, // Just in case
    ];

    for (const s of scenarios) {
        try {
            console.log(`🔌 Testing: ${s.user}@${s.host} ...`);
            await client.access({
                host: s.host,
                user: s.user,
                password: password,
                secure: false // Try false first, standard FTP
            });
            console.log(`✅ SUCCESS! Connected to ${s.host} as ${s.user}`);

            console.log("\n--- Root Listing ---");
            const list = await client.list("/");
            list.forEach(f => console.log(`- ${f.name}`));

            client.close();
            return; // Exit on success
        } catch (err) {
            console.log(`❌ Failed: ${err.message}`);
        }
    }
    console.log("🏁 All attempts failed.");
    client.close();
}

inspect();
