/**
 * @file Honeypot_Agent.js
 * @description Agent "Honeyport" qui écoute sur un port spécifique (3333).
 * TOUTE connexion à ce port est considérée comme hostile (Scanner/Bot) 
 * et déclenche un bannissement immédiat via Cloudflare + Alerte.
 */

const http = require('http');
const CloudflareAgent = require('./Cloudflare_Agent');

// Port piège. Doit être ouvert dans le Firewall VPS si on veut attraper les scanners externes.
const TRAP_PORT = 3333; 

class HoneypotAgent {
    constructor() {
        this.name = 'Honeypot_Agent';
        this.server = null;
    }

    async init() {
        console.log(`[${this.name}] 🍯 Initialisation du piège sur le port ${TRAP_PORT}...`);
        
        this.server = http.createServer(async (req, res) => {
            let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
            
            // Nettoyage IPv6 map
            if (ip && ip.includes('::ffff:')) {
                ip = ip.replace('::ffff:', '');
            }

            console.warn(`[${this.name}] 🚨 ALERTE : Connexion détectée depuis ${ip} !`);
            
            // Bannissement Immédiat
            const banResult = await CloudflareAgent.banIP(ip, `HONEYPOT TRAP Triggered on port ${TRAP_PORT}`);
            
            if (banResult.success) {
                console.log(`[${this.name}] 🔨 IP ${ip} BANNIE.`);
            }

            // Réponse leurre (fake error ou hang)
            res.writeHead(403, { 'Content-Type': 'text/plain' });
            res.end('Access Denied');
        });

        this.server.listen(TRAP_PORT, () => {
            console.log(`[${this.name}] ✅ Honeyport ACTIF sur le port ${TRAP_PORT}. En attente de proies...`);
        });

        this.server.on('error', (e) => {
            console.error(`[${this.name}] ❌ Erreur Port ${TRAP_PORT}: ${e.message}`);
        });
    }
}

// Instance
const agent = new HoneypotAgent();
module.exports = agent;

// Exécution directe
if (require.main === module) {
    agent.init();
}
