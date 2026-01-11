/**
 * @file Backend_Agent.js
 * @description Agent Spécialiste Backend.
 * Rôle : Expert Node.js, Supabase, SQL, API Design.
 * Responsabilité : Gérer la logique serveur, les migrations DB et les API Endpoints.
 */

const Agent_Base = require('./Agent_Base');
const fs = require('fs');
const path = require('path');

class Backend_Agent extends Agent_Base {
    constructor() {
        super('BACKEND_AGENT');
        this.role = "Backend & Database Architect";
        this.basePath = path.join(__dirname, '../..');
    }

    /**
     * Génère une migration SQL pour une demande donnée
     * @param {string} requirement - ex: "Ajouter une colonne 'vip_status' aux users"
     */
    async generateMigration(requirement) {
        this.log(`🗄️ Génération de migration pour : ${requirement}`);
        
        const prompt = `
            Tu es l'Agent Backend (Expert PostgreSQL/Supabase).
            
            TACHE : Créer un script SQL de migration.
            DEMANDE : "${requirement}"
            
            CONTRAINTES :
            - Idempotent (IF NOT EXISTS).
            - Syntaxe PostgreSQL valide.
            - Inclus les commentaires.
        `;

        const sql = await this.askGemini(prompt);
        return { success: true, sql: this.cleanCodeBlock(sql, 'sql') };
    }

    /**
     * Analyse un endpoint API existant
     */
    analyzeEndpoint(serverFile = 'Agents_Backend/Dashboard_Server.js') {
        const fullPath = path.join(this.basePath, serverFile);
        if (!fs.existsSync(fullPath)) return { error: "Server file not found" };
        return fs.readFileSync(fullPath, 'utf8');
    }
}

module.exports = new Backend_Agent();
