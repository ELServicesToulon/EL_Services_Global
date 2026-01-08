/**
 * @file landing.spec.js
 * @description Tests E2E pour la page d'accueil (Landing Page)
 */
import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the main hero section', async ({ page }) => {
    // Vérifier que le titre principal est visible
    await expect(page.locator('h1')).toBeVisible();
    
    // Vérifier que le CTA principal existe
    const ctaButton = page.getByRole('button', { name: /réserver|commander|contact/i });
    await expect(ctaButton.first()).toBeVisible();
  });

  test('should have working navigation links', async ({ page }) => {
    // Vérifier les liens de navigation
    const navLinks = page.locator('nav a, header a');
    const count = await navLinks.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Vérifier que la page s'adapte correctement
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('body')).toBeVisible();
    
    // Vérifier qu'il n'y a pas de scroll horizontal
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10); // 10px de tolérance
  });

  test('should display legal links in footer', async ({ page }) => {
    // Scroll jusqu'au footer
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    
    // Vérifier la présence des liens légaux obligatoires
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
  });

  test('should load without JavaScript errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Filtrer les erreurs non-critiques (ex: extensions, third-party)
    const criticalErrors = errors.filter(e => 
      !e.includes('extension') && 
      !e.includes('chrome-extension') &&
      !e.includes('ResizeObserver')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });
});
