import * as ftp from 'basic-ftp'
import fs from 'fs'

async function downloadCheck() {
    const client = new ftp.Client()
    try {
        await client.access({
            host: "ftp.yuda1395.odns.fr",
            user: "yuda1395",
            password: "1970Manolo145",
            secure: false
        })
        console.log("Downloading index.html...")
        await client.downloadTo("check_remote_index.html", "/public_html/index.html")
        
        console.log("Downloading .htaccess...")
        await client.downloadTo("check_remote_htaccess", "/public_html/.htaccess")

    } catch(err) {
        console.log(err)
    }
    client.close()
}
downloadCheck()
