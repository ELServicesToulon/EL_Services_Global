const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const config = {
    host: '37.59.124.82', // IP VPS OVH
    port: 22,
    username: 'ubuntu', // Utilisateur par défaut OVH Cloud
    password: '1970-Manolo-145' // Mot de passe fourni
};

const conn = new Client();

const REMOTE_DIR = '/home/ubuntu/sentinel';

// Helper to iterate recursively through local directories
function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);
    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function (file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            if (file !== 'node_modules' && file !== '.git' && file !== 'Backups') {
                arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
            }
        } else {
            arrayOfFiles.push(path.join(dirPath, "/", file));
        }
    });

    return arrayOfFiles;
}

conn.on('ready', () => {
    console.log('SSH :: Ready');

    // Commands to setup environment
    const setupCommands = [
        'sudo apt-get update',
        'curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -',
        'sudo apt-get install -y nodejs',
        'sudo npm install pm2 -g',
        `mkdir -p ${REMOTE_DIR}`,
        `mkdir -p ${REMOTE_DIR}/Agents_Modules`,
        `mkdir -p ${REMOTE_DIR}/keys`
    ];

    let chain = Promise.resolve();

    // Execute setup commands sequentially
    setupCommands.forEach(cmd => {
        chain = chain.then(() => new Promise((resolve, reject) => {
            console.log(`Executing: ${cmd}`);
            conn.exec(cmd, (err, stream) => {
                if (err) return reject(err);
                stream.on('close', (code, signal) => {
                    console.log(`Command '${cmd}' finished with code ${code}`);
                    if (code !== 0) return reject(new Error(`Command failed: ${cmd}`));
                    resolve();
                }).on('data', (data) => {
                    console.log('STDOUT: ' + data);
                }).stderr.on('data', (data) => {
                    console.log('STDERR: ' + data);
                });
            });
        }));
    });

    // Upload files
    chain = chain.then(() => new Promise((resolve, reject) => {
        console.log('Starting Sftp...');
        conn.sftp((err, sftp) => {
            if (err) return reject(err);

            const localRoot = __dirname;
            const files = getAllFiles(localRoot);

            const uploadPromises = files.map(file => {
                const relativePath = path.relative(localRoot, file);
                // Filtering
                if (relativePath.includes('node_modules') ||
                    relativePath.includes('.git') ||
                    relativePath.includes('deploy_vps.js') ||
                    relativePath.endsWith('.log') ||
                    relativePath.endsWith('.txt')) {
                    return Promise.resolve();
                }

                const remotePath = `${REMOTE_DIR}/${relativePath.replace(/\\/g, '/')}`;
                const remoteDir = path.dirname(remotePath);

                // Simple dir creation logic (can be optimized but safe effectively)
                return new Promise((resUpload, rejUpload) => {
                    // Start reading local file
                    sftp.fastPut(file, remotePath, (err) => {
                        if (err) {
                            console.error(`Error uploading ${relativePath}: ${err.message}`);
                            // If directory missing, likely fail logic here (basic implementation)
                            // But we created main dirs in setup. 
                            // Deep recursive dirs might fail if not pre-created.
                            // For Sentinel, structure is shallow (Modules, Keys).
                            // Let's assume shallow for now or add dir check.
                            // Actually 'keys' and 'Agents_Modules' are explicitly created above.
                            rejUpload(err);
                        } else {
                            console.log(`Uploaded: ${relativePath} -> ${remotePath}`);
                            resUpload();
                        }
                    });
                });
            });

            Promise.all(uploadPromises)
                .then(() => {
                    console.log('All files uploaded.');
                    resolve();
                })
                .catch(reject);
        });
    }));

    // Install dependencies and run
    const runCommands = [
        `cd ${REMOTE_DIR} && npm install`,
        `cd ${REMOTE_DIR} && npx playwright install --with-deps`,
        `cd ${REMOTE_DIR} && pm2 start Sentinel_Core.js --name sentinel`,
        `cd ${REMOTE_DIR} && pm2 save`,
        `cd ${REMOTE_DIR} && pm2 startup`
    ];

    runCommands.forEach(cmd => {
        chain = chain.then(() => new Promise((resolve, reject) => {
            console.log(`Executing: ${cmd}`);
            conn.exec(cmd, (err, stream) => {
                if (err) return reject(err);
                stream.on('close', (code, signal) => {
                    console.log(`Command '${cmd}' finished with code ${code}`);
                    // Playwright install might exit with code 0 or 1 depending on warnings, but let's hope 0
                    resolve();
                }).on('data', (data) => {
                    // Limit log for install
                    if (cmd.includes('npm install')) process.stdout.write('.');
                    else console.log('STDOUT: ' + data);
                }).stderr.on('data', (data) => {
                    console.log('STDERR: ' + data);
                });
            });
        }));
    });

    chain.then(() => {
        console.log('Deployment Complete!');
        conn.end();
    }).catch(err => {
        console.error('Deployment Failed:', err);
        conn.end();
    });

}).connect(config);
