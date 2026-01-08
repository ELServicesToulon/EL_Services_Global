const Architect = require('./Agents_Modules/Agency_Architect');
(async () => {
    try {
        console.log("Triggering Architect Cycle...");
        const result = await Architect.runArchitectCycle();
        console.log("Result:", result);
    } catch (e) {
        console.error(e);
    }
})();
