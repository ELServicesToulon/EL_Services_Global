/**
 * @file Agent_Connector.js
 * @description Gère la connexion SSH reutilisable vers les Workers Distants via ssh2.
 */

const { Client } = require('ssh2');

class AgentConnector {
    constructor() {
        this.config = null;
    }

    /**
     * Configure la connexion.
     * @param {string} host IP du worker
     * @param {string} username User (ex: root)
     * @param {string} password Password (ou privateKey path à venir)
     */
    configure(host, username, password) {
        this.config = {
            host: host,
            port: 22,
            username: username,
            password: password,
            // readyTimeout: 20000,
            // keepaliveInterval: 5000
        };
    }

    /**
     * Exécute une commande sur le worker distant.
     * @param {string} command Commande terminal à lancer
     * @returns {Promise<string>} Sortie standard (stdout) ou erreur
     */
    async executeCommand(command) {
        if (!this.config) {
            throw new Error("AgentConnector: Configuration manquante (appeler configure() avant).");
        }

        return new Promise((resolve, reject) => {
            const conn = new Client();

            conn.on('ready', () => {
                console.log(`[SSH] Connected to ${this.config.host}. Executing: ${command.substring(0, 50)}...`);

                conn.exec(command, (err, stream) => {
                    if (err) {
                        conn.end();
                        return reject(err);
                    }

                    let stdout = '';
                    let stderr = '';

                    stream.on('close', (code, signal) => {
                        conn.end();
                        if (code !== 0) {
                            reject(new Error(`Exit Code ${code}. Error: ${stderr}`));
                        } else {
                            resolve(stdout.trim());
                        }
                    }).on('data', (data) => {
                        stdout += data.toString();
                    }).stderr.on('data', (data) => {
                        stderr += data.toString();
                    });
                });
            }).on('error', (err) => {
                reject(new Error(`SSH Connection Failed: ${err.message}`));
            }).connect(this.config);
        });
    }
}

module.exports = new AgentConnector();
