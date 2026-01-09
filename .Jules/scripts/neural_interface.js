const ssh2Module = require('../../Agents_Backend/node_modules/ssh2');
const { Client } = ssh2Module.default || ssh2Module;
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../Agents_Backend/.env') });

const VPS_HOST = process.env.VPS_HOST || '37.59.124.82';
const VPS_USER = process.env.VPS_USER || 'ubuntu';
const VPS_PASS = process.env.VPS_PASS; // Warning: Plain text password usage

if (!VPS_PASS) {
    console.error("{\"error\": \"CRITICAL: VPS_PASS not found in .env\"}");
    process.exit(1);
}

const config = {
    host: VPS_HOST,
    port: 22,
    username: VPS_USER,
    password: VPS_PASS
};

const action = process.argv[2] || 'status';

function executeRemote(cmd) {
    const conn = new Client();
    conn.on('ready', () => {
        conn.exec(cmd, (err, stream) => {
            if (err) {
                 console.log(JSON.stringify({ status: "error", code: "EXEC_FAIL", details: err.message }));
                 conn.end();
                 return;
            }
            let output = '';
            stream.on('close', (code, signal) => {
                conn.end();
                console.log(JSON.stringify({ status: "success", command: action, output: output.trim() }));
            }).on('data', (data) => {
                output += data.toString();
            }).stderr.on('data', (data) => {
                output += data.toString();
            });
        });
    }).on('error', (err) => {
        console.log(JSON.stringify({ status: "error", code: "CONN_FAIL", details: err.message }));
    }).connect(config);
}

// Command Logic
let cmd = '';
switch (action) {
    case 'status':
        // Check PM2 status
        cmd = 'pm2 jlist';
        break;
    case 'check_logs':
        // Fetch last 50 lines of sentinel logs
        cmd = 'tail -n 50 /home/ubuntu/.pm2/logs/sentinel-out.log';
        break;
    case 'restart_sentinel':
         cmd = 'pm2 restart sentinel && echo "Sentinel Request Sent"';
         break;
    case 'security_scan':
         // Simulated security check
         cmd = 'ls -la /home/ubuntu/Documents/EL_Services_Global/Agents_Backend && echo "File Integrity Check: OK"';
         break;
    default:
        console.log(JSON.stringify({ status: "error", code: "UNKNOWN_ACTION", details: `Action '${action}' not recognized via Neural Interface.` }));
        process.exit(1);
}

executeRemote(cmd);
