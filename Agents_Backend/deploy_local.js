/**
 * @file deploy_local.js
 * @description Script de déploiement LOCAL (car nous sommes déjà sur le VPS).
 * Copie les fichiers vers /home/ubuntu/sentinel et redémarre les services.
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const SOURCE_DIR = __dirname;
const TARGET_DIR = '/home/ubuntu/sentinel';

// Configuration exclusions
const EXCLUDES = [
    'node_modules', 
    '.git', 
    'deploy_vps.js', 
    'deploy_local.js',
    'test_vault.js',
    'dummy_unsafe.js' 
];

// Helper recursive copy
function copyRecursiveSync(src, dest) {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats.isDirectory();
    
    if (EXCLUDES.includes(path.basename(src))) return;
    if (src.endsWith('.log') || src.endsWith('.txt')) return; // Ignore logs

    if (isDirectory) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest);
        }
        fs.readdirSync(src).forEach(childItemName => {
            copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
        });
    } else {
        // File copy
        fs.copyFileSync(src, dest);
    }
}

async function runCommand(cmd, cwd) {
    return new Promise((resolve, reject) => {
        console.log(`Executing: ${cmd}`);
        exec(cmd, { cwd }, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error: ${error.message}`);
                console.error(`Stderr: ${stderr}`);
                // Don't reject on PM2 reload fail (service might not exist)
                if (cmd.includes('pm2 reload') || cmd.includes('pm2 restart')) resolve(stdout);
                else reject(error);
            } else {
                console.log(stdout);
                resolve(stdout);
            }
        });
    });
}

async function deploy() {
    console.log(`🚀 Starting LOCAL Deployment to ${TARGET_DIR}...`);

    // 0. Ensure target dir exists
    if (!fs.existsSync(TARGET_DIR)) {
        fs.mkdirSync(TARGET_DIR, { recursive: true });
    }

    // 1. Copy Files
    console.log('📦 Copying files...');
    copyRecursiveSync(SOURCE_DIR, TARGET_DIR);
    console.log('✅ UI Files copied.');

    // 2. Install Dependencies
    await runCommand('npm install', TARGET_DIR);

    // 3. Playwright (optional check if installed but safe to run)
    // await runCommand('npx playwright install --with-deps', TARGET_DIR); // Long, maybe skip if already done

    // 4. PM2 Restart
    console.log('🔄 Restarting Process...');
    // Try graceful reload, fallback to start
    try {
        await runCommand('pm2 reload sentinel', TARGET_DIR);
    } catch (e) {
        await runCommand('pm2 start Sentinel_Core.js --name sentinel', TARGET_DIR);
    }
    
    await runCommand('pm2 save', TARGET_DIR);

    console.log('✅ Deployment Success!');
}

deploy().catch(console.error);
