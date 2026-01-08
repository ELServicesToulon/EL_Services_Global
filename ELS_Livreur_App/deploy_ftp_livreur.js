import * as ftp from 'basic-ftp'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function deploy() {
    const client = new ftp.Client()
    client.ftp.verbose = true

    // Configuration
    const config = {
        host: "ftp.yuda1395.odns.fr",
        user: "yuda1395",
        password: "1970Manolo145",
        secure: false // Try without implicit TLS first if issues, or true
    }

    try {
        console.log("Connecting to FTP...")
        await client.access(config)
        console.log("Connected!")

        const remoteRoot = "/public_html/livreur"
        const localDist = path.join(__dirname, "dist")

        console.log(`Ensuring remote folder exists: ${remoteRoot}...`)
        await client.ensureDir(remoteRoot)
        
        console.log(`Clearing remote folder: ${remoteRoot}...`)
        await client.clearWorkingDir() // This clears the current working directory, which is now /public_html/livreur

        console.log(`Uploading contents of ${localDist} to ${remoteRoot}...`)
        await client.uploadFromDir(localDist) // Upload to current working directory

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
                await client.ensureDir("/public_html/livreur")
                await client.clearWorkingDir()
                await client.uploadFromDir(path.join(__dirname, "dist"))
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
