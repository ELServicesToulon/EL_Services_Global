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
const SharedKnowledge = require('./Shared_Knowledge'); // CONNECTED BRAIN

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
        // (Désactivé pour le mode "Boîte à Idées" public)
        /*
        this.evaluateCapabilities(msg.content).then(needed => {
            if (needed) this.proposeUpgrade(msg.content);
        });
        */

        if (!this.geminiKey) {
            await this.sendReply(msg.session_id, "⚠️ DÉSOLÉ : Je ne peux pas traiter votre demande pour le moment.");
            return;
        }

        try {
            let reply = "";
            
            // MODE VISITEUR / BOITE A IDEES
            // On ignore les commandes admin (audit, purge, etc.) pour la sécurité et la simplicité
            
            /*
            const triggers = ['audit', 'check', 'vérifie', 'verifie', 'status', 'état', 'ghost shopper', 'test'];
            // ... (Code legacy désactivé)
            */

            const prompt = `
                Tu es l'assistant visiteur du site MediConvoi.
                TA MISSION : Recueillir les idées, suggestions et retours des utilisateurs ("Boîte à Idées").
                
                RÈGLES :
                1. Si l'utilisateur donne une idée ou une suggestion : Remercie chaleureusement et confirme que l'idée a été transmise à l'équipe.
                2. Si l'utilisateur signale un problème : Remercie pour le signalement et indique que l'équipe technique va regarder.
                3. Si l'utilisateur dit "Bonjour" ou pose une question simple sur le service : Réponds poliment et brièvement.
                4. TU NE DOIS PAS exécuter d'actions techniques (pas d'audit, pas de purge, pas de commande).
                5. Reste toujours courtois, positif et serviable.
                
                Message de l'utilisateur : "${msg.content}"
            `;

            reply = await this.askGemini(prompt);
            
            // Log spécial pour les idées (simulation de "remontée")
            this.log(`📝 FEEDBACK UTILISATEUR : ${msg.content}`);

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
