const { Client } = require('ssh2');

const config = {
    host: '87.106.1.4',
    port: 22,
    username: 'root',
    password: 'kTU7RJS5'
};

const conn = new Client();
const REMOTE_DIR = '/root/sentinel';

conn.on('ready', () => {
    console.log('SSH :: Ready');

    // We assume files are there (from previous upload), but let's re-run install/start
    const commands = [
        `export PATH=$PATH:/usr/bin:/usr/local/bin`, // Ensure path
        `cd ${REMOTE_DIR} && npm install`,
        `cd ${REMOTE_DIR} && npx playwright install --with-deps`,
        `cd ${REMOTE_DIR} && pm2 start Sentinel_Core.js --name sentinel`,
        `cd ${REMOTE_DIR} && pm2 save`,
        `cd ${REMOTE_DIR} && pm2 startup`
    ];

    let chain = Promise.resolve();

    commands.forEach(cmd => {
        chain = chain.then(() => new Promise((resolve, reject) => {
            console.log(`Executing: ${cmd}`);
            conn.exec(cmd, (err, stream) => {
                if (err) return reject(err);
                stream.on('close', (code, signal) => {
                    console.log(`Command '${cmd}' finished with code ${code}`);
                    // Playwright install often has non-zero exit codes for warnings, proceed anyway
                    resolve();
                }).on('data', (data) => {
                    if (cmd.includes('install')) process.stdout.write('.');
                    else console.log('STDOUT: ' + data);
                }).stderr.on('data', (data) => {
                    // console.log('STDERR: ' + data); // Reduce noise
                });
            });
        }));
    });

    chain.then(() => {
        console.log('Setup Finished!');
        conn.end();
    }).catch(err => {
        console.error('Setup Failed:', err);
        conn.end();
    });

}).connect(config);
