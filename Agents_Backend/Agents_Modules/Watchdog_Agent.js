/**
 * @file Watchdog_Agent.js
 * @description "Agent de Veille" (Deep Research).
 * Responsable de la surveillance légale et technologique.
 * Capacité de naviguer sur le web (via Playwright), d'extraire le contenu
 * et de l'analyser via Gemini pour proposer des actions.
 */

const Agent_Base = require('./Agent_Base');
const { chromium } = require('playwright');

class Watchdog_Agent extends Agent_Base {
    constructor() {
        super('WATCHDOG_AGENT');
        this.role = "Deep Research & Legal Watchdog";
    }

    /**
     * Effectue une recherche profonde sur une URL donnée
     * @param {string} url - URL cible (ex: Journal Officiel)
     * @param {string} query - Ce qu'on cherche (ex: "Tarifs Transport Bariatriques")
     */
    async deepResearch(url, query) {
        this.log(`🕵️‍♂️ Deep Research engagée sur : ${url}`);
        this.log(`🔍 Query : ${query}`);

        let content = "";
        let browser = null;

        try {
            // 1. Navigation Headless via Playwright
            browser = await chromium.launch({ headless: true });
            const page = await browser.newPage();
            
            // Timeout 30s
            await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
            
            // Extraction du texte principal
            content = await page.evaluate(() => document.body.innerText);
            
            this.log(`📄 Contenu extrait (${content.length} chars). Analyse en cours...`);

        } catch (error) {
            this.log(`❌ Erreur de navigation : ${error.message}`);
            return { error: error.message };
        } finally {
            if (browser) await browser.close();
        }

        // 2. Analyse Cognitive via Gemini
        const prompt = `
            Tu es l'Agent Watchdog (Deep Research) de Mediconvoi.
            Ton but est de scanner ce texte pour trouver des informations CRITIQUES.
            
            QUERY : "${query}"
            
            CONTENU (Extrait) :
            ${content.substring(0, 15000)} ... (tronqué)
            
            TACHEUX :
            1. Identifie si l'information recherchée est présente.
            2. Si oui, extrais les données concrètes (chiffres, dates, obligations).
            3. Estime l'impact pour Mediconvoi (Transport Médical).
            4. Propose une ACTION technique (ex: "Mettre à jour la grille tarifaire à X€").

            Format de réponse JSON attendu :
            {
                "found": boolean,
                "summary": "Résumé de l'info",
                "impact": "High/Medium/Low",
                "proposed_action": "Action concrète"
            }
        `;

        const analysis = await this.askGemini(prompt);
        return analysis;
    }

    /**
     * Génère une proposition de modification de code (Auto-PR style)
     * @param {string} targetFile - Fichier à modifier (ex: 'Agents_Backend/config.js')
     * @param {string} description - Description de la modif
     * @param {string} newCode - Nouveau code proposé
     */
    async proposeChange(targetFile, description, newCode) {
        this.log(`📝 Génération d'une proposition pour : ${targetFile}`);
        
        const timestamp = Date.now();
        const proposalPath = `PROPOSAL_Watchdog_${timestamp}.md`;
        
        const content = `
# 🤖 Proposition Auto-PR (Watchdog)

**Cible** : \`${targetFile}\`
**Date** : ${new Date().toISOString()}
**Raison** : ${description}

## Changement Proposé

\`\`\`javascript
${newCode}
\`\`\`

## Action
Pour appliquer, valider dans l'Agent Manager ou lancer \`apply_proposal.js ${proposalPath}\`.
        `;

        const fs = require('fs');
        const path = require('path');
        // Save in root or specific proposal folder. Let's start with root for visibility as per prompt context.
        const savePath = path.join(__dirname, '..', '..', proposalPath);
        
        fs.writeFileSync(savePath, content.trim());
        this.log(`✅ Proposition sauvegardée : ${savePath}`);
        
        return { success: true, proposalPath: savePath };
    }
}

module.exports = new Watchdog_Agent();
