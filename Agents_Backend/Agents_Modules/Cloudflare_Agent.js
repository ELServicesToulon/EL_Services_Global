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

    // --- Interface pour Sentinel ---
    async executeOrder(order) {
        if (order.action === 'purge_cache') {
            return await this.purgeCache(true);
        }
        return { success: false, error: 'Unknown action' };
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
