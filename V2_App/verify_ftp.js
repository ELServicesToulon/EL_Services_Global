import * as ftp from 'basic-ftp'

async function checkFtp() {
    const client = new ftp.Client()
    client.ftp.verbose = true
    try {
        await client.access({
            host: "ftp.yuda1395.odns.fr",
            user: "yuda1395",
            password: "1970Manolo145",
            secure: false
        })
        console.log("Connected")
        console.log("Listing / ...")
        const listRoot = await client.list("/")
        listRoot.forEach(f => console.log(`- ${f.name} (${f.type})`))
        
        console.log("Listing /public_html ...")
        const listPub = await client.list("/public_html")
        listPub.forEach(f => console.log(`- ${f.name} (${f.type})`))

    } catch(err) {
        console.log(err)
    }
    client.close()
}
checkFtp()
