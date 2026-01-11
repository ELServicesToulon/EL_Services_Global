import * as ftp from 'basic-ftp'

async function checkFtp() {
    const client = new ftp.Client()
    try {
        await client.access({
            host: "ftp.yuda1395.odns.fr",
            user: "yuda1395",
            password: "1970Manolo145",
            secure: false
        })
        console.log("Listing /yuda1395.odns.fr ...")
        const list = await client.list("/yuda1395.odns.fr")
        list.forEach(f => console.log(`- ${f.name} (${f.type})`))

    } catch(err) {
        console.log(err)
    }
    client.close()
}
checkFtp()
