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
require('dotenv').config();

// Configuration Supabase
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://37.59.124.82.sslip.io';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q';

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

            } else {
                // CONVERSATION GENERALE
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
