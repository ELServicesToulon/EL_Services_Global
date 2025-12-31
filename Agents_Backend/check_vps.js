const { Client } = require('ssh2');

const config = {
    host: '87.106.1.4',
    port: 22,
    username: 'root',
    password: 'kTU7RJS5'
};

const conn = new Client();

conn.on('ready', () => {
    console.log('SSH :: Ready');
    // Check PM2 status
    conn.exec('pm2 status', (err, stream) => {
        if (err) throw err;
        stream.on('close', (code, signal) => {
            console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
            conn.end();
        }).on('data', (data) => {
            console.log('STDOUT: ' + data);
        }).stderr.on('data', (data) => {
            console.log('STDERR: ' + data);
        });
    });
}).connect(config);
