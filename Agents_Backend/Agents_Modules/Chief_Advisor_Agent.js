/**
 * @file Chief_Advisor_Agent.js
 * @description "Le Chef de Projet / Adjoint" - Agent central IA (Gemini).
 * Version 3.0 : Mémoire Dynamique d'Expérience.
 */

const Agent_Base = require('./Agent_Base');
const fs = require('fs');
const path = require('path');

const MEMORY_DIR = path.join(__dirname, '..', 'Advisors_Memory');

class ChiefAdvisorAgent extends Agent_Base {
    constructor() {
        super('CHIEF_ADVISOR');
        this.version = '3.0.0';
        this.context = `
            Tu es l'IA Centrale, le "Chef de Projet" et "Adjoint Direct" de l'administrateur (User).
            
            TA MÉMOIRE DYNAMIQUE :
            Tu possèdes un dossier "Mental" où tu stockes tes directives et expériences passées.
            Utilise ces informations pour maintenir une cohérence à long terme.
            
            TES MISSIONS :
            1. Conseiller sur la stratégie globale.
            2. Synthétiser l'activité des agents.
            3. Apprendre de tes erreurs et succès (Mise à jour de ta mémoire).
            
            TON STYLE :
            Professionnel, Stratège, Loyal, Direct, Proactif.
        `;
        
        this.initMemory();
    }

    initMemory() {
        if (!fs.existsSync(MEMORY_DIR)) {
            fs.mkdirSync(MEMORY_DIR, { recursive: true });
        }
        // Fichier Index principal
        if (!fs.existsSync(path.join(MEMORY_DIR, 'master_plan.md'))) {
            fs.writeFileSync(path.join(MEMORY_DIR, 'master_plan.md'), "# Plan Maître & Directives Stratégiques\n\n- Objectif 1: Sécurité Maximale (Sentinel)\n- Objectif 2: Autonomie (Agents Indépendants)\n- Objectif 3: Performance (V2 App)");
        }
    }

    /**
     * Lit un fichier de mémoire spécifique
     */
    readMemory(topic) {
        const filePath = path.join(MEMORY_DIR, `${topic}.md`);
        if (fs.existsSync(filePath)) {
            return fs.readFileSync(filePath, 'utf8');
        }
        return null;
    }

    /**
     * Écrit/Met à jour une note mémorielle
     */
    saveDirectives(topic, content) {
        const filePath = path.join(MEMORY_DIR, `${topic}.md`);
        fs.writeFileSync(filePath, content, 'utf8');
        this.log(`🧠 Mémoire mise à jour : ${topic}`);
    }

    /**
     * Récupère le contexte complet (Plan Maitre + Notes pertinentes)
     */
    getFullMemoryContext() {
        let memory = "--- MÉMOIRE LONG TERME ---\n";
        const files = fs.readdirSync(MEMORY_DIR);
        files.forEach(file => {
            if (file.endsWith('.md')) {
                const content = fs.readFileSync(path.join(MEMORY_DIR, file), 'utf8');
                memory += `\n[Fichier: ${file}]\n${content}\n`;
            }
        });
        return memory;
    }

    /**
     * Analyse l'état global du système
     */
    async analyzeSytemHealth() {
        const memoryContext = this.getFullMemoryContext();
        // ... (Logique analyse logs existante) ...
        // On simplifie pour l'exemple, on reprend la logique de base + mémoire
        
        const prompt = `
            ${this.context}
            ${memoryContext}
            
            Analyse les logs système récents (simulés ici pour l'exemple ou lus via LogAggregator).
            Donne moi un état des lieux par rapport au Plan Maître.
        `;
        
        return await this.askGemini(prompt, { model: 'gemini-3-pro-preview' });
    }

    /**
     * Consultation avec accès mémoire
     */
    async consult(userQuery) {
        this.log(`🤔 Consultation reçue : "${userQuery}"`);
        
        const memoryContext = this.getFullMemoryContext();
        
        const prompt = `
            ${this.context}
            
            ${memoryContext}
            
            L'administrateur demande : "${userQuery}"
            
            Réponds en utilisant ta connaissance du projet stockée en mémoire.
            Si la demande de l'utilisateur implique un changement de stratégie, propose de mettre à jour le fichier 'master_plan.md'.
        `;

        try {
            // Utilisation du modèle 3.0 Pro Preview pour une intelligence maximale
            const response = await this.askGemini(prompt, { model: 'gemini-3-pro-preview' });
            return response || "Je n'ai pas pu formuler de conseil pour le moment.";
        } catch (error) {
            this.log(`❌ Erreur lors de la consultation Gemini: ${error.message}`, 'error');
            return "Désolé, une erreur est survenue lors de la consultation. Veuillez réessayer.";
        }
        
        // Auto-apprentissage (rudimentaire) : Si la réponse contient une "Nouvelle Règle", on pourrait l'extraire.
        // Pour l'instant on reste sur du RAG simple (Retrieval Augmented Generation).
    }

    /**
     * Dispatch a command to the Caporal Agent on the Dell
     */
    async dispatchToCaporal(orderType, payload) {
        const axios = require('axios');
        const VPS_API = 'http://localhost:3333'; // Dashboard is local to Sentinel
        
        this.log(`📤 Dispatching to Caporal: ${orderType} - ${payload}`);
        
        try {
            const response = await axios.post(`${VPS_API}/api/orders/dell`, {
                type: orderType,
                payload: payload
            });
            
            if (response.data.success) {
                this.log(`✅ Order queued for Caporal (ID: ${response.data.orderId})`);
                return response.data.orderId;
            }
        } catch (e) {
            this.log(`❌ Failed to dispatch to Caporal: ${e.message}`);
            return null;
        }
    }

    /**
     * Two-way communication: Consult and optionally dispatch to Dell
     */
    async consultWithDell(userQuery) {
        const response = await this.consult(userQuery);
        
        // Check if the response suggests an action for the Dell
        if (response.toLowerCase().includes('dell') || response.toLowerCase().includes('local')) {
            // Use AI to extract a potential command
            const extractPrompt = `
                Basé sur cette réponse: "${response}"
                
                Y a-t-il une action à envoyer à la machine Dell locale ?
                Si oui, retourne en JSON: {"dispatch": true, "type": "...", "payload": "..."}
                Si non, retourne: {"dispatch": false}
            `;
            
            try {
                const extractResult = await this.askGemini(extractPrompt, { model: 'gemini-2.5-flash' });
                const jsonMatch = extractResult.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const action = JSON.parse(jsonMatch[0]);
                    if (action.dispatch) {
                        await this.dispatchToCaporal(action.type, action.payload);
                    }
                }
            } catch (e) {
                this.log(`⚠️ Could not extract Dell action: ${e.message}`);
            }
        }
        
        return response;
    }
}

module.exports = new ChiefAdvisorAgent();
