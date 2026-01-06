import { supabase } from './supabaseClient'

/**
 * Slot Management for V2
 * Checks availability based on existing bookings
 */

// Service configuration
const SERVICE_CONFIG = {
    START_HOUR: 8,
    END_HOUR: 18,
    SLOT_DURATION_MINUTES: 30,
    MAX_CONCURRENT_BOOKINGS: 1 // For now, 1 driver = 1 slot at a time
}

// Generate all possible slots for a day
export function generateDaySlots(date) {
    const slots = []
    const d = new Date(date)
    
    for (let hour = SERVICE_CONFIG.START_HOUR; hour < SERVICE_CONFIG.END_HOUR; hour++) {
        for (let min = 0; min < 60; min += SERVICE_CONFIG.SLOT_DURATION_MINUTES) {
            const slotTime = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`
            slots.push({
                time: slotTime,
                label: `${slotTime}`,
                available: true
            })
        }
    }
    return slots
}

// Fetch existing bookings for a date and mark slots as taken
export async function getAvailableSlotsForDate(dateString) {
    const allSlots = generateDaySlots(dateString)
    
    // Fetch bookings for this date
    const { data: bookings, error } = await supabase
        .from('bookings')
        .select('time_slot, stops_count')
        .eq('scheduled_date', dateString)
        .neq('status', 'cancelled')
    
    if (error) {
        console.error('Error fetching bookings:', error)
        return allSlots // Return all as available on error
    }
    
    // Count bookings per slot
    const slotCounts = {}
    bookings?.forEach(b => {
        // Extract start time from slot (e.g., "08:00" from "Matin (08h - 12h)")
        const match = b.time_slot?.match(/(\d{2}):?(\d{2})/)
        if (match) {
            const key = `${match[1]}:${match[2]}`
            slotCounts[key] = (slotCounts[key] || 0) + 1
        }
    })
    
    // Mark slots as unavailable if at capacity
    return allSlots.map(slot => ({
        ...slot,
        available: (slotCounts[slot.time] || 0) < SERVICE_CONFIG.MAX_CONCURRENT_BOOKINGS
    }))
}

// Check if a specific slot is available
export async function isSlotAvailable(dateString, timeSlot) {
    const slots = await getAvailableSlotsForDate(dateString)
    const slot = slots.find(s => s.time === timeSlot)
    return slot?.available ?? false
}

// Get slot periods (Morning, Afternoon, Evening) with availability
export async function getSlotPeriodsForDate(dateString) {
    const slots = await getAvailableSlotsForDate(dateString)
    
    const periods = [
        {
            id: 'morning',
            label: 'Matin',
            range: '08h - 12h',
            startHour: 8,
            endHour: 12,
            slots: []
        },
        {
            id: 'afternoon', 
            label: 'Après-midi',
            range: '13h - 17h',
            startHour: 13,
            endHour: 17,
            slots: []
        },
        {
            id: 'evening',
            label: 'Soir',
            range: '17h - 18h',
            startHour: 17,
            endHour: 18,
            slots: []
        }
    ]
    
    slots.forEach(slot => {
        const hour = parseInt(slot.time.split(':')[0], 10)
        const period = periods.find(p => hour >= p.startHour && hour < p.endHour)
        if (period) {
            period.slots.push(slot)
        }
    })
    
    // A period is available if at least one slot is available
    return periods.map(p => ({
        ...p,
        available: p.slots.some(s => s.available),
        slotsAvailable: p.slots.filter(s => s.available).length,
        slotsTotal: p.slots.length
    }))
}
