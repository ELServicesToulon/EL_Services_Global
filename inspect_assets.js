const ftp = require('basic-ftp');

const CONFIG = {
    host: "ftp.yuda1395.odns.fr",
    user: "antigravity@mediconvoi.fr",
    password: "1970-Manolo-145",
    secure: false
};

async function listAssets() {
    const client = new ftp.Client();
    try {
        await client.access({
            host: CONFIG.host,
            user: CONFIG.user,
            password: CONFIG.password,
            secure: CONFIG.secure
        });
        console.log("Listing /assets ...");
        const list = await client.list("/assets");
        list.forEach(f => console.log(`- ${f.name} (size: ${f.size})`));
    } catch (err) {
        console.error("Error:", err);
    }
    client.close();
}

listAssets();
