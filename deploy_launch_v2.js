const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Helper for Node.js scripts
async function runNodeScript(scriptPath, cwd) {
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

// Helper for generic shell commands (Git, etc.)
async function runCommand(command, cwd) {
    return new Promise((resolve, reject) => {
        console.log(`\nExecuting: ${command}`);
        
        const child = spawn(command, {
            cwd: cwd,
            stdio: 'inherit',
            shell: true
        });

        child.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Command '${command}' failed with code ${code}`));
            }
        });

        child.on('error', (err) => {
            reject(err);
        });
    });
}

async function syncGithub() {
    console.log("\n=== Starting GitHub Sync ===");
    try {
        await runCommand("git add .", __dirname);
        
        // Commit might fail if nothing to commit, catch that specific error
        try {
            await runCommand('git commit -m "Auto-Deploy: V2 & Agents update"', __dirname);
        } catch (e) {
            console.log("ℹ️ Nothing to commit or commit failed (clean working directory).");
        }

        try {
            await runCommand("git push", __dirname);
            console.log("✅ GitHub Sync Complete!");
        } catch (e) {
             console.error("❌ Git Push Failed. Check credentials or upstream.");
             // Non-fatal, we don't want to fail the whole deployment just for this
        }

    } catch (err) {
        console.error("❌ GitHub Sync Error:", err.message);
    }
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
            script: "deploy_local.js",
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
                await runNodeScript(deploy.script, fullDir);
            } catch (error) {
                console.error(`Deployment of ${deploy.name} failed. Halting.`);
                process.exit(1);
            }
        } else {
            console.error(`Script not found: ${fullScriptPath}`);
            process.exit(1);
        }
    }

    console.log("\n=== All deployments completed successfully ===");

    await syncGithub();
}

main();
