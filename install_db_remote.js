const { Client } = require('ssh2');
const fs = require('fs');

const config = {
    host: '37.59.124.82',
    port: 22,
    username: 'ubuntu',
    password: '1970-Manolo-145'
};

const conn = new Client();

conn.on('ready', () => {
    console.log('SSH :: Ready');

    // Upload du script d'installation
    conn.sftp((err, sftp) => {
        if (err) throw err;

        const localFile = 'setup_vps_ovh.sh';
        const remoteFile = '/home/ubuntu/setup_vps_ovh.sh';

        console.log(`Uploading ${localFile}...`);

        sftp.fastPut(localFile, remoteFile, (err) => {
            if (err) throw err;
            console.log('Upload successful.');

            // Exécution du script
            // On utilise 'bash' explicitement et on redirige la sortie
            // On force les droits +x avant
            const cmd = `chmod +x ${remoteFile} && ${remoteFile}`;

            console.log(`Executing remote script: ${cmd}`);

            conn.exec(cmd, (err, stream) => {
                if (err) throw err;
                stream.on('close', (code, signal) => {
                    console.log(`Script finished with code ${code}`);
                    conn.end();
                }).on('data', (data) => {
                    console.log('STDOUT: ' + data);
                }).stderr.on('data', (data) => {
                    console.log('STDERR: ' + data);
                });
            });
        });
    });
}).connect(config);
