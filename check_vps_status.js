const { Client } = require('ssh2');

const config = {
    host: '37.59.124.82',
    port: 22,
    username: 'ubuntu',
    password: '1970-Manolo-145'
};

const conn = new Client();

conn.on('ready', () => {
    console.log('SSH :: Connected');
    // Vérifier si Docker et PG tournent
    conn.exec('sudo docker ps', (err, stream) => {
        if (err) throw err;
        stream.on('close', (code, signal) => {
            conn.end();
        }).on('data', (data) => {
            console.log('DOCKER PS OUTPUT:\n' + data);
        }).stderr.on('data', (data) => {
            console.log('STDERR: ' + data);
        });
    });
}).connect(config);
