const { runHealthCheck } = require('./Agents_Modules/Network_Overseer');

async function test() {
    console.log("Testing Network Overseer...");
    const report = await runHealthCheck();
    if (report) {
        console.log("Report generated:");
        console.log(report);
    } else {
        console.log("No issues reported (Report is null/empty).");
    }
}

test();
