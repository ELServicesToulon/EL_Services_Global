/**
 * @file Chat_Agent.js
 * @description Agent conversationnel (Chatbot) intégré à Sentinel.
 * Interagit avec les utilisateurs via Supabase et utilise Gemini pour l'intelligence.
 * Peut piloter Ghost Shopper pour des audits à la demande.
 * 
 * Version 2.0 : Hérite de Agent_Base (Auto-Evolution Ready)
 */

const Agent_Base = require('./Agent_Base');
const { createClient } = require('@supabase/supabase-js');
const GhostShopper = require('./Ghost_Shopper');
const CloudflareAgent = require('./Cloudflare_Agent');
const SecretaryAgent = require('./Secretary_Agent');
const ChiefAdvisorAgent = require('./Chief_Advisor_Agent');
require('dotenv').config();

// Configuration Supabase
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('[CHAT_AGENT] ❌ ERREUR CRITIQUE: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquante dans .env');
}


const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false }
});

class Chat_Agent extends Agent_Base {
    constructor() {
        super('CHAT_AGENT');
        this.subscription = null;
    }

    /**
     * Démarrage de l'agent
     */
    async init() {
        this.log('💬 Initialisation...');
        this.subscribeToMessages();
    }

    /**
     * Écoute des nouveaux messages utilisateur dans Supabase
     */
    subscribeToMessages() {
        this.subscription = supabase
            .channel('chat_messages')
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'chat_messages', 
                filter: 'sender=eq.user' 
            }, payload => {
                this.handleMessage(payload.new);
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    this.log('🟢 Connecté et en écoute.');
                }
            });
    }

    /**
     * Traitement d'un message entrant
     */
    async handleMessage(msg) {
        this.log(`📨 Reçu : "${msg.content}" (Session: ${msg.session_id})`);
        
        // --- AUTO-EVOLUTION CHECK ---
        // Avant de répondre, on vérifie si la demande nécessite une évolution de l'agent
        // (On le fait en background pour ne pas bloquer, sauf si critique)
        this.evaluateCapabilities(msg.content).then(needed => {
            if (needed) this.proposeUpgrade(msg.content);
        });

        if (!this.geminiKey) {
            await this.sendReply(msg.session_id, "⚠️ Erreur Système : Clé GEMINI_API_KEY manquante dans la configuration Backend.");
            return;
        }

        try {
            let reply = "";
            const lowerMsg = msg.content.toLowerCase();

            // DETECT INTENT: Ghost Shopper / Audit
            const triggers = ['audit', 'check', 'vérifie', 'verifie', 'status', 'état', 'ghost shopper', 'test'];
            const isAuditRequest = triggers.some(t => lowerMsg.includes(t)) && 
                                  (lowerMsg.includes('site') || lowerMsg.includes('app') || lowerMsg.includes('connexion'));

            // DETECT INTENT: Cloudflare Purge
            const purgeTriggers = ['purge', 'cache', 'nettoie', 'clean', 'cloudflare'];
            const isPurgeRequest = purgeTriggers.some(t => lowerMsg.includes(t));

            if (isAuditRequest) {
                await this.sendReply(msg.session_id, "🕵️‍♂️ Je lance le Ghost Shopper pour vérifier l'état du site. Patientez environ 30 secondes...");
                
                try {
                    const report = await GhostShopper.runGhostShopperCycle();
                    const prompt = `
                        Tu es un assistant technique. Voici le rapport JSON d'un audit automatisé du site web effectué par le "Ghost Shopper".
                        Résume la situation pour l'utilisateur de manière claire et concise (en quelques phrases).
                        Si succès, sois rassurant. Si échec, explique le problème simplement.
                        Rapport : ${JSON.stringify(report)}
                    `;
                    reply = await this.askGemini(prompt);
                } catch (e) {
                    console.error(`[${this.name}] Ghost Shopper Error:`, e);
                    reply = "❌ Le Ghost Shopper a rencontré une erreur technique lors de l'audit. Veuillez vérifier les logs serveur.";
                }

            } else if (isPurgeRequest) {
                await this.sendReply(msg.session_id, "🧹 Je lance la purge du cache Cloudflare. Un instant...");
                
                try {
                    const result = await CloudflareAgent.purgeCache(true);
                    if (result.success) {
                        reply = "✅ Le cache Cloudflare a été purgé avec succès ! Les modifications devraient être visibles immédiatement (pensez à rafraîchir).";
                    } else {
                        reply = `⚠️ La purge a échoué. Détails: ${JSON.stringify(result.errors)}`;
                    }
                } catch (e) {
                     console.error(`[${this.name}] Cloudflare Error:`, e);
                     reply = "❌ Erreur critique lors de la tentative de purge.";
                }

            } else if (lowerMsg.includes('classe') || lowerMsg.includes('range') || lowerMsg.includes('drive')) {
                await this.sendReply(msg.session_id, "📁 Je m'occupe immédiatement du rangement de votre Drive avec l'aide de ma secrétaire experte. Un instant...");
                reply = await SecretaryAgent.autopilotDriveClassification();

            } else if (lowerMsg.includes('mail') || lowerMsg.includes('relance') || lowerMsg.includes('écris')) {
                // Tentative d'extraction simplifiée du nom du client
                const clientMatch = msg.content.match(/pour ([\w\s]+)/i);
                const clientName = clientMatch ? clientMatch[1] : "notre client";
                reply = await SecretaryAgent.prepareRelance(clientName, "n/a");

            } else if (lowerMsg.includes('conseil') || lowerMsg.includes('stratég') || lowerMsg.includes('adjoint') || lowerMsg.includes('chef')) {
                await this.sendReply(msg.session_id, "🧠 Je transmets votre demande à votre Adjoint (IA Centrale) pour une analyse approfondie...");
                reply = await ChiefAdvisorAgent.consult(msg.content);

            } else {
                // CONVERSATION GENERALE (Fallback sur Advisor si complexe, ou Gemini simple)
                reply = await this.askGemini(msg.content);
            }

            await this.sendReply(msg.session_id, reply);

        } catch (error) {
            console.error(`[${this.name}] Erreur traitement :`, error);
            await this.sendReply(msg.session_id, "Désolé, j'ai eu un problème de connexion avec mon cerveau numérique.");
        }
    }

    /**
     * Envoi de la réponse dans la DB
     */
    async sendReply(sessionId, text) {
        const { error } = await supabase.from('chat_messages').insert({
            sender: 'bot',
            content: text,
            session_id: sessionId
        });
        if (error) console.error(`[${this.name}] Erreur envoi réponse :`, error.message);
        else this.log('📤 Réponse envoyée.');
    }
}

module.exports = new Chat_Agent();
