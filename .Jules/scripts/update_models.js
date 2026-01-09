const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../Agents_Backend/.env') });
const axiosModule = require('../../Agents_Backend/node_modules/axios');
const axios = axiosModule.default || axiosModule;

async function main() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
        console.error("❌ Erreur: Pas de GEMINI_API_KEY trouvée dans Agents_Backend/.env");
        process.exit(1);
    }

    console.log("🔍 Recherche des modèles Gemini disponibles...");
    
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
        const response = await axios.get(url);
        const models = response.data.models || [];
        
        console.log(`\n✅ ${models.length} modèles trouvés.\n`);

        // PRICING KNOWLEDGE BASE (Manually maintained)
        const pricing = {
            'gemini-1.5-flash':    { in: '$0.075', out: '$0.30' },
            'gemini-1.5-pro':      { in: '$3.50',  out: '$10.50' },
            'gemini-2.0-flash-exp': { in: 'Free (Exp)', out: 'Free (Exp)' },
            'gemini-2.5-flash':    { in: 'Unknown', out: 'Unknown' }, // Hypothetical/New
            'gemini-pro':          { in: '$0.50',  out: '$1.50' }
        };

        const headers = ['Nom du Modèle', 'Version', 'Input Cost / 1M', 'Output Cost / 1M'];
        const rows = models.map(m => {
            const name = m.name.replace('models/', '');
            const version = m.version || 'v1beta';
            
            // Find pricing or default
            let p = { in: '?', out: '?' };
            // Simple robust matching
            for (const [k, v] of Object.entries(pricing)) {
                if (name.includes(k)) p = v;
            }

            return { name, version, in: p.in, out: p.out };
        });

        // Simple aligned output
        console.table(rows);
        
        console.log("\n💡 Analyse des Coûts :");
        console.log("- Gemini 1.5 Flash est très économique ($0.075/1M).");
        console.log("- Gemini 1.5 Pro est plus coûteux mais plus puissant.");
        console.log("- Les versions Exp (2.0) sont souvent gratuites mais instables (Rate Limits).");

    } catch (e) {
        console.error("💥 Erreur lors de la récupération des modèles :", e.message);
        if (e.response) {
            console.error("Détails API:", e.response.data);
        }
    }
}

main();
