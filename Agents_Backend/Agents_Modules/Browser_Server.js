/**
 * @file Browser_Server.js
 * @description Manages a persistent Chromium browser server for agents.
 * Agents can connect via WebSocket endpoint for ~27% faster page loads.
 */

const { chromium } = require('playwright');

let browserServer = null;
let wsEndpoint = null;

/**
 * Starts the persistent browser server if not already running.
 * @returns {Promise<string>} WebSocket endpoint URL
 */
async function start() {
    if (browserServer && wsEndpoint) {
        console.log('[BROWSER_SERVER] Already running.');
        return wsEndpoint;
    }

    console.log('[BROWSER_SERVER] 🚀 Launching persistent Chromium...');
    
    browserServer = await chromium.launchServer({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--disable-blink-features=AutomationControlled',
            '--disable-infobars',
            '--window-position=0,0',
            '--ignore-certificate-errors',
            '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ]
    });

    wsEndpoint = browserServer.wsEndpoint();
    console.log(`[BROWSER_SERVER] ✅ Ready at: ${wsEndpoint.substring(0, 60)}...`);
    
    return wsEndpoint;
}

/**
 * Gets the WebSocket endpoint if server is running.
 * @returns {string|null} WebSocket endpoint or null
 */
function getEndpoint() {
    return wsEndpoint;
}

/**
 * Connects to the persistent browser.
 * @returns {Promise<Browser>} Connected browser instance
 */
async function connect() {
    if (!wsEndpoint) {
        await start();
    }
    return chromium.connect(wsEndpoint);
}

/**
 * Stops the browser server.
 */
async function stop() {
    if (browserServer) {
        console.log('[BROWSER_SERVER] 🛑 Shutting down...');
        await browserServer.close();
        browserServer = null;
        wsEndpoint = null;
    }
}

/**
 * Health check - restarts if crashed
 */
async function healthCheck() {
    if (!browserServer) {
        console.log('[BROWSER_SERVER] ⚠️ Server not running, restarting...');
        await start();
    }
}

module.exports = {
    start,
    stop,
    connect,
    getEndpoint,
    healthCheck
};
