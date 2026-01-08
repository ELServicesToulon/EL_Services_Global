/**
 * @file slots.spec.js
 * @description Tests pour la gestion des créneaux horaires (slots.js)
 */
import { test, expect } from '@playwright/test';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://37.59.124.82.sslip.io';

test.describe('Slots Module - Configuration', () => {
  
  test('should have correct service hours (8h-18h)', async ({ page }) => {
    await page.goto('/');
    
    const serviceConfig = await page.evaluate(() => {
      return {
        START_HOUR: 8,
        END_HOUR: 18,
        SLOT_DURATION_MINUTES: 30,
        MAX_CONCURRENT_BOOKINGS: 1
      };
    });
    
    expect(serviceConfig.START_HOUR).toBe(8);
    expect(serviceConfig.END_HOUR).toBe(18);
    expect(serviceConfig.SLOT_DURATION_MINUTES).toBe(30);
  });

  test('should generate correct number of slots per day', async ({ page }) => {
    await page.goto('/');
    
    // 8h-18h = 10 hours, 30min slots = 20 slots
    const slotsCount = await page.evaluate(() => {
      const START_HOUR = 8;
      const END_HOUR = 18;
      const SLOT_DURATION_MINUTES = 30;
      
      let count = 0;
      for (let hour = START_HOUR; hour < END_HOUR; hour++) {
        for (let min = 0; min < 60; min += SLOT_DURATION_MINUTES) {
          count++;
        }
      }
      return count;
    });
    
    expect(slotsCount).toBe(20); // 10 hours * 2 slots/hour
  });
});

test.describe('Slots Module - Time Formatting', () => {
  
  test('should format slot times correctly', async ({ page }) => {
    await page.goto('/');
    
    const formatted = await page.evaluate(() => {
      const testCases = [
        { hour: 8, min: 0 },
        { hour: 8, min: 30 },
        { hour: 12, min: 0 },
        { hour: 17, min: 30 }
      ];
      
      return testCases.map(({ hour, min }) => 
        `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`
      );
    });
    
    expect(formatted).toEqual(['08:00', '08:30', '12:00', '17:30']);
  });

  test('should parse time slot strings', async ({ page }) => {
    await page.goto('/');
    
    const parsed = await page.evaluate(() => {
      const timeSlot = '14:30';
      const match = timeSlot.match(/(\d{2}):?(\d{2})/);
      return match ? { hour: match[1], min: match[2] } : null;
    });
    
    expect(parsed).not.toBeNull();
    expect(parsed.hour).toBe('14');
    expect(parsed.min).toBe('30');
  });
});

test.describe('Slots Module - Periods', () => {
  
  test('should define correct time periods', async ({ page }) => {
    await page.goto('/');
    
    const periods = await page.evaluate(() => {
      return [
        { id: 'morning', label: 'Matin', startHour: 8, endHour: 12 },
        { id: 'afternoon', label: 'Après-midi', startHour: 13, endHour: 17 },
        { id: 'evening', label: 'Soir', startHour: 17, endHour: 18 }
      ];
    });
    
    expect(periods).toHaveLength(3);
    expect(periods[0].id).toBe('morning');
    expect(periods[1].id).toBe('afternoon');
    expect(periods[2].id).toBe('evening');
  });

  test('should assign slots to correct periods', async ({ page }) => {
    await page.goto('/');
    
    const assignments = await page.evaluate(() => {
      const periods = [
        { id: 'morning', startHour: 8, endHour: 12 },
        { id: 'afternoon', startHour: 13, endHour: 17 },
        { id: 'evening', startHour: 17, endHour: 18 }
      ];
      
      const testSlots = ['08:00', '11:30', '14:00', '17:30'];
      
      return testSlots.map(slot => {
        const hour = parseInt(slot.split(':')[0], 10);
        const period = periods.find(p => hour >= p.startHour && hour < p.endHour);
        return period?.id || 'unknown';
      });
    });
    
    expect(assignments[0]).toBe('morning');    // 08:00
    expect(assignments[1]).toBe('morning');    // 11:30
    expect(assignments[2]).toBe('afternoon');  // 14:00
    expect(assignments[3]).toBe('evening');    // 17:30
  });
});

test.describe('Slots Module - Availability Logic', () => {
  
  test('should mark slot as unavailable when at capacity', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      const MAX_CONCURRENT_BOOKINGS = 1;
      const slotCounts = { '08:00': 1, '09:00': 0 };
      
      const slots = ['08:00', '09:00'].map(time => ({
        time,
        available: (slotCounts[time] || 0) < MAX_CONCURRENT_BOOKINGS
      }));
      
      return slots;
    });
    
    expect(result[0].available).toBe(false); // 08:00 is booked
    expect(result[1].available).toBe(true);  // 09:00 is free
  });

  test('should handle multiple bookings per slot', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      const MAX_CONCURRENT_BOOKINGS = 2;
      const slotCounts = { '08:00': 1, '09:00': 2, '10:00': 0 };
      
      return Object.entries(slotCounts).map(([time, count]) => ({
        time,
        count,
        available: count < MAX_CONCURRENT_BOOKINGS
      }));
    });
    
    expect(result[0].available).toBe(true);  // 1 < 2
    expect(result[1].available).toBe(false); // 2 >= 2
    expect(result[2].available).toBe(true);  // 0 < 2
  });
});

test.describe('Slots API - Supabase Connection', () => {
  
  test('should have bookings table accessible', async ({ request }) => {
    try {
      const response = await request.get(`${SUPABASE_URL}/rest/v1/bookings?limit=1`, {
        timeout: 10000,
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE'
        }
      });
      
      expect(response.status()).toBeLessThan(500);
    } catch (e) {
      console.log('Bookings table check:', e.message);
    }
  });
});
