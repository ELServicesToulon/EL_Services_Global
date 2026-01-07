const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

async function runScript(scriptPath, cwd) {
    return new Promise((resolve, reject) => {
        console.log(`\nStarting deployment: ${scriptPath}`);
        console.log(`Working Directory: ${cwd}`);
        
        const child = spawn('node', [scriptPath], {
            cwd: cwd,
            stdio: 'inherit',
            shell: true
        });

        child.on('close', (code) => {
            if (code === 0) {
                console.log(`\nSuccessfully finished: ${scriptPath}`);
                resolve();
            } else {
                console.error(`\nFailed: ${scriptPath} with code ${code}`);
                reject(new Error(`Script exited with code ${code}`));
            }
        });

        child.on('error', (err) => {
            console.error(`\nError starting script: ${scriptPath}`, err);
            reject(err);
        });
    });
}

async function main() {
    console.log("=== V2 & Agents Unified Deployment ===");
    console.log("Skipping Legacy Apps Script Projects...");

    const deployments = [
        {
            name: "V2 Application",
            script: "deploy_ftp_node.js",
            dir: "V2_App"
        },
        {
            name: "Agents Backend (VPS)",
            script: "deploy_vps.js",
            dir: "Agents_Backend"
        }
    ];

    // Check for Vitrine but don't deploy
    if (fs.existsSync(path.join(__dirname, 'Mediconvoi_Vitrine'))) {
        console.log("NOTE: 'Mediconvoi_Vitrine' detected but skipped to prevent conflict with V2 App at root.");
    }

    for (const deploy of deployments) {
        const fullScriptPath = path.join(__dirname, deploy.dir, deploy.script);
        const fullDir = path.join(__dirname, deploy.dir);

        if (fs.existsSync(fullScriptPath)) {
            try {
                await runScript(deploy.script, fullDir);
            } catch (error) {
                console.error(`Deployment of ${deploy.name} failed. Halting.`);
                process.exit(1);
            }
        } else {
            console.error(`Script not found: ${fullScriptPath}`);
            // Don't fail, just warn? Or fail.
            // Fail is safer.
            process.exit(1);
        }
    }

    console.log("\n=== All deployments completed successfully ===");
}

main();
