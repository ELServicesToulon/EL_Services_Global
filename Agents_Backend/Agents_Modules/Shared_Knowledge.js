/**
 * @file Shared_Knowledge.js
 * @description Module de Gestion de la Connaissance Partagée (Shared Brain).
 * Permet aux agents de sauvegarder des "leçons", des "patterns" d'erreur, et des "succès".
 * Stockage persistant JSON dans Advisors_Memory.
 */

const fs = require('fs');
const path = require('path');

const MEMORY_DIR = path.join(__dirname, '..', 'Advisors_Memory');
const KNOWLEDGE_FILE = path.join(MEMORY_DIR, 'knowledge_base.json');

class SharedKnowledge {
    constructor() {
        this.cache = {
            error_patterns: {}, // { "Error X": { fix: "Do Y", confidence: 0.9, count: 1 } }
            successful_strategies: {}, // { "Task Z": { strategy: "Use Tool A", count: 5 } }
            bypassed_obstacles: {} // { "Cloudflare": { method: "Stealth plugin", timestamp: ... } }
        };
        this.load();
    }

    load() {
        if (!fs.existsSync(MEMORY_DIR)) {
            fs.mkdirSync(MEMORY_DIR, { recursive: true });
        }
        if (fs.existsSync(KNOWLEDGE_FILE)) {
            try {
                const data = fs.readFileSync(KNOWLEDGE_FILE, 'utf8');
                this.cache = { ...this.cache, ...JSON.parse(data) };
            } catch (e) {
                console.error('[SHARED_KNOWLEDGE] Corrupt Knowledge DB, resetting.');
            }
        }
    }

    save() {
        try {
            fs.writeFileSync(KNOWLEDGE_FILE, JSON.stringify(this.cache, null, 2));
            return true;
        } catch (e) {
            console.error('[SHARED_KNOWLEDGE] Save failed:', e.message);
            return false;
        }
    }

    /**
     * Apprend un nouveau pattern d'erreur et sa solution
     */
    learnErrorFix(errorSignature, fixSuggestion, confidence = 0.5) {
        if (!this.cache.error_patterns[errorSignature]) {
            this.cache.error_patterns[errorSignature] = { 
                fix: fixSuggestion, 
                confidence, 
                count: 1, 
                firstSeen: new Date().toISOString() 
            };
        } else {
            // Renforcement
            const entry = this.cache.error_patterns[errorSignature];
            entry.count++;
            entry.lastSeen = new Date().toISOString();
            // Up confidence si on revoit la même erreur (ce qui est peut-être contre intutif si le fix n'a pas marché...)
            // TODO: Ajouter un feedback "Fix Worked?"
        }
        this.save();
    }

    /**
     * Récupère tous les patterns d'erreurs appris
     */
    getKnownErrors() {
        return this.cache.error_patterns;
    }

    /**
     * Apprend qu'une stratégie a fonctionné
     */
    learnStrategy(goal, strategy) {
        if (!this.cache.successful_strategies[goal]) {
            this.cache.successful_strategies[goal] = [];
        }
        this.cache.successful_strategies[goal].push({
            strategy,
            timestamp: new Date().toISOString()
        });
        this.save();
    }
}

module.exports = new SharedKnowledge();
