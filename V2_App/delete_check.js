import * as ftp from 'basic-ftp'

async function deleteCheck() {
    const client = new ftp.Client()
    try {
        await client.access({
            host: "ftp.yuda1395.odns.fr",
            user: "yuda1395",
            password: "1970Manolo145",
            secure: false
        })
        console.log("Deleting chatbot_logo.png ...")
        await client.remove("/public_html/chatbot_logo.png")

    } catch(err) {
        console.log(err)
    }
    client.close()
}
deleteCheck()
