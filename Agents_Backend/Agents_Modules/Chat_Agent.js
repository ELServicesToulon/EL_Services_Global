/**
 * @file Chat_Agent.js
 * @description Agent conversationnel (Chatbot) intégré à Sentinel.
 * Interagit avec les utilisateurs via Supabase et utilise Gemini pour l'intelligence.
 * Peut piloter Ghost Shopper pour des audits à la demande.
 */

const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const GhostShopper = require('./Ghost_Shopper');
require('dotenv').config();

// Configuration Supabase (Hardcoded fallback as per run_migrations.js context)
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://37.59.124.82.sslip.io';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q';

// Configuration Gemini
// Note: Utilisateur doit fournir GEMINI_API_KEY dans .env
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false }
});

class ChatAgent {
    constructor() {
        this.name = 'CHAT_AGENT';
        this.subscription = null;
    }

    /**
     * Démarrage de l'agent
     */
    async init() {
        console.log(`[${this.name}] 💬 Initialisation...`);
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
                    console.log(`[${this.name}] 🟢 Connecté et en écoute.`);
                }
            });
    }

    /**
     * Traitement d'un message entrant
     */
    async handleMessage(msg) {
        console.log(`[${this.name}] 📨 Reçu : "${msg.content}" (Session: ${msg.session_id})`);
        
        // Vérification de la clé API
        if (!GEMINI_API_KEY) {
            await this.sendReply(msg.session_id, "⚠️ Erreur Système : Clé GEMINI_API_KEY manquante dans la configuration Backend.");
            return;
        }

        try {
            let reply = "";

            // DETECT INTENT: Ghost Shopper / Audit
            const lowerMsg = msg.content.toLowerCase();
            const triggers = ['audit', 'check', 'vérifie', 'verifie', 'status', 'état', 'ghost shopper', 'test'];
            
            const isAuditRequest = triggers.some(t => lowerMsg.includes(t)) && 
                                  (lowerMsg.includes('site') || lowerMsg.includes('app') || lowerMsg.includes('connexion'));

            if (isAuditRequest) {
                await this.sendReply(msg.session_id, "🕵️‍♂️ Je lance le Ghost Shopper pour vérifier l'état du site. Patientez environ 30 secondes...");
                
                try {
                    // Lancement Audit
                    const report = await GhostShopper.runGhostShopperCycle();
                    
                    // Résumé via Gemini
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

            } else {
                // CONVERSATION GENERALE
                // On pourrait ajouter l'historique ici si besoin
                reply = await this.askGemini(msg.content);
            }

            await this.sendReply(msg.session_id, reply);

        } catch (error) {
            console.error(`[${this.name}] Erreur traitement :`, error);
            await this.sendReply(msg.session_id, "Désolé, j'ai eu un problème de connexion avec mon cerveau numérique.");
        }
    }

    /**
     * Appel à Gemini API
     */
    async askGemini(prompt) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`;
            // Utilisation de gemini-2.0-flash-exp si disponible, sinon fallback pro
            // On tente d'abord flashy
            
            const response = await axios.post(url, {
                contents: [{ parts: [{ text: prompt }] }]
            });
            
            if (response.data && response.data.candidates && response.data.candidates.length > 0) {
                return response.data.candidates[0].content.parts[0].text;
            } else {
                return "Gemini n'a rien répondu.";
            }

        } catch (e) {
            // Fallback sur gemini-pro si le model name failed (404) ou autre
            if (e.response && (e.response.status === 404 || e.response.status === 400)) {
                try {
                    const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;
                    const response = await axios.post(fallbackUrl, {
                        contents: [{ parts: [{ text: prompt }] }]
                    });
                    return response.data.candidates[0].content.parts[0].text;
                } catch (e2) {
                     console.error('Gemini Fallback Error:', e2.message);
                     throw e2;
                }
            }
            console.error('Gemini Error:', e.response ? e.response.data : e.message);
            throw e;
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
        else console.log(`[${this.name}] 📤 Réponse envoyée.`);
    }
}

module.exports = new ChatAgent();
