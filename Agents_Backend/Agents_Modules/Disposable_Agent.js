const AgentBase = require('./Agent_Base');

class Disposable_Agent extends AgentBase {
    constructor(workerId = 1) {
        super(`Disposable_Worker_${workerId}`);
        this.workerId = workerId;
    }

    async run() {
        this.log(`🚀 Disposable Worker ${this.workerId} activated on ${require('os').hostname()}.`);
        
        // Lightweight check: Do we have any pending "quick tasks"?
        // For now, it just reports in and shuts down to save resources.
        
        try {
            const prompt = `
                Tu es un agent "Jetable" (Disposable) numéro ${this.workerId}.
                Ta mission est d'effectuer une vérification rapide du système ou une tâche ponctuelle.
                Pour l'instant, confirme juste que tu es opérationnel et prêt à recevoir des ordres.
                Sois bref et précis.
            `;

            // Use the fastest model available
            const response = await this.askGemini(prompt, { model: 'gemini-2.5-flash' });
            
            this.log(`✅ REPORT: ${response}`);
            
            // Simulating task completion
            this.log('🏁 Task complete. Self-terminating.');
            
        } catch (error) {
            this.log(`❌ Error: ${error.message}`);
        }
    }
}

// Auto-run if called directly
if (require.main === module) {
    const workerId = process.argv[2] || 1;
    const agent = new Disposable_Agent(workerId);
    agent.run();
}

module.exports = Disposable_Agent;
