const DeploymentAgent = require('./Agents_Backend/Agents_Modules/Deployment_Agent');
const fs = require('fs');
const path = require('path');

async function test() {
    console.log("--- TEST 1: No Changes ---");
    let result = await DeploymentAgent.runDeploymentCycle();
    console.log("Result:", result);

    console.log("\n--- TEST 2: With Changes ---");
    // Create a dummy file to trigger git status
    const testFile = path.resolve(__dirname, 'test_deploy_trigger.txt');
    fs.writeFileSync(testFile, 'test');
    
    // Reset cooldown for test
    DeploymentAgent.lastDeployTime = 0; 
    
    // We expect it to trigger. verify log output.
    // NOTE: In a real run we might want to mock triggerDeployment to avoid actual deploy.
    // Overwriting the method for test purposes:
    DeploymentAgent.triggerDeployment = async () => {
        return "MOCKED DEPLOYMENT SUCCESS";
    };

    result = await DeploymentAgent.runDeploymentCycle();
    console.log("Result:", result);

    console.log("\n--- TEST 3: Cooldown ---");
    result = await DeploymentAgent.runDeploymentCycle();
    console.log("Result:", result);

    // Cleanup
    fs.unlinkSync(testFile);
}

test();
