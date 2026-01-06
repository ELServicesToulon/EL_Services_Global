const fs = require('fs');
const readline = require('readline');
const path = require('path');

const JOURNAL_FILE = path.join(__dirname, 'DEV_JOURNAL.md');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function getFormatDate() {
    return new Date().toISOString().split('T')[0];
}

function readLastState() {
    if (!fs.existsSync(JOURNAL_FILE)) {
        console.log("❌ Aucun journal trouvé. Initialisation recommandée.");
        return null;
    }
    const content = fs.readFileSync(JOURNAL_FILE, 'utf8');

    // Simple heuristic to find the last "Propositions" or "Prochaines Étapes"
    const lines = content.split('\n');
    let lastProposals = [];
    let capturing = false;

    for (const line of lines) {
        if (line.match(/Propositions|Prochaines Étapes/i)) {
            capturing = true;
            lastProposals = [line]; // Reset and start capturing
        } else if (line.startsWith('### ') || line.startsWith('---')) {
            capturing = false;
        } else if (capturing) {
            lastProposals.push(line);
        }
    }

    return lastProposals.join('\n').trim();
}

function appendSession(objective) {
    const date = getFormatDate();
    const template = `
### ${date} - Nouvelle Session
**Objectif**: ${objective}
**Actions**:
- [ ] (À remplir par l'agent/dev)
**Décisions**:
- ...
**Prochaines Étapes**:
- ...

---
`;
    fs.appendFileSync(JOURNAL_FILE, template);
    console.log(`\n✅ Session enregistrée dans ${JOURNAL_FILE}. Au travail !`);
}

console.log("\n🤖 --- AGENT MÉMOIRE MEDICONVOI --- 🤖\n");

const context = readLastState();
if (context) {
    console.log("📋 **Rappel du Contexte (Dernières propositions)** :");
    console.log("---------------------------------------------------");
    console.log(context);
    console.log("---------------------------------------------------\n");
}

rl.question("🎯 Quel est votre objectif pour cette session ? ", (answer) => {
    appendSession(answer);
    rl.close();
});
