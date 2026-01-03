const ftp = require('basic-ftp');
const fs = require('fs');

const CONFIG = {
    host: "ftp.yuda1395.odns.fr",
    user: "antigravity@mediconvoi.fr",
    password: "1970-Manolo-145",
    secure: false
};

async function downloadIndex() {
    const client = new ftp.Client();
    try {
        await client.access(CONFIG);
        console.log("Downloading index.html from FTP root...");
        await client.downloadTo("downloaded_index.html", "/index.html");
        console.log("Download complete.");
    } catch (err) {
        console.error("Error:", err);
    }
    client.close();
}

downloadIndex();
