/**
 * @file Deployment_Agent.js
 * @description Agent responsible for Continuous Deployment (CD).
 * Monitors 'git status' and triggers 'deploy_launch_v2.js' if changes are detected.
 */

const { exec } = require('child_process');
const path = require('path');
// fs removed (unused)

class DeploymentAgent {
    constructor() {
        this.name = 'DEPLOYMENT_AGENT';
        this.rootDir = path.resolve(__dirname, '../..'); // Root of EL_Services_Global (Agents_Modules -> Agents_Backend -> EL_Services_Global)
        this.isDeploying = false;
        this.lastDeployTime = 0;
        this.COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes cooldown
    }

    async runDeploymentCycle() {
        if (this.isDeploying) {
            return '⚠️ Deployment already in progress.';
        }

        const now = Date.now();
        if (now - this.lastDeployTime < this.COOLDOWN_MS) {
            return `⏳ Cooldown active. Next check in ${Math.round((this.COOLDOWN_MS - (now - this.lastDeployTime)) / 1000)}s.`;
        }

        console.log(`[${this.name}] Checking for code changes...`);

        try {
            const hasChanges = await this.checkGitStatus();
            if (hasChanges) {
                console.log(`[${this.name}] 🔄 Changes detected. Initiating Auto-Deployment...`);
                this.isDeploying = true;
                
                const result = await this.triggerDeployment();
                
                this.isDeploying = false;
                this.lastDeployTime = Date.now();
                return result;
            } else {
                return '✅ System up-to-date. No changes detected.';
            }
        } catch (error) {
            this.isDeploying = false;
            console.error(`[${this.name}] Error:`, error);
            return `❌ Error during cycle: ${error.message}`;
        }
    }

    async checkGitStatus() {
        return new Promise((resolve, reject) => {
            exec('git status --porcelain', { cwd: this.rootDir }, (error, stdout) => {
                if (error) {
                    reject(error);
                    return;
                }
                // Filter out ignored patterns if necessary (e.g., logs, temp files)
                // For now, any change reported by git status triggers deploy
                const changes = stdout.trim();
                if (changes.length > 0) {
                    // Check if changes are only log files or temp files that shouldn't trigger deploy
                    const lines = changes.split('\n');
                    const importantChanges = lines.filter(line => {
                        return !line.includes('npm-debug.log') && 
                               !line.includes('package-lock.json') && // Optional: maybe we do want to deploy on lockfile change?
                               !line.includes('.DS_Store');
                    });
                    
                    if (importantChanges.length > 0) {
                        resolve(true); 
                    } else {
                         resolve(false);
                    }
                } else {
                    resolve(false);
                }
            });
        });
    }

    async triggerDeployment() {
        return new Promise((resolve) => {
            const deployScript = path.join(this.rootDir, 'deploy_launch_v2.js');
            
            // We use a completely detached process or just await it?
            // Awaiting it is safer to prevent overlap.
            exec(`node "${deployScript}"`, { cwd: this.rootDir }, (error, stdout, stderr) => {
                if (error) {
                    console.error(`[${this.name}] Deployment Failed:\n${stderr}`);
                    resolve(`❌ Auto-Deployment Failed. Check logs.`);
                } else {
                    console.log(`[${this.name}] Deployment Output:\n${stdout}`);
                    resolve(`🚀 Auto-Deployment Successful! V2 & Agents updated.`);
                }
            });
        });
    }
}

module.exports = new DeploymentAgent();
