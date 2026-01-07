import * as ftp from 'basic-ftp'

async function copyCheck() {
    const client = new ftp.Client()
    try {
        await client.access({
            host: "ftp.yuda1395.odns.fr",
            user: "yuda1395",
            password: "1970Manolo145",
            secure: false
        })
        console.log("Uploading test_chatbot.html...")
        await client.uploadFrom("dist/index.html", "/public_html/test_chatbot.html")

    } catch(err) {
        console.log(err)
    }
    client.close()
}
copyCheck()
