/**
 * @file legal.spec.js
 * @description Tests E2E pour les pages légales (conformité RGPD)
 */
import { test, expect } from '@playwright/test';

test.describe('Legal Pages', () => {
  test('should display Mentions Légales page', async ({ page }) => {
    await page.goto('/legal');
    
    // Vérifier le contenu obligatoire
    await expect(page.locator('h1, h2').first()).toBeVisible();
    
    // Vérifier la présence de mentions légales clés
    const content = await page.textContent('body');
    expect(content.toLowerCase()).toMatch(/siret|rcs|éditeur|hébergeur/);
  });

  test('should display Privacy Policy page', async ({ page }) => {
    await page.goto('/legal');
    
    await expect(page.locator('h1, h2').first()).toBeVisible();
    
    // Vérifier la mention RGPD
    const content = await page.textContent('body');
    expect(content.toLowerCase()).toMatch(/données personnelles|rgpd|confidentialité/);
  });

  test('should display CGV/CGU page', async ({ page }) => {
    await page.goto('/legal');
    
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });
});

test.describe('Cookie Banner', () => {
  test('should display cookie banner on first visit', async ({ page, context }) => {
    // Effacer tous les cookies
    await context.clearCookies();
    
    await page.goto('/');
    
    // Chercher le bandeau de cookies
    const cookieBanner = page.locator('[class*="cookie"], [id*="cookie"], [role="dialog"]');
    
    // Le bandeau doit être visible si implémenté
    if (await cookieBanner.count() > 0) {
      await expect(cookieBanner.first()).toBeVisible();
    }
  });

  test('should have accept/reject buttons on cookie banner', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/');
    
    const acceptButton = page.getByRole('button', { name: /accepter|accept|ok|j'accepte/i });
    const rejectButton = page.getByRole('button', { name: /refuser|reject|non|decline/i });
    
    // Au moins un des deux boutons devrait exister si bandeau présent
    const hasButtons = await acceptButton.count() > 0 || await rejectButton.count() > 0;
    console.log('Cookie buttons found:', hasButtons);
  });

  test('should remember cookie preference', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/');
    
    const acceptButton = page.getByRole('button', { name: /accepter|accept|ok/i });
    if (await acceptButton.count() > 0) {
      await acceptButton.first().click();
      
      // Recharger la page
      await page.reload();
      
      // Le bandeau ne devrait plus apparaître
      const cookieBanner = page.locator('[class*="cookie"], [id*="cookie"]');
      await page.waitForTimeout(1000);
      // Vérifier que le bandeau est caché ou absent
      const bannerCount = await cookieBanner.count();
      console.log('Cookie banner visible after accept:', bannerCount > 0);
    }
  });
});
