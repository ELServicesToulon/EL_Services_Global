/**
 * @file Network_Overseer.js
 * @description Agent responsable de la surveillance réseau et santé des applications.
 * Version 2.0 : Hérite de Agent_Base pour analyse intelligente des pannes.
 */

const axios = require('axios');
const Vault = require('./Vault');
const Agent_Base = require('./Agent_Base');

const MONITORING_TARGETS = [
    { name: 'App Livreur', type: 'gas', id: Vault.get('GAS_LIVREUR_ID') },
    { name: 'Mediconvoi Vitrine', type: 'web', url: 'https://mediconvoi.fr' },
    { name: 'Mediconvoi Core (API)', type: 'web', url: 'http://127.0.0.1:8000' },
    { name: 'Mediconvoi Core (Studio)', type: 'web', url: 'http://127.0.0.1:3000' }
];

class NetworkOverseer extends Agent_Base {
    constructor() {
        super('NETWORK_OVERSEER');
        this.version = '2.0.0';
    }

    async analyzeFailure(target, error) {
        const prompt = `
            Tu es l'expert réseau du système.
            Le service "${target.name}" (${target.url}) ne répond pas.
            Erreur : ${error.message}
            Status code (si dispo) : ${error.response ? error.response.status : 'N/A'}
            
            Analyse la cause probable (ex: Serveur down, DNS, Timeout, Erreur App) et suggère une commande de vérification (ex: curl, ping, systemctl status).
            Réponds courtement.
        `;
        return await this.askGemini(prompt) || "Analyse indisponible.";
    }

    async runHealthCheck() {
        // this.log('Ping des services...');
        let report = [];

        for (const target of MONITORING_TARGETS) {
            let url;
            if (target.type === 'gas') {
                url = `https://script.google.com/macros/s/${target.id}/exec`;
            } else {
                url = target.url;
            }

            // Fallback si ID manquant
            if (url.includes('undefined')) continue;

            try {
                const start = Date.now();
                const res = await axios.get(url, { 
                    validateStatus: false, 
                    timeout: 20000, 
                    maxRedirects: 5,
                    headers: { 'User-Agent': 'Mediconvoi-Sentinel/2.0' }
                });
                const duration = Date.now() - start;

                if (res.status >= 400) {
                    // 403 GAS / 401 Local = OK (reachable but restricted)
                    if ((res.status === 403 && target.type === 'gas') || (res.status === 401 && target.name.includes('Core'))) {
                        // Service en ligne
                    } else {
                        const errorMsg = `⚠️ ${target.name} : ERREUR ${res.status} (${duration}ms)`;
                        report.push(errorMsg);
                    }
                } else {
                    if (target.type === 'web' && url.startsWith('http:') && !url.includes('127.0.0.1') && !url.includes('localhost')) {
                        report.push(`🔓 ${target.name} : AVERTISSEMENT SÉCURITÉ (HTTP non sécurisé)`);
                    }
                }
            } catch (error) {
                const failureAnalysis = await this.analyzeFailure(target, error);
                report.push(`🔥 ${target.name} : DOWN (Timeout/Error: ${error.message}) -> IA: ${failureAnalysis}`);
            }
        }

        return report.length > 0 ? report.join('\n') : null;
    }
}

// Export instance
module.exports = new NetworkOverseer();
