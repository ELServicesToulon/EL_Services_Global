/**
 * @file Cloudflare_Agent.js
 * @description Agent dédié à la gestion de Cloudflare (Cache, DNS, Firewall).
 * Il est autonome et peut être appelé par d'autres agents via Sentinel.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

class CloudflareAgent {
    constructor() {
        this.name = 'Cloudflare_Agent';
        this.token = process.env.CLOUDFLARE_API_TOKEN;
        this.email = process.env.CLOUDFLARE_EMAIL;
        this.apiKey = process.env.CLOUDFLARE_API_KEY; // Global key support
        this.zoneId = process.env.CLOUDFLARE_ZONE_ID;
        this.domain = 'mediconvoi.fr';
        
        this.headers = {
            'Content-Type': 'application/json'
        };

        if (this.token) {
            this.headers['Authorization'] = `Bearer ${this.token}`;
        } else if (this.email && this.apiKey) {
            this.headers['X-Auth-Email'] = this.email;
            this.headers['X-Auth-Key'] = this.apiKey;
        }

        // IPs jamais bannies (Sécurité)
        this.WHITELIST = [
            '127.0.0.1',
            '::1',
            process.env.VPS_IP || '0.0.0.0', // IP du VPS lui-même
            '66.249.66.1', // Exemple GoogleBot (à affiner si besoin)
        ];
    }

    /**
     * Initialise l'agent et vérifie/récupère la Zone ID.
     */
    async init() {
        console.log(`[${this.name}] 🚀 Initialisation...`);
        if (!this.token && (!this.email || !this.apiKey)) {
            console.error(`[${this.name}] ❌ Identifiants manquants (Token ou Email/Key).`);
            return false;
        }

        if (!this.zoneId) {
            console.log(`[${this.name}] 🔍 Recherche de la Zone ID pour ${this.domain}...`);
            this.zoneId = await this.getZoneId();
            if (this.zoneId) {
                console.log(`[${this.name}] ✅ Zone ID auto-détectée: ${this.zoneId}`);
            } else {
                console.error(`[${this.name}] ❌ Impossible de trouver la Zone ID.`);
                return false;
            }
        }
        return true;
    }

    async getZoneId() {
        try {
            const resp = await axios.get(`https://api.cloudflare.com/client/v4/zones?name=${this.domain}`, { headers: this.headers });
            if (resp.data.success && resp.data.result.length > 0) {
                return resp.data.result[0].id;
            }
        } catch (error) {
            this.logError('getZoneId', error);
        }
        return null;
    }

    async purgeCache(everything = true) {
        if (!this.zoneId) { 
            await this.init(); // Retry init if missing
            if (!this.zoneId) throw new Error("Zone ID inconnue");
        }

        console.log(`[${this.name}] 🧹 Purge du cache en cours...`);
        try {
            const body = everything ? { purge_everything: true } : {}; // Add specific files support later
            const resp = await axios.post(
                `https://api.cloudflare.com/client/v4/zones/${this.zoneId}/purge_cache`,
                body,
                { headers: this.headers }
            );

            if (resp.data.success) {
                console.log(`[${this.name}] ✅ Cache purgé avec succès !`);
                return { success: true, result: resp.data.result };
            } else {
                console.error(`[${this.name}] ⚠️ Échec purge CF:`, JSON.stringify(resp.data.errors));
                return { success: false, errors: resp.data.errors };
            }
        } catch (error) {
            this.logError('purgeCache', error);
            return { success: false, error: error.message };
        }
    }

    logError(context, error) {
        let msg = error.message;
        if (error.response) {
            msg = `Status: ${error.response.status} - ${JSON.stringify(error.response.data)}`;
        }
        console.error(`[${this.name}] ❌ Erreur (${context}): ${msg}`);
    }

    /**
     * Bannit une IP via le Pare-feu Cloudflare (IP Access Rules).
     * @param {string} ip - L'adresse IP à bannir.
     * @param {string} reason - La raison du ban (pour les logs/commentaires).
     */
    async banIP(ip, reason = 'Banned by Sentinel Active Defense') {
        if (!this.zoneId) await this.init();
        if (!this.zoneId) return { success: false, error: "Zone ID inconnue" };
        
        // CHECK WHITELIST
        if (this.WHITELIST.includes(ip)) {
            console.warn(`[${this.name}] ⚠️ TENTATIVE DE BAN SUR IP WHITELISTÉE (${ip}) - IGNORÉE.`);
            return { success: false, error: 'IP Whitelisted' };
        }

        console.log(`[${this.name}] ⛔ BAN IP demandé pour ${ip} (${reason})...`);

        try {
            const body = {
                mode: 'block',
                configuration: {
                    target: 'ip',
                    value: ip
                },
                notes: reason
            };

            const resp = await axios.post(
                `https://api.cloudflare.com/client/v4/zones/${this.zoneId}/firewall/access_rules/rules`,
                body,
                { headers: this.headers }
            );

            if (resp.data.success) {
                console.log(`[${this.name}] 🛡️ IP ${ip} BANNIE avec succès.`);
                return { success: true, result: resp.data.result };
            } else {
                console.error(`[${this.name}] ❌ Echec Ban IP:`, JSON.stringify(resp.data.errors));
                return { success: false, errors: resp.data.errors };
            }
        } catch (error) {
            this.logError('banIP', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Change le niveau de sécurité du site (ex: 'under_attack').
     * @param {string} level - 'off', 'essentially_off', 'low', 'medium', 'high', 'under_attack'
     */
    async setSecurityLevel(level) {
        if (!this.zoneId) await this.init();
        if (!this.zoneId) return { success: false, error: "Zone ID inconnue" };
        
        const validLevels = ['off', 'essentially_off', 'low', 'medium', 'high', 'under_attack'];
        if (!validLevels.includes(level)) {
            return { success: false, error: `Niveau invalide. Attendus: ${validLevels.join(', ')}` };
        }

        console.log(`[${this.name}] 🛡️ Changement niveau sécurité -> ${level}...`);

        try {
            const resp = await axios.patch(
                `https://api.cloudflare.com/client/v4/zones/${this.zoneId}/settings/security_level`,
                { value: level },
                { headers: this.headers }
            );

            if (resp.data.success) {
                console.log(`[${this.name}] ✅ Niveau de sécurité réglé sur : ${level}`);
                return { success: true, result: resp.data.result };
            } else {
                console.error(`[${this.name}] ❌ Echec Security Level:`, JSON.stringify(resp.data.errors));
                return { success: false, errors: resp.data.errors };
            }
        } catch (error) {
            this.logError('setSecurityLevel', error);
            return { success: false, error: error.message };
        }
    }

    // --- Interface pour Sentinel ---
    async executeOrder(order) {
        try {
            switch (order.action) {
                case 'purge_cache':
                    return await this.purgeCache(true);
                case 'ban_ip':
                    return await this.banIP(order.ip, order.reason);
                case 'set_security':
                    return await this.setSecurityLevel(order.level);
                default:
                    return { success: false, error: `Unknown action: ${order.action}` };
            }
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
}

// Instance pour usage direct ou via require
const agent = new CloudflareAgent();

// Si le script est lancé directement: node Cloudflare_Agent.js
if (require.main === module) {
    (async () => {
        await agent.init();
        await agent.purgeCache();
    })();
}

module.exports = agent;
