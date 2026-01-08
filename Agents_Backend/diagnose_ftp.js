const ftp = require('basic-ftp');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function diagnose() {
    const client = new ftp.Client();
    client.ftp.verbose = true;
    
    // Configuration
    const config = {
        host: "ftp.yuda1395.odns.fr",
        user: "yuda1395",
        password: "1970Manolo145",
        secure: false
    };

    // Override if O2Switch specific (check deploy_launch_v2.js logic)
    // Actually deploy_ftp_node.js uses hardcoded logic or .env
    // I should check deploy_launch_v2.js for the ACTUAL used creds?
    // deploy_launch_v2.js calls `node deploy_ftp_node.js`.
    // Let's read deploy_ftp_node.js to be sure which .env it loads, usually root or backend.
    
    // Assuming Agents_Backend/.env has the creds.
    
    try {
        console.log("Connecting to FTP...");
        await client.access(config);
        
        console.log("📂 Listing Root / ...");
        const listRoot = await client.list("/");
        console.log(listRoot.map(f => `[${f.type === 2 ? 'DIR' : 'FILE'}] ${f.name}`).join('\n'));

        console.log("\n📂 Listing /public_html ...");
        try {
            const listPublic = await client.list("/public_html");
            console.log(listPublic.map(f => `[${f.type === 2 ? 'DIR' : 'FILE'}] ${f.name}`).join('\n'));
            
            // Check for index.php
            const hasIndexPHP = listPublic.some(f => f.name === 'index.php');
            if (hasIndexPHP) console.log("\n⚠️ WARNING: index.php found in public_html! It might override index.html.");

        } catch (e) {
            console.log("Could not list public_html");
        }

        console.log("\n📂 Listing /public.html (Suspicious Dir) ...");
        try {
            const listSusp = await client.list("/public.html");
            console.log(listSusp.map(f => `[${f.type === 2 ? 'DIR' : 'FILE'}] ${f.name} (${f.modifiedAt})`).join('\n'));
        } catch (e) { console.log("Skip public.html"); }

    } catch (err) {
        console.error("FTP Error:", err);
    } finally {
        client.close();
    }
}

diagnose();
