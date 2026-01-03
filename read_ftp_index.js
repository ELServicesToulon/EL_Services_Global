const ftp = require('basic-ftp');
const fs = require('fs');

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
        console.log("Downloading index.html to check content...");
        await client.downloadTo("check_index.html", "index.html");

        const content = fs.readFileSync("check_index.html", "utf8");
        console.log("--- START CONTENT ---");
        console.log(content.substring(0, 500)); // First 500 chars
        console.log("--- END CONTENT ---");

        fs.unlinkSync("check_index.html");

    } catch (e) {
        console.error("Error:", e);
    }
    client.close();
}

run();
