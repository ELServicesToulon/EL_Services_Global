const { Client } = require('ssh2');

const config = {
    host: '37.59.124.82',
    port: 22,
    username: 'ubuntu',
    password: '1970-Manolo-145'
};

const conn = new Client();

conn.on('ready', () => {
    console.log('SSH :: Ready');

    conn.sftp((err, sftp) => {
        if (err) throw err;

        const files = ['migrate_sheet_to_pg.js', 'credentials.json'];
        let uploaded = 0;

        files.forEach(file => {
            sftp.fastPut(file, `/home/ubuntu/${file}`, (err) => {
                if (err) console.error(`Error uploading ${file}:`, err);
                else {
                    console.log(`Uploaded ${file}`);
                    uploaded++;
                    if (uploaded === files.length) {
                        // Installer dépendances et lancer
                        const cmd = `
                            cd /home/ubuntu && 
                            npm install googleapis pg && 
                            node migrate_sheet_to_pg.js
                        `;
                        console.log('Executing migration...');
                        conn.exec(cmd, (err, stream) => {
                            if (err) throw err;
                            stream.on('close', (code, signal) => {
                                console.log('Migration finished with code ' + code);
                                conn.end();
                            }).on('data', (data) => console.log('STDOUT: ' + data))
                                .stderr.on('data', (data) => console.log('STDERR: ' + data));
                        });
                    }
                }
            });
        });
    });
}).connect(config);
