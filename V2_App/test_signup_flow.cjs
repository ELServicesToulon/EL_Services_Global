const { chromium } = require('playwright');

async function testSignupFlow() {
    console.log('🚀 Starting Full Signup Flow Validation...');
    
    // 1. We will use a temporary email service to check for delivery and spam status
    // Using mail7.io or similar if possible, or just a known disposable
    const tempEmail = `test_${Date.now()}@mail7.io`;
    const targetUrl = 'https://mediconvoi-app.fr'; // Start at root

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
        console.log(` -> Navigating to ${targetUrl}`);
        await page.goto(targetUrl, { timeout: 60000 });
        await page.waitForLoadState('networkidle');

        // Check if we are on Landing page and need to click Login
        if (await page.isVisible('text=Se connecter')) {
            console.log(' -> Clicking "Se connecter"');
            await page.click('text=Se connecter');
            await page.waitForLoadState('networkidle');
        } else if (await page.isVisible('text=Connexion')) {
             console.log(' -> Clicking "Connexion"');
            await page.click('text=Connexion');
            await page.waitForLoadState('networkidle');
        }

        // Let's list all inputs to be sure
        const inputs = await page.$$eval('input', inputs => inputs.map(i => ({ type: i.type, placeholder: i.placeholder, name: i.name })));
        console.log(' -> Available inputs:', JSON.stringify(inputs));

        console.log(` -> Filling email: ${tempEmail}`);
        // Try a more specific selector or just fill the first email type input
        await page.fill('input[type="email"]', tempEmail);
        
        console.log(' -> Requesting Magic Link...');
        await page.click('button:has-text("Recevoir mon lien magique")');

        await page.waitForSelector('text=Lien de connexion envoyé', { timeout: 20000 });
        console.log('✅ Magic Link requested successfully!');
        
    } catch (err) {
        console.error('❌ Test failed:', err.message);
        await page.screenshot({ path: 'test_failure.png' });
        console.log('📸 Screenshot saved as test_failure.png');
    } finally {
        await browser.close();
    }
}

testSignupFlow();
