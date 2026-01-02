const { Client } = require('ssh2');

const config = {
    host: '37.59.124.82',
    port: 22,
    username: 'ubuntu',
    password: 'CHANGE_ME'
};

const conn = new Client();

conn.on('ready', () => {
    console.log('SSH :: Ready');
    // Read pm2 logs (last 15 lines)
    conn.exec('pm2 logs sentinel --lines 15 --nostream', (err, stream) => {
        if (err) throw err;
        stream.on('close', (code, signal) => {
            conn.end();
        }).on('data', (data) => {
            console.log(data.toString());
        }).stderr.on('data', (data) => {
            console.log(data.toString());
        });
    });
}).connect(config);
