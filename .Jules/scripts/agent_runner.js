/**
 * Agent Runner - Local Brain for Jules Agents
 * 
 * Usage: node .Jules/scripts/agent_runner.js <AgentName>
 * Example: node .Jules/scripts/agent_runner.js Sentinel
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- Configuration ---
const API_KEY = process.env.GEMINI_API_KEY;
const JULES_DIR = path.join(__dirname, '..'); // .Jules/ directory
const PROJECT_ROOT = path.join(__dirname, '..', '..');
const MAX_CONTEXT_FILES = 50;
const REPORT_DIR = path.join(JULES_DIR, 'reports');

// --- Helpers ---

function getAgentConfig(agentName) {
    const configPath = path.join(JULES_DIR, `${agentName.toLowerCase()}.md`);
    if (!fs.existsSync(configPath)) {
        throw new Error(`Agent configuration not found: ${configPath}`);
    }
    return fs.readFileSync(configPath, 'utf-8');
}

function getProjectFiles() {
    // Basic implementation: Recursive read, ignoring .git, node_modules, etc.
    const files = [];
    const ignoreList = ['.git', 'node_modules', '.clasp.json', 'package-lock.json', '.Jules', 'reports'];
    
    function scan(dir) {
        const items = fs.readdirSync(dir);
        for (const item of items) {
            const fullPath = path.join(dir, item);
            const relPath = path.relative(PROJECT_ROOT, fullPath);
            
            if (ignoreList.some(i => relPath.includes(i))) continue;

            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                scan(fullPath);
            } else if (stat.isFile() && (item.endsWith('.js') || item.endsWith('.gs') || item.endsWith('.html') || item.endsWith('.css'))) {
                files.push({
                    path: relPath,
                    content: fs.readFileSync(fullPath, 'utf-8')
                });
            }
        }
    }
    scan(PROJECT_ROOT);
    return files.slice(0, MAX_CONTEXT_FILES); // Limit context window
}

async function runAgent(agentName) {
    if (!API_KEY) {
        console.error("❌ ERREUR: La variable GEMINI_API_KEY n'est pas définie dans le fichier .env");
        process.exit(1);
    }

    console.log(`🤖 Agent ${agentName} starting...`);
    
    const contextPrompt = getAgentConfig(agentName);
    const files = getProjectFiles();
    
    // Construct Prompt
    let fullPrompt = `You are ${agentName}, an AI agent responsible for the following goals:\n\n${contextPrompt}\n\n`;
    fullPrompt += `Here is the current codebase:\n\n`;
    
    files.forEach(f => {
        fullPrompt += `--- FILE: ${f.path} ---\n${f.content}\n\n`;
    });
    
    fullPrompt += `\nBased on your instructions, analyze the code and generate a report in Markdown format. If everything is good, start with "✅ No issues found.". If there are issues, list them clearly with actionable steps.`;

    // Call Gemini
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const result = await model.generateContent(fullPrompt);
    const response = result.response;
    const reportText = response.text();

    console.log(`📝 generated report.`);

    // Save Report
    if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR);
    
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(REPORT_DIR, `${agentName}_${dateStr}.md`);
    
    fs.writeFileSync(reportPath, reportText);
    console.log(`💾 Report saved to ${reportPath}`);
}

// --- Main ---
const agentName = process.argv[2];
if (!agentName) {
    console.error("Usage: node agent_runner.js <AgentName>");
    process.exit(1);
}

runAgent(agentName).catch(err => {
    console.error("Fatal Error:", err);
    process.exit(1);
});
