import * as ftp from 'basic-ftp'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function deploy() {
    const client = new ftp.Client()
    client.ftp.verbose = true

    // Configuration
    const config = {
        host: "trychat.o2switch.net", // Fallback if truchat is wrong, but user said truchat
        user: "yuda1395",
        password: "ha45-3GNJ-4JN!",
        secure: false // Try without implicit TLS first if issues, or true
    }

    // User specified "truchat.o2switch.net"
    config.host = "truchat.o2switch.net"

    try {
        console.log("Connecting to FTP...")
        await client.access(config)
        console.log("Connected!")

        const remoteRoot = "/public_html"
        const localDist = path.join(__dirname, "dist")

        console.log(`Clearing remote folder: ${remoteRoot}...`)
        await client.ensureDir(remoteRoot)
        await client.clearWorkingDir() // Be careful! This wipes public_html.

        console.log(`Uploading contents of ${localDist} to ${remoteRoot}...`)
        await client.uploadFromDir(localDist, remoteRoot)

        console.log("Deployment successful!")
    }
    catch (err) {
        console.error("FTP Error:", err)
        // Retry with insecure if SSL failed
        if (err.code === 'ECONNREFUSED' || err.toString().includes('TLS')) {
            console.log("Retrying with secure: false options...")
            config.secure = false
            try {
                await client.access(config)
                await client.uploadFromDir(path.join(__dirname, "dist"), "/public_html")
                console.log("Deployment successful (Insecure Mode)!")
            } catch (retryErr) {
                console.error("Retry failed:", retryErr)
            }
        }
    }
    finally {
        client.close()
    }
}

deploy()
