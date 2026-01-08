/**
 * @file Cloudflare_Agent.js
 * @description Agent dédié à la gestion de Cloudflare (Cache, DNS, Firewall).
 * Version 3.1 : Correction fonctions manquantes.
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
        this.apiKey = process.env.CLOUDFLARE_API_KEY;
        this.zoneId = process.env.CLOUDFLARE_ZONE_ID;
        this.domain = 'mediconvoi.fr';
        
        this.headers = { 'Content-Type': 'application/json' };
        if (this.token) this.headers['Authorization'] = `Bearer ${this.token}`;
        else if (this.email && this.apiKey) {
            this.headers['X-Auth-Email'] = this.email;
            this.headers['X-Auth-Key'] = this.apiKey;
        }

        this.WHITELIST = ['127.0.0.1', '::1', process.env.VPS_IP || '0.0.0.0', '66.249.66.1'];
        this.watchers = [];
        this.debounceTimer = null;
    }

    async init() {
        console.log(`[${this.name}] 🚀 Initialisation...`);
        if (!this.token && (!this.email || !this.apiKey)) {
            console.error(`[${this.name}] ❌ Identifiants manquants.`);
            return false;
        }
        if (!this.zoneId) {
            this.zoneId = await this.getZoneId();
        }
        return true;
    }

    async getZoneId() {
        try {
            const resp = await axios.get(`https://api.cloudflare.com/client/v4/zones?name=${this.domain}`, { headers: this.headers });
            return resp.data.result?.[0]?.id || null;
        } catch (error) { console.error(error.message); return null; }
    }

    async purgeCache(everything = true) {
        if (!this.zoneId) await this.init();
        if (!this.zoneId) return { success: false, error: "No Zone ID" };
        console.log(`[${this.name}] 🧹 Purge du cache demandée...`);
        try {
            const body = everything ? { purge_everything: true } : {};
            const resp = await axios.post(`https://api.cloudflare.com/client/v4/zones/${this.zoneId}/purge_cache`, body, { headers: this.headers });
            if (resp.data.success) {
                console.log(`[${this.name}] ✅ Cache purgé !`);
                return { success: true };
            }
        } catch (error) { console.error(`[${this.name}] ❌ Erreur Purge: ${error.message}`); }
        return { success: false };
    }

    enableAutoPilot(dirToWatch) {
        console.log(`[${this.name}] 👁️ Activation du mode Auto-Pilote sur : ${dirToWatch}`);
        if (!fs.existsSync(dirToWatch)) {
            console.warn(`[${this.name}] ⚠️ Dossier introuvable: ${dirToWatch}.`);
            return;
        }
        const watcher = fs.watch(dirToWatch, { recursive: true }, (eventType, filename) => {
            if (filename && !filename.endsWith('.tmp')) {
                this.scheduleAutoPurge(`Modification détectée: ${filename}`);
            }
        });
        this.watchers.push(watcher);
    }

    scheduleAutoPurge(reason) {
        if (this.debounceTimer) clearTimeout(this.debounceTimer);
        console.log(`[${this.name}] ⏳ Changement détecté (${reason}). Purge planifiée dans 30s...`);
        this.debounceTimer = setTimeout(() => {
            console.log(`[${this.name}] 🤖 Exécution Purge Auto-Pilote.`);
            this.purgeCache(true);
            this.debounceTimer = null;
        }, 30000);
    }

    async banIP(ip, reason = 'Banned by Sentinel Active Defense') {
        if (!this.zoneId) await this.init();
        if (this.WHITELIST.includes(ip)) { console.warn(`[${this.name}] ⚠️ IP WHITELISTÉE (${ip}) - IGNORÉE.`); return { success: false }; }
        console.log(`[${this.name}] ⛔ BAN IP demandé pour ${ip}...`);
        try {
            const body = { mode: 'block', configuration: { target: 'ip', value: ip }, notes: reason };
            const resp = await axios.post(`https://api.cloudflare.com/client/v4/zones/${this.zoneId}/firewall/access_rules/rules`, body, { headers: this.headers });
            if (resp.data.success) return { success: true, result: resp.data.result };
        } catch (error) { console.error(`banIP: ${error.message}`); }
        return { success: false };
    }

    async whitelistIP(ip, reason = 'Whitelisted by Sentinel Active Defense') {
        if (!this.zoneId) await this.init();
        console.log(`[${this.name}] ✅ WHITELIST IP demandé pour ${ip}...`);
        try {
            const body = { mode: 'whitelist', configuration: { target: 'ip', value: ip }, notes: reason };
            const resp = await axios.post(`https://api.cloudflare.com/client/v4/zones/${this.zoneId}/firewall/access_rules/rules`, body, { headers: this.headers });
            if (resp.data.success) return { success: true, result: resp.data.result };
        } catch (error) { console.error(`whitelistIP: ${error.message}`); }
        return { success: false };
    }

    async setSecurityLevel(level) {
        if (!this.zoneId) await this.init();
        console.log(`[${this.name}] 🛡️ Changement niveau sécurité -> ${level}...`);
        try {
            const resp = await axios.patch(`https://api.cloudflare.com/client/v4/zones/${this.zoneId}/settings/security_level`, { value: level }, { headers: this.headers });
            if (resp.data.success) return { success: true };
        } catch (error) { console.error(`setSecurityLevel: ${error.message}`); }
        return { success: false };
    }
}

const agent = new CloudflareAgent();
if (require.main === module) { (async () => { await agent.init(); })(); }
module.exports = agent;
