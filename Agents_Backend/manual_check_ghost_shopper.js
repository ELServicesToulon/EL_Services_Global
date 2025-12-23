
const GhostShopper = require('./Agents_Modules/Ghost_Shopper');

async function runTest() {
    console.log('--- STARTING MANUAL GHOST SHOPPER TEST ---');
    try {
        const report = await GhostShopper.runGhostShopperCycle();
        console.log('--- REPORT ---');
        console.log(JSON.stringify(report, null, 2));

        if (report.issues && report.issues.length > 0) {
            console.log('ISSUES FOUND:');
            report.issues.forEach(i => console.log(`- ${i}`));
        } else {
            console.log('NO ISSUES FOUND.');
        }

    } catch (error) {
        console.error('CRASH:', error);
    }
    console.log('--- END ---');
}

runTest();
