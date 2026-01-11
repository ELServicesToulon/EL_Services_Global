const AgencyArchitect = require('./Agents_Modules/Agency_Architect');
const AgentFixer = require('./Agents_Modules/Agent_Fixer');
const SharedKnowledge = require('./Agents_Modules/Shared_Knowledge');

async function triggerEvolution() {
    console.log("🧬 [EVOLUTION] Starting Autonomous Self-Development Cycle...");

    // 1. Architect: Look for structural improvements
    console.log("🏗️ [ARCHITECT] Scanning for optimization opportunities...");
    const architectProposal = await AgencyArchitect.runArchitectCycle();
    if (architectProposal) {
        console.log(`✅ Architect proposed: ${architectProposal}`);
        SharedKnowledge.learnStrategy("Self-Optimization", `Implemented ${architectProposal}`);
    } else {
        console.log("ℹ️ Architect found no immediate structural changes needed.");
    }

    // 2. Fixer: Analyze logs and learn from errors
    console.log("🔧 [FIXER] Analyzing logs for learning opportunities...");
    const fixerReport = await AgentFixer.runFixerCycle(false); // Analyze only first
    console.log(`📋 Fixer Report: ${fixerReport}`);

    console.log("🧬 [EVOLUTION] Cycle Complete.");
    // Force save knowledge
    SharedKnowledge.save();
}

triggerEvolution().catch(console.error);
