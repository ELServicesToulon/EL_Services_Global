/**
 * @file Orchestrator_Agent.js
 * @description "L'Aiguilleur" - Agent central qui cartographie le projet et redirige les requêtes.
 * Il maintient une carte live du projet (Agents, Core, Relations) et utilise Gemini pour le dispatch.
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

// Configuration
const ROOT_DIR = path.resolve(__dirname, '..'); // Agents_Backend root
const PROJECT_MAP_FILE = path.join(ROOT_DIR, 'PROJECT_MAP.json');
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

class OrchestratorAgent {
    constructor() {
        this.name = 'ORCHESTRATOR_AGENT';
        this.projectMap = {
            timestamp: null,
            agents: [],
            modules: [],
            relationships: []
        };
    }

    /**
     * Scan complet du dossier Agents_Backend pour construire la carte.
     */
    async scanCodebase() {
        console.log(`[${this.name}] 🔍 Scanning codebase...`);
        const map = {
            timestamp: new Date().toISOString(),
            files: [],
            agents: []
        };

        const ignoreList = ['node_modules', '.git', 'package-lock.json', '.env'];

        const walkSync = (dir, filelist = []) => {
            const files = fs.readdirSync(dir);
            files.forEach(file => {
                const filepath = path.join(dir, file);
                const stat = fs.statSync(filepath);

                if (ignoreList.some(ign => filepath.includes(ign))) return;

                if (stat.isDirectory()) {
                    filelist = walkSync(filepath, filelist);
                } else {
                    if (file.endsWith('.js') || file.endsWith('.json') || file.endsWith('.md')) {
                        filelist.push({
                            path: filepath,
                            name: file,
                            size: stat.size,
                            relative: path.relative(ROOT_DIR, filepath),
                            contentSnippet: this.getPrologue(filepath)
                        });
                    }
                }
            });
            return filelist;
        };

        map.files = walkSync(ROOT_DIR);

        // Identify Agents
        map.agents = map.files.filter(f => 
            f.relative.includes('Agents_Modules') && f.name.endsWith('.js')
        ).map(f => f.name.replace('.js', ''));

        // Extract Relationships (Dependencies & Inheritance) & Documentation
        map.relationships = [];
        const requireRegex = /require\(['"]\.\/?([^'"]+)['"]\)/g;
        const extendsRegex = /class\s+(\w+)\s+extends\s+(\w+)/g;
        const jsdocRegex = /\/\*\*([\s\S]*?)\*\//; // Simple capture of first JSDoc block

        map.files.forEach(file => {
            if (file.name.endsWith('.js')) {
                try {
                    const content = fs.readFileSync(file.path, 'utf8');
                    
                    // 1. Dependencies (Require)
                    let match;
                    while ((match = requireRegex.exec(content)) !== null) {
                        map.relationships.push({
                            type: 'dependency',
                            from: file.name,
                            to: path.basename(match[1]) + (match[1].endsWith('.js') ? '' : '.js')
                        });
                    }

                    // 2. Inheritance (Extends)
                    while ((match = extendsRegex.exec(content)) !== null) {
                         map.relationships.push({
                            type: 'inheritance',
                            from: match[1], // Class Name
                            to: match[2],   // Parent Class
                            file: file.name
                        });
                    }

                    // 3. Knowledge (JSDoc Description)
                    const docMatch = jsdocRegex.exec(content);
                    if (docMatch) {
                        // Clean up the JSDoc syntax to get raw text
                        file.description = docMatch[1]
                            .split('\n')
                            .map(line => line.replace(/\s*\*\s?/, '').trim())
                            .filter(l => l.length > 0 && !l.startsWith('@file'))
                            .join(' ');
                    }

                } catch (e) {
                    // Ignore read errors
                }
            }
        });

        this.projectMap = map;
        this.saveMap();
        this.generateArchitectureDoc(); // Create human/AI readable report
        console.log(`[${this.name}] 🗺️ Map updated: ${map.files.length} files, ${map.agents.length} agents.`);
        return map;
    }

    /**
     * Génère un fichier Markdown exhaustif du projet.
     */
    generateArchitectureDoc() {
        const docPath = path.join(ROOT_DIR, 'PROJECT_ARCHITECTURE.md');
        let md = `# 🏗️ PROJECT ARCHITECTURE (Live Map)\n\n`;
        md += `Updated: ${new Date().toISOString()}\n\n`;

        md += `## 🤖 Agents Detected\n`;
        this.projectMap.agents.forEach(agent => {
            const file = this.projectMap.files.find(f => f.name === agent + '.js');
            const desc = file && file.description ? file.description : "No description detected.";
            md += `- **${agent}**\n  - ${desc}\n`;
        });

        md += `\n## 🔗 Relationships\n`;
        this.projectMap.relationships.forEach(rel => {
            if (rel.type === 'dependency') {
                md += `- \`${rel.from}\` imports \`${rel.to}\`\n`;
            } else if (rel.type === 'inheritance') {
                md += `- Class **${rel.from}** extends **${rel.to}** (in ${rel.file})\n`;
            }
        });

        md += `\n## 📂 File Index\n`;
        this.projectMap.files.forEach(f => {
             md += `- [${f.name}](${f.relative}) (${(f.size/1024).toFixed(1)} KB)\n`;
        });

        fs.writeFileSync(docPath, md);
        console.log(`[${this.name}] 📝 Architecture Doc generated at ${docPath}`);
    }

    /**
     * Extrait les premières lignes d'un fichier pour contexte.
     */
    getPrologue(filepath) {
        try {
            const content = fs.readFileSync(filepath, 'utf8');
            const lines = content.split('\n').slice(0, 10).join('\n');
            return lines;
        } catch (e) {
            return "";
        }
    }

    saveMap() {
        fs.writeFileSync(PROJECT_MAP_FILE, JSON.stringify(this.projectMap, null, 2));
    }

    /**
     * Décide quel agent doit traiter le prompt utilisateur.
     * @param {string} userPrompt - La demande "fix" ou "improve".
     */
    async dispatch(userPrompt) {
        if (!GEMINI_API_KEY) {
            console.warn(`[${this.name}] ⚠️ GEMINI_API_KEY missing. Using Mock Mode.`);
            return {
                target_agent: 'Mock_Agent',
                reasoning: 'API Key missing, returning mock response.',
                technical_instructions: 'Please configure GEMINI_API_KEY in .env'
            };
        }

        // Si la map est vide, on scanne
        if (!this.projectMap.timestamp) await this.scanCodebase();

        const agentList = this.projectMap.agents.join(', ');
        
        const prompt = `
            Tu es l'Orchestrateur Technique d'un projet backend Node.js.
            
            CONTEXTE PROJET:
            Liste des Agents disponibles : ${agentList}
            
            DEMANDE UTILISATEUR : "${userPrompt}"
            
            MISSION :
            Identifie l'agent le plus susceptible d'être concerné par cette demande.
            Si la demande est générique ou concerne le système entier, choisis "Sentinel_Core" ou "Agent_Fixer".
            
            FORMAT DE REPONSE JSON UNIQUEMENT :
            {
                "target_agent": "NomDeLAgent",
                "reasoning": "Pourquoi cet agent",
                "technical_instructions": "Instructions techniques brèves pour l'agent (fichiers to check, functions, etc)"
            }
        `;

        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=${GEMINI_API_KEY}`;
            const response = await axios.post(url, {
                contents: [{ parts: [{ text: prompt }] }]
            });

            const text = response.data.candidates[0].content.parts[0].text;
            // Clean JSON markdown if present
            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const decision = JSON.parse(jsonStr);

            console.log(`[${this.name}] 🔀 Dispatch Decision: ${JSON.stringify(decision)}`);
            return decision;

        } catch (e) {
            console.error(`[${this.name}] Gemini Dispatch Error:`, e.message);
            return { target_agent: 'Agent_Fixer', reasoning: 'Fallback due to error', technical_instructions: 'System error during dispatch.' };
        }
    }
}

module.exports = new OrchestratorAgent();
