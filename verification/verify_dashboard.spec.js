// @ts-check
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test('App Resideur Dashboard Verification', async ({ page }) => {
  // Load local HTML
  const htmlContent = fs.readFileSync(path.resolve(__dirname, '../App_Resideur/Index.html'), 'utf8');

  // Inject mock google.script.run
  await page.addInitScript(() => {
    window.google = {
      script: {
        run: {
          withSuccessHandler: function(cb) {
            this._success = cb;
            return this;
          },
          withFailureHandler: function(cb) {
             this._failure = cb;
             return this;
          },
          getKpiData: function() {
            setTimeout(() => this._success({ totalLivraisons: 152, tauxAnomalie: 4 }), 100);
          },
          getSupervisionTournees: function() {
            setTimeout(() => this._success([
              { Date: '2025-05-15', Client: 'EHPAD Les Mimosas', Détails: 'Livraison matin', Statut: 'Livrée' },
              { Date: '2025-05-15', Client: 'Pharmacie Centrale', Détails: 'Urgent', Statut: 'En attente' },
              { Date: '2025-05-15', Client: 'Clinique Sud', Détails: 'Retour prévu', Statut: 'Problème' }
            ]), 200);
          },
          getCodesAccess: function() {
             setTimeout(() => this._success([
               { Code: '1234', Type: 'Portail', Description: 'Entrée principale', Actif: true },
               { Code: '9999', Type: 'Digicode', Description: 'Livraison arrière', Actif: false }
             ]), 300);
          }
        }
      }
    };
  });

  await page.setContent(htmlContent);

  // Check Title
  await expect(page).toHaveTitle('Tableau de Bord ELS');

  // Wait for data load
  await expect(page.locator('#kpi-total')).toHaveText('152');
  await expect(page.locator('#kpi-taux')).toHaveText('4%');

  // Take screenshot of Overview
  await page.screenshot({ path: 'verification/dashboard_overview.png' });

  // Click Tournees tab
  await page.click('button:has-text("Tournées")');
  await expect(page.locator('#tab-tournees')).toBeVisible();

  // Wait for table population
  await expect(page.locator('#table-tournees')).toContainText('EHPAD Les Mimosas');
  await page.screenshot({ path: 'verification/dashboard_tournees.png' });

  // Click Codes tab
  await page.click('button:has-text("Codes Accès")');
  await expect(page.locator('#tab-codes')).toBeVisible();
  await expect(page.locator('#table-codes')).toContainText('Entrée principale');
  await page.screenshot({ path: 'verification/dashboard_codes.png' });

});
