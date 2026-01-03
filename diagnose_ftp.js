const ftp = require('basic-ftp');

const CONFIG = {
    host: "ftp.yuda1395.odns.fr",
    user: "antigravity@mediconvoi.fr",
    password: "1970-Manolo-145",
    secure: false
};

async function run() {
    const client = new ftp.Client();
    try {
        await client.access(CONFIG);
        console.log("Connected. Root content:");
        const list = await client.list();

        // Print all root items
        for (const f of list) {
            console.log(`[${f.isDirectory ? 'DIR' : 'FILE'}] ${f.name}`);
        }

        // define candidates
        const candidates = ['mediconvoi.fr', 'public_html', 'www'];

        for (const c of candidates) {
            const found = list.find(f => f.name === c && f.isDirectory);
            if (found) {
                console.log(`\n--- Listing inside '${c}' ---`);
                const sub = await client.list(c);
                // Limit to 20 items
                sub.slice(0, 20).forEach(s => console.log(`  [${s.isDirectory ? 'DIR' : 'FILE'}] ${s.name}`));
            }
        }

    } catch (e) {
        console.error("Error:", e);
    }
    client.close();
}

run();
