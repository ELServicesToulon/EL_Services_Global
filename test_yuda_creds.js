const ftp = require('basic-ftp');

async function inspect() {
    const client = new ftp.Client();
    const user = "yuda1395";
    const password = "1970-Manolo-145";

    const hosts = [
        "ftp.yuda1395.odns.fr",
        "ftp.mediconvoi.fr",
        "truchat.o2switch.net",
        "ftp.truchat.o2switch.net"
    ];

    for (const host of hosts) {
        try {
            console.log(`🔌 Testing ${user}@${host} ...`);
            await client.access({
                host: host,
                user: user,
                password: password,
                secure: false
            });
            console.log(`✅ SUCCESS! Connected to ${host} as ${user}`);

            console.log("\n--- Root Listing ---");
            const list = await client.list("/");
            list.forEach(f => console.log(`- ${f.name} (${f.type === 2 ? 'DIR' : 'FILE'})`));

            client.close();
            return;
        } catch (err) {
            console.log(`❌ Failed on ${host}: ${err.message}`);
        }
    }
    console.log("🏁 All attempts failed.");
    client.close();
}

inspect();
