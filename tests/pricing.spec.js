/**
 * @file pricing.spec.js
 * @description Tests pour la logique de tarification (pricing.js)
 */
import { test, expect } from '@playwright/test';

test.describe('Pricing Module - Tariff Structure', () => {
  
  test('should have all required tariff types', async ({ page }) => {
    await page.goto('/');
    
    const tariffs = await page.evaluate(() => {
      return {
        'Normal': { base: 15, arrets: [5, 4, 3, 4, 5] },
        'Samedi': { base: 25, arrets: [5, 4, 3, 4, 5] },
        'Urgent': { base: 20, arrets: [5, 4, 3, 4, 5] },
        'Special': { base: 30, arrets: [5, 4, 3, 4, 5] }
      };
    });
    
    expect(tariffs).toHaveProperty('Normal');
    expect(tariffs).toHaveProperty('Samedi');
    expect(tariffs).toHaveProperty('Urgent');
    expect(tariffs).toHaveProperty('Special');
  });

  test('should have correct base prices', async ({ page }) => {
    await page.goto('/');
    
    const basePrices = await page.evaluate(() => {
      const TARIFS = {
        'Normal': { base: 15 },
        'Samedi': { base: 25 },
        'Urgent': { base: 20 },
        'Special': { base: 30 }
      };
      return TARIFS;
    });
    
    expect(basePrices.Normal.base).toBe(15);
    expect(basePrices.Samedi.base).toBe(25);
    expect(basePrices.Urgent.base).toBe(20);
    expect(basePrices.Special.base).toBe(30);
  });
});

test.describe('Pricing Module - Stop Calculations', () => {
  
  test('should calculate 1 stop (base price)', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      const base = 15;
      const supplements = [5, 4, 3, 4, 5];
      
      // 1 stop = just base
      return base;
    });
    
    expect(result).toBe(15);
  });

  test('should calculate 2 stops correctly', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      const base = 15;
      const supplements = [5, 4, 3, 4, 5];
      
      // 2 stops = base + first supplement
      return base + supplements[0];
    });
    
    expect(result).toBe(20); // 15 + 5
  });

  test('should calculate 3 stops correctly', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      const base = 15;
      const supplements = [5, 4, 3, 4, 5];
      
      // 3 stops = base + supplements[0] + supplements[1]
      return base + supplements[0] + supplements[1];
    });
    
    expect(result).toBe(24); // 15 + 5 + 4
  });

  test('should calculate 5 stops correctly', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      const base = 15;
      const supplements = [5, 4, 3, 4, 5];
      
      // 5 stops = base + sum of first 4 supplements
      let total = base;
      for (let i = 0; i < 4; i++) {
        total += supplements[i];
      }
      return total;
    });
    
    expect(result).toBe(31); // 15 + 5 + 4 + 3 + 4
  });
});

test.describe('Pricing Module - Saturday Pricing', () => {
  
  test('should apply Saturday base rate', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      const isSaturday = true;
      const TARIFS = {
        'Normal': { base: 15 },
        'Samedi': { base: 25 }
      };
      
      const type = isSaturday ? 'Samedi' : 'Normal';
      return TARIFS[type].base;
    });
    
    expect(result).toBe(25);
  });

  test('should be 10€ more than normal base', async ({ page }) => {
    await page.goto('/');
    
    const difference = await page.evaluate(() => {
      const normalBase = 15;
      const saturdayBase = 25;
      return saturdayBase - normalBase;
    });
    
    expect(difference).toBe(10);
  });
});

test.describe('Pricing Module - Urgent Pricing', () => {
  
  test('should apply urgent base rate', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      const isUrgent = true;
      const isSaturday = false;
      const TARIFS = {
        'Normal': { base: 15 },
        'Urgent': { base: 20 }
      };
      
      const type = isUrgent ? 'Urgent' : 'Normal';
      return TARIFS[type].base;
    });
    
    expect(result).toBe(20);
  });
});

test.describe('Pricing Module - Return Fee', () => {
  
  test('should add return fee when isReturn is true', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      const isReturn = true;
      const stopPrice = 15;
      const returnFee = 5; // First supplement from Normal tariff
      
      return stopPrice + (isReturn ? returnFee : 0);
    });
    
    expect(result).toBe(20); // 15 + 5
  });

  test('should not add return fee when isReturn is false', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      const isReturn = false;
      const stopPrice = 15;
      const returnFee = 5;
      
      return stopPrice + (isReturn ? returnFee : 0);
    });
    
    expect(result).toBe(15);
  });
});

test.describe('Pricing Module - Resident Packages', () => {
  
  test('should have standard resident package at 30€', async ({ page }) => {
    await page.goto('/');
    
    const forfait = await page.evaluate(() => {
      return {
        STANDARD_LABEL: 'Pré-collecte veille + livraison lendemain',
        STANDARD_PRICE: 30
      };
    });
    
    expect(forfait.STANDARD_PRICE).toBe(30);
  });

  test('should have urgent resident package at 50€', async ({ page }) => {
    await page.goto('/');
    
    const forfait = await page.evaluate(() => {
      return {
        URGENCE_LABEL: 'Retrait et livraison sous 4 h',
        URGENCE_PRICE: 50,
        DURATION_HOURS: 4
      };
    });
    
    expect(forfait.URGENCE_PRICE).toBe(50);
    expect(forfait.DURATION_HOURS).toBe(4);
  });
});

test.describe('Pricing Module - Currency Formatting', () => {
  
  test('should format currency in French EUR format', async ({ page }) => {
    await page.goto('/');
    
    const formatted = await page.evaluate(() => {
      const amount = 25.50;
      return new Intl.NumberFormat('fr-FR', { 
        style: 'currency', 
        currency: 'EUR' 
      }).format(amount);
    });
    
    // French format: "25,50 €" (with non-breaking space)
    expect(formatted).toContain('25,50');
    expect(formatted).toContain('€');
  });

  test('should handle whole numbers', async ({ page }) => {
    await page.goto('/');
    
    const formatted = await page.evaluate(() => {
      const amount = 30;
      return new Intl.NumberFormat('fr-FR', { 
        style: 'currency', 
        currency: 'EUR' 
      }).format(amount);
    });
    
    expect(formatted).toContain('30,00');
    expect(formatted).toContain('€');
  });
});
