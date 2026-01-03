const ftp = require('basic-ftp');

async function inspect() {
    const client = new ftp.Client();
    const password = "1970-Manolo-145";
    const host = "ftp.yuda1395.odns.fr"; // or just the IP

    // List of potential usernames to try
    const usernames = [
        "truchatodns",
        "truchat",
        "elservicestoulon",
        "elservice",
        "mediconvoi",
        "admin"
    ];

    for (const user of usernames) {
        try {
            console.log(`🔌 Testing user: ${user} ...`);
            await client.access({
                host: host,
                user: user,
                password: password,
                secure: false
            });
            console.log(`✅ SUCCESS! Valid user found: ${user}`);

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
