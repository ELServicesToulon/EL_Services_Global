// @ts-check
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test('App Resideur Dashboard Login & Verification', async ({ page }) => {
  // Debug console logs from the browser
  page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));
  page.on('pageerror', err => console.log(`BROWSER ERROR: ${err.message}`));

  // Initialize mock object BEFORE content loads
  await page.addInitScript(() => {
    // Create a mock runner that stores handlers
    const runner = {
      _success: null,
      _failure: null,

      withSuccessHandler: function(cb) {
        this._success = cb;
        return this;
      },

      withFailureHandler: function(cb) {
        this._failure = cb;
        return this;
      },

      getKpiData: function(key) {
        console.log('Mock getKpiData called with key:', key);
        if (key === 'VALID_KEY') {
            if (this._success) {
                setTimeout(() => {
                    this._success({ totalLivraisons: 152, tauxAnomalie: 4 });
                }, 50);
            }
        } else {
            if (this._success) {
                // Simulate backend returning authRequired error or similar
                setTimeout(() => {
                    this._success({ error: "Accès refusé", authRequired: true });
                }, 50);
            }
        }
      },

      getSupervisionTournees: function(key) {
        if (this._success) {
          setTimeout(() => {
            this._success([
              { Date: '2025-05-15', Client: 'EHPAD Les Mimosas', Détails: 'Livraison matin', Statut: 'Livrée' },
            ]);
          }, 100);
        }
      },

      getCodesAccess: function(key) {
        if (this._success) {
          setTimeout(() => {
             this._success([
               { Code: '1234', Type: 'Portail', Description: 'Entrée principale', Actif: true },
             ]);
          }, 150);
        }
      }
    };

    window.google = {
      script: {
        run: runner
      }
    };
    console.log('Mock window.google initialized');
  });

  // Load content
  const htmlContent = fs.readFileSync(path.resolve(__dirname, '../App_Resideur/Index.html'), 'utf8');

  // Inject mock directly (Workaround for race conditions)
  const mockScript = `
  <script>
    window.google = {
      script: {
        run: {
          withSuccessHandler: function(cb) { this._s=cb; return this; },
          withFailureHandler: function(cb) { this._f=cb; return this; },
          getKpiData: function(key) {
             if(key==='VALID_KEY') setTimeout(()=>this._s({totalLivraisons:152,tauxAnomalie:4}),100);
             else setTimeout(()=>this._s({error:'Auth', authRequired:true}),100);
          },
          getSupervisionTournees: function(key) { setTimeout(()=>this._s([{Date:'2025',Client:'Test',Détails:'',Statut:'OK'}]),100); },
          getCodesAccess: function(key) { setTimeout(()=>this._s([{Code:'123',Type:'P',Description:'D',Actif:true}]),100); }
        }
      }
    };
  </script>
  `;

  const modifiedHtml = htmlContent.replace('<head>', '<head>' + mockScript);

  // Use route to serve content on a fake URL to enable localStorage
  await page.route('https://app.resideur.local/', route => {
    route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: modifiedHtml
    });
  });

  await page.goto('https://app.resideur.local/');

  // Check Title
  await expect(page).toHaveTitle('Tableau de Bord ELS');

  // Expect Login Screen initially
  await expect(page.locator('#login-screen')).toBeVisible();
  await expect(page.locator('#app-content')).toBeHidden();

  // Try Invalid Login
  await page.fill('#access-key', 'WRONG_KEY');
  await page.click('button.login-btn');
  await expect(page.locator('#login-error')).toBeVisible();
  await expect(page.locator('#login-error')).toContainText('Clé invalide');

  // Try Valid Login
  await page.fill('#access-key', 'VALID_KEY');
  await page.click('button.login-btn');

  // Wait for Dashboard to appear
  await expect(page.locator('#login-screen')).toBeHidden();
  await expect(page.locator('#app-content')).toBeVisible();

  // Wait for Data
  await expect(page.locator('#kpi-total')).toHaveText('152');

});
