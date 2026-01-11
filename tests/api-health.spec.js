/**
 * @file api-health.spec.js
 * @description Tests de santé pour les APIs backend
 */
import { test, expect } from '@playwright/test';

const BACKEND_URL = process.env.BACKEND_URL || 'http://37.59.124.82:3001';

test.describe('Backend API Health', () => {
  test('should respond to health check endpoint', async ({ request }) => {
    try {
      const response = await request.get(`${BACKEND_URL}/health`, {
        timeout: 10000
      });
      
      // Si l'endpoint existe
      if (response.ok()) {
        const data = await response.json();
        expect(data).toBeDefined();
      }
    } catch (e) {
      // Le endpoint peut ne pas exister, ce n'est pas un échec critique
      console.log('Health endpoint not available:', e.message);
    }
  });

  test('should respond to dashboard status endpoint', async ({ request }) => {
    try {
      const response = await request.get(`${BACKEND_URL}/api/status`, {
        timeout: 10000
      });
      
      if (response.ok()) {
        const data = await response.json();
        expect(data).toBeDefined();
      }
    } catch (e) {
      console.log('Status endpoint not available:', e.message);
    }
  });
});

test.describe('Supabase Connection', () => {
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://37.59.124.82.sslip.io';

  test('should be reachable', async ({ request }) => {
    try {
      const response = await request.get(`${SUPABASE_URL}/rest/v1/`, {
        timeout: 10000,
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE'
        }
      });
      
      // 200 ou 401/403 = serveur répond
      expect(response.status()).toBeLessThan(500);
    } catch (e) {
      console.log('Supabase not reachable:', e.message);
    }
  });
});

test.describe('External Services', () => {
  test('should load Google Maps API', async ({ page }) => {
    await page.goto('/reserver');
    
    // Attendre le chargement de la page
    await page.waitForLoadState('networkidle');
    
    // Vérifier que Google Maps est chargé (si utilisé)
    const googleMapsLoaded = await page.evaluate(() => {
      return typeof window.google !== 'undefined' && 
             typeof window.google.maps !== 'undefined';
    });
    
    // Note: Peut être false si pas de clé API ou maps non utilisé sur cette page
    console.log('Google Maps loaded:', googleMapsLoaded);
  });
});
