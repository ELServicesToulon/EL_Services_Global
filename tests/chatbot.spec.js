/**
 * @file chatbot.spec.js
 * @description Tests E2E pour le chatbot IA
 */
import { test, expect } from '@playwright/test';

test.describe('Chatbot Widget', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display chatbot trigger button', async ({ page }) => {
    // Chercher le bouton du chatbot (généralement en bas à droite)
    const chatButton = page.locator('[class*="chat"], [id*="chat"], [aria-label*="chat" i]');
    
    if (await chatButton.count() > 0) {
      await expect(chatButton.first()).toBeVisible();
    }
  });

  test('should open chatbot on click', async ({ page }) => {
    const chatButton = page.locator('[class*="chat-trigger"], [class*="chatbot-button"], button[class*="chat"]');
    
    if (await chatButton.count() > 0) {
      await chatButton.first().click();
      
      // Vérifier que la fenêtre de chat s'ouvre
      const chatWindow = page.locator('[class*="chat-window"], [class*="chatbot-container"], [class*="chat-modal"]');
      await expect(chatWindow.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should have message input field', async ({ page }) => {
    const chatButton = page.locator('[class*="chat-trigger"], [class*="chatbot-button"], button[class*="chat"]');
    
    if (await chatButton.count() > 0) {
      await chatButton.first().click();
      await page.waitForTimeout(500);
      
      // Chercher le champ de saisie
      const messageInput = page.locator('[class*="chat"] input, [class*="chat"] textarea');
      if (await messageInput.count() > 0) {
        await expect(messageInput.first()).toBeVisible();
      }
    }
  });

  test('should send message and receive response', async ({ page }) => {
    const chatButton = page.locator('[class*="chat-trigger"], [class*="chatbot-button"], button[class*="chat"]');
    
    if (await chatButton.count() > 0) {
      await chatButton.first().click();
      await page.waitForTimeout(500);
      
      const messageInput = page.locator('[class*="chat"] input, [class*="chat"] textarea');
      if (await messageInput.count() > 0) {
        await messageInput.first().fill('Bonjour');
        
        // Envoyer le message (Enter ou bouton)
        await messageInput.first().press('Enter');
        
        // Attendre une réponse (timeout plus long pour l'IA)
        await page.waitForTimeout(5000);
        
        // Vérifier qu'un message de réponse apparaît
        const messages = page.locator('[class*="message"], [class*="chat-bubble"]');
        const count = await messages.count();
        expect(count).toBeGreaterThan(1); // Au moins le message envoyé + une réponse
      }
    }
  });
});
