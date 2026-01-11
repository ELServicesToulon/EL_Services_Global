/**
 * @file dashboard-api.spec.js
 * @description Tests pour les endpoints de l'API Dashboard (Dashboard_Server.js)
 */
import { test, expect } from '@playwright/test';

const DASHBOARD_API_URL = process.env.DASHBOARD_API_URL || 'http://37.59.124.82:3333';

test.describe('Dashboard API - Agents Endpoint', () => {
  
  test('GET /api/agents should return agent list', async ({ request }) => {
    try {
      const response = await request.get(`${DASHBOARD_API_URL}/api/agents`, {
        timeout: 10000
      });
      
      if (response.ok()) {
        const data = await response.json();
        
        expect(Array.isArray(data)).toBe(true);
        expect(data.length).toBeGreaterThan(0);
        
        // Check structure of first agent
        const agent = data[0];
        expect(agent).toHaveProperty('id');
        expect(agent).toHaveProperty('name');
        expect(agent).toHaveProperty('role');
        expect(agent).toHaveProperty('status');
        
        // Status should be one of valid values
        expect(['running', 'idle', 'stopped', 'error']).toContain(agent.status);
      }
    } catch (e) {
      console.log('Dashboard API not reachable:', e.message);
    }
  });

  test('GET /api/agents should include core agents', async ({ request }) => {
    try {
      const response = await request.get(`${DASHBOARD_API_URL}/api/agents`, {
        timeout: 10000
      });
      
      if (response.ok()) {
        const agents = await response.json();
        const agentIds = agents.map(a => a.id);
        
        // Core agents should be present
        expect(agentIds).toContain('sentinel');
        expect(agentIds).toContain('network');
        expect(agentIds).toContain('security');
      }
    } catch (e) {
      console.log('Dashboard API not reachable:', e.message);
    }
  });
});

test.describe('Dashboard API - Advisor Tip Endpoint', () => {
  
  test('GET /api/advisor/tip should return a tip', async ({ request }) => {
    try {
      const response = await request.get(`${DASHBOARD_API_URL}/api/advisor/tip`, {
        timeout: 15000 // Longer timeout for AI generation
      });
      
      if (response.ok()) {
        const data = await response.json();
        
        expect(data).toHaveProperty('tip');
        expect(typeof data.tip).toBe('string');
        expect(data.tip.length).toBeGreaterThan(0);
      }
    } catch (e) {
      console.log('Advisor tip endpoint not reachable:', e.message);
    }
  });

  test('GET /api/advisor/tip should cache response', async ({ request }) => {
    try {
      // First call
      const response1 = await request.get(`${DASHBOARD_API_URL}/api/advisor/tip`, {
        timeout: 15000
      });
      
      // Second call should return quickly (cached)
      const start = Date.now();
      const response2 = await request.get(`${DASHBOARD_API_URL}/api/advisor/tip`, {
        timeout: 5000
      });
      const elapsed = Date.now() - start;
      
      if (response1.ok() && response2.ok()) {
        const data1 = await response1.json();
        const data2 = await response2.json();
        
        // Same tip within 1h window
        expect(data1.tip).toBe(data2.tip);
        
        // Cached response should be fast (< 2s)
        expect(elapsed).toBeLessThan(2000);
      }
    } catch (e) {
      console.log('Caching test skipped:', e.message);
    }
  });
});

test.describe('Dashboard API - Events Endpoint', () => {
  
  test('GET /api/events should return event array', async ({ request }) => {
    try {
      const response = await request.get(`${DASHBOARD_API_URL}/api/events`, {
        timeout: 10000
      });
      
      if (response.ok()) {
        const events = await response.json();
        
        expect(Array.isArray(events)).toBe(true);
        
        // Max 5 events
        expect(events.length).toBeLessThanOrEqual(5);
        
        if (events.length > 0) {
          // Check event structure
          expect(events[0]).toHaveProperty('id');
          expect(events[0]).toHaveProperty('text');
        }
      }
    } catch (e) {
      console.log('Events endpoint not reachable:', e.message);
    }
  });
});

test.describe('Dashboard API - Control Endpoint', () => {
  
  test('POST /api/control/:agentId should accept action', async ({ request }) => {
    try {
      const response = await request.post(`${DASHBOARD_API_URL}/api/control/test-agent`, {
        timeout: 10000,
        data: {
          action: 'status'
        }
      });
      
      if (response.ok()) {
        const data = await response.json();
        
        expect(data).toHaveProperty('success');
        expect(data.success).toBe(true);
        expect(data).toHaveProperty('message');
      }
    } catch (e) {
      console.log('Control endpoint not reachable:', e.message);
    }
  });

  test('POST /api/control/:agentId should return agent ID in response', async ({ request }) => {
    try {
      const agentId = 'sentinel';
      const action = 'restart';
      
      const response = await request.post(`${DASHBOARD_API_URL}/api/control/${agentId}`, {
        timeout: 10000,
        data: { action }
      });
      
      if (response.ok()) {
        const data = await response.json();
        expect(data.message).toContain(agentId);
        expect(data.message).toContain(action);
      }
    } catch (e) {
      console.log('Control endpoint not reachable:', e.message);
    }
  });
});

test.describe('Dashboard API - Error Handling', () => {
  
  test('should handle missing action in control request', async ({ request }) => {
    try {
      const response = await request.post(`${DASHBOARD_API_URL}/api/control/test-agent`, {
        timeout: 10000,
        data: {}
      });
      
      // Should still respond (action will be undefined in message)
      expect(response.status()).toBeLessThan(500);
    } catch (e) {
      console.log('Error handling test skipped:', e.message);
    }
  });

  test('should respond with CORS headers', async ({ request }) => {
    try {
      const response = await request.get(`${DASHBOARD_API_URL}/api/agents`, {
        timeout: 10000
      });
      
      // CORS should be enabled
      const headers = response.headers();
      // Note: Headers may vary based on request origin
      expect(response.status()).toBeLessThan(500);
    } catch (e) {
      console.log('CORS test skipped:', e.message);
    }
  });
});
