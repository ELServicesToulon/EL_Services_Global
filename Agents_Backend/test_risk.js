const RiskMitigator = require('./Agents_Modules/Risk_Mitigator');

async function test() {
    console.log("Testing RiskMitigator...");
    const report = await RiskMitigator.runRiskAnalysisCycle();
    console.log("Report:", report);
}

test();
