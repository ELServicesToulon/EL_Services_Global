import { supabase } from './supabaseClient';
import { format, isBefore, parseISO, startOfDay, addMinutes } from 'date-fns';

// Configuration du service
const SERVICE_CONFIG = {
    START_HOUR: 8,
    END_HOUR: 18,
    SLOT_DURATION_MINUTES: 30, // 30 minutes
    MAX_CONCURRENT_BOOKINGS: 1 // 1 livreur
};

/**
 * Récupère les tournées pour un livreur donné (email).
 * @param {string} email
 */
export async function fetchTournee(email) {
    // Migration Supabase: On cherche les réservations assignées à ce livreur ou globales
    // Pour l'instant, on liste les bookings du jour pour l'admin/livreur
    try {
        const today = format(new Date(), 'yyyy-MM-dd');
        
        // TODO: Adapter selon le modèle de données réel (table 'tours' ou 'bookings')
        const { data, error } = await supabase
            .from('bookings')
            .select(`
                *,
                client:users(email, user_metadata)
            `)
            .eq('scheduled_date', today)
            .neq('status', 'cancelled')
            .order('time_slot', { ascending: true });

        if (error) throw error;

        return {
            date: today,
            stops: data || []
        };
    } catch (error) {
        console.error("Erreur fetchTournee:", error);
        throw error;
    }
}

/**
 * Envoie un rapport de livraison.
 * @param {object} reportData 
 */
export async function sendReport(reportData) {
    try {
        const { error } = await supabase
            .from('delivery_reports')
            .insert([reportData]);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error("Erreur sendReport:", error);
        // Fallback si la table n'existe pas encore, on log juste
        return { success: false, error: error.message };
    }
}

/**
 * Récupère les créneaux disponibles pour une date donnée.
 * Remplace l'appel Apps Script 'getSlots'.
 * @param {string} date (YYYY-MM-DD)
 */
export async function fetchSlots(date) {
    try {
        // 1. Générer les créneaux théoriques
        const allSlots = [];
        for (let h = SERVICE_CONFIG.START_HOUR; h < SERVICE_CONFIG.END_HOUR; h++) {
            for (let m = 0; m < 60; m += SERVICE_CONFIG.SLOT_DURATION_MINUTES) {
                const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                allSlots.push(time);
            }
        }

        // 2. Récupérer les réservations existantes pour cette date
        const { data: bookings, error } = await supabase
            .from('bookings')
            .select('time_slot')
            .eq('scheduled_date', date)
            .neq('status', 'cancelled');

        if (error) throw error;

        // 3. Compter les occupations
        const takenMap = {};
        bookings?.forEach(b => {
            // b.time_slot peut être "08:30"
            if (b.time_slot) takenMap[b.time_slot] = (takenMap[b.time_slot] || 0) + 1;
        });

        // 4. Formater comme attendu par le frontend
        // Format attendu: { time: "08:00", status: "open"|"closed", taken: bool, inPast: bool }
        const now = new Date();
        const checkDate = parseISO(date);
        const isToday = format(now, 'yyyy-MM-dd') === date;

        return allSlots.map(time => {
            const [h, m] = time.split(':').map(Number);
            const slotDate = new Date(checkDate);
            slotDate.setHours(h, m, 0, 0);

            const isPast = isToday && isBefore(slotDate, now);
            const count = takenMap[time] || 0;
            const isTaken = count >= SERVICE_CONFIG.MAX_CONCURRENT_BOOKINGS;

            return {
                time: time,
                status: (isTaken || isPast) ? 'closed' : 'open',
                taken: isTaken,
                inPast: isPast
            };
        });

    } catch (error) {
        console.error("Erreur fetchSlots Supabase:", error);
        throw new Error("Impossible de charger les créneaux (Supabase).");
    }
}
