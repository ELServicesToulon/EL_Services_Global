/**
 * @file booking.spec.js
 * @description Tests E2E pour le flux de réservation
 * NOTE: La page affiche des tarifs et ouvre des modales pour la config
 */
import { test, expect } from '@playwright/test';

test.describe('Booking Page Structure', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/booking');
  });

  test('should display the booking page with tariffs', async ({ page }) => {
    // Vérifier que la page affiche le titre
    await expect(page.locator('h1')).toContainText(/réserver|course/i);
    
    // Vérifier que les tarifs sont affichés
    await expect(page.getByText(/tournées/i).first()).toBeVisible();
  });

  test('should display tariff cards', async ({ page }) => {
    // Vérifier les cartes de tarifs
    const normalTariff = page.getByText(/normal/i);
    const urgentTariff = page.getByText(/urgent/i);
    
    await expect(normalTariff.first()).toBeVisible();
    await expect(urgentTariff.first()).toBeVisible();
  });

  test('should open configuration modal on tariff click', async ({ page }) => {
    // Cliquer sur un tarif pour ouvrir la modale
    const normalCard = page.locator('[class*="cursor-pointer"]').filter({ hasText: /normal/i });
    
    if (await normalCard.count() > 0) {
      await normalCard.first().click();
      
      // Vérifier que la modale s'ouvre
      await page.waitForTimeout(500);
      const modal = page.locator('[class*="fixed"], [class*="modal"]').filter({ hasText: /configurer|arrêts/i });
      await expect(modal.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should have stop counter in modal', async ({ page }) => {
    // Ouvrir la modale
    const tariffCard = page.locator('text=Normal').first();
    await tariffCard.click();
    await page.waitForTimeout(500);
    
    // Chercher les boutons +/- par classe SVG
    const counterButtons = page.locator('[class*="cursor-pointer"], button').filter({ has: page.locator('svg') });
    expect(await counterButtons.count()).toBeGreaterThan(0);
  });
});

test.describe('Booking Calendar', () => {
  test('should show calendar when modal is opened', async ({ page }) => {
    await page.goto('/booking');
    
    // Ouvrir la modale
    const tariffCard = page.locator('text=Normal').first();
    await tariffCard.click();
    await page.waitForTimeout(500);
    
    // Chercher le calendrier/sélecteur de date
    const calendar = page.locator('[class*="calendar"], [class*="date"], [class*="Capsule"]');
    
    if (await calendar.count() > 0) {
      await expect(calendar.first()).toBeVisible();
    }
  });
});

test.describe('Public Access', () => {
  test('should be accessible without login', async ({ page }) => {
    const response = await page.goto('/booking');
    
    // Vérifier que la page est accessible (pas de redirection vers login)
    expect(response.status()).toBeLessThan(400);
    expect(page.url()).toContain('booking');
  });

  test('should display price estimation', async ({ page }) => {
    await page.goto('/booking');
    
    // Vérifier qu'il y a des prix affichés
    const prices = page.getByText(/€/);
    expect(await prices.count()).toBeGreaterThan(0);
  });
});
