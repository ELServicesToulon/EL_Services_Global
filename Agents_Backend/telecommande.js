const { Client } = require('ssh2');

const config = {
    host: '87.106.1.4',
    port: 22,
    username: 'root',
    password: 'kTU7RJS5'
};

const action = process.argv[2] || 'status'; // Default to status

const conn = new Client();

console.log(`🤖 TELECOMMANDE SENTINEL (Action: ${action.toUpperCase()})`);

conn.on('ready', () => {
    let cmd = '';

    switch (action) {
        case 'logs':
            cmd = 'pm2 logs sentinel --lines 20 --nostream';
            break;
        case 'restart':
            cmd = 'pm2 restart sentinel';
            break;
        case 'stop':
            cmd = 'pm2 stop sentinel';
            break;
        case 'update':
            // Logic handled by deploy_vps.js, this is just a quick restart alias essentially
            console.log('Pour mettre à jour le code, utilisez plutôt deploy_vps.js');
            conn.end();
            return;
        case 'status':
        default:
            cmd = 'pm2 status';
            break;
    }

    console.log(`📡 Envoi de la commande au serveur...`);

    conn.exec(cmd, (err, stream) => {
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
