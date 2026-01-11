require('dotenv').config();
const https = require('https');

const key = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : "";

if (!key) {
    console.error("⛔ ERREUR : Clé API introuvable dans le .env");
    process.exit(1);
}

console.log("🔄 Scan des modèles disponibles sur le réseau...");

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;

https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.error) {
                console.error("❌ ERREUR API :", json.error.message);
                return;
            }

            if (json.models) {
                console.log("\n=== 🟢 MODÈLES OPÉRATIONNELS ===");
                // Filtre pour ne garder que ceux capables de générer du contenu
                const textModels = json.models.filter(m => 
                    m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent")
                );

                textModels.forEach(m => {
                    // Nettoyage du nom pour affichage propre (ex: models/gemini-1.5-flash -> gemini-1.5-flash)
                    const cleanName = m.name.replace('models/', '');
                    console.log(`🔹 ${cleanName}`);
                });
                console.log("\n>>> FIN DU SCAN.");
            } else {
                console.log("⚠️ Aucune donnée de modèle reçue.");
                console.log(json);
            }
        } catch (e) {
            console.error("💥 Erreur de traitement :", e.message);
        }
    });
}).on('error', e => console.error("💥 Erreur réseau :", e.message));