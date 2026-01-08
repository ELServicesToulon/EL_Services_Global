/**
 * @file benchmark_browser.js
 * @description Compare two browser launch methods:
 *   1. Launch new browser instance each time (current Ghost_Shopper behavior)
 *   2. Connect to a persistent Chrome instance via CDP
 */

const { chromium } = require('playwright');

const TARGET_URL = 'https://mediconvoi.fr/';
const NUM_RUNS = 3; // Number of test runs for each method

async function benchmarkLaunchNew() {
    console.log('\n🚀 METHOD 1: Launch new browser each time');
    const times = [];

    for (let i = 0; i < NUM_RUNS; i++) {
        const start = Date.now();
        
        const browser = await chromium.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-dev-shm-usage']
        });
        const context = await browser.newContext();
        const page = await context.newPage();
        await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        const elapsed = Date.now() - start;
        times.push(elapsed);
        console.log(`   Run ${i + 1}: ${elapsed}ms`);
        
        await browser.close();
    }

    const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
    console.log(`   ✅ Average: ${avg}ms`);
    return avg;
}

async function benchmarkConnectCDP() {
    console.log('\n🔌 METHOD 2: Connect to persistent Chrome (CDP)');
    
    // First, launch a persistent browser server
    console.log('   Launching persistent browser server...');
    const browserServer = await chromium.launchServer({
        headless: true,
        args: [
            '--no-sandbox', 
            '--disable-dev-shm-usage'
        ]
    });
    
    // Get the WebSocket endpoint
    const wsEndpoint = browserServer.wsEndpoint();
    console.log(`   Persistent browser ready at: ${wsEndpoint.substring(0, 50)}...`);

    const times = [];

    for (let i = 0; i < NUM_RUNS; i++) {
        const start = Date.now();
        
        // Connect to existing browser
        const browser = await chromium.connect(wsEndpoint);
        const context = await browser.newContext();
        const page = await context.newPage();
        await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        const elapsed = Date.now() - start;
        times.push(elapsed);
        console.log(`   Run ${i + 1}: ${elapsed}ms`);
        
        // Clean up context but keep browser alive
        await context.close();
    }

    const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
    console.log(`   ✅ Average: ${avg}ms`);
    
    // Close persistent browser server
    await browserServer.close();
    console.log('   Persistent browser closed.');
    
    return avg;
}

async function main() {
    console.log('╔══════════════════════════════════════╗');
    console.log('║   BROWSER LAUNCH BENCHMARK TEST      ║');
    console.log('╚══════════════════════════════════════╝');
    console.log(`Target: ${TARGET_URL}`);
    console.log(`Runs per method: ${NUM_RUNS}`);

    try {
        const avgLaunch = await benchmarkLaunchNew();
        const avgConnect = await benchmarkConnectCDP();

        console.log('\n════════════════════════════════════════');
        console.log('📊 RESULTS:');
        console.log(`   Method 1 (Launch New):     ${avgLaunch}ms avg`);
        console.log(`   Method 2 (Connect CDP):    ${avgConnect}ms avg`);
        console.log('');
        
        const diff = avgLaunch - avgConnect;
        const pctFaster = Math.round((diff / avgLaunch) * 100);
        
        if (diff > 0) {
            console.log(`   🏆 WINNER: Connect CDP is ${diff}ms faster (~${pctFaster}% improvement)`);
        } else if (diff < 0) {
            console.log(`   🏆 WINNER: Launch New is ${-diff}ms faster`);
        } else {
            console.log('   🤝 TIE: Both methods are equal');
        }
        console.log('════════════════════════════════════════');

    } catch (error) {
        console.error('❌ Benchmark failed:', error.message);
    }
}

main();
