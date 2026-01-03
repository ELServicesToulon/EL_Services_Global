import { useState, useEffect } from 'react';
import { fetchTournee, sendReport } from '../lib/api';
// Fallback import if API fails completely during dev, but we aim for API.
import { MOCK_TOUR } from '../lib/mockData';

const STORAGE_KEY = 'v2_tour_data';

export function useTour() {
    const [tour, setTour] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Attempt to load from API
        // User needs to be identified. For now, hardcode or get from localStorage 'user_email' 
        // In real login flow, Login.jsx sets this.
        // Let's assume a default checks or previous login.

        // For prototype V2, we might just ask for email if not found, or use a default "livreur@mediconvoi.fr"
        const userEmail = "livreur@mediconvoi.fr";

        const loadData = async () => {
            try {
                const apiData = await fetchTournee(userEmail);
                setTour(apiData);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(apiData));
            } catch (err) {
                console.error("Failed to load tour from API", err);
                // Fallback to cache if available
                const stored = localStorage.getItem(STORAGE_KEY);
                if (stored) {
                    setTour(JSON.parse(stored));
                } else {
                    // Last resort: Mock
                    // setError(err); // Or use mock
                    setTour(MOCK_TOUR); // Remove this line if we want strict mode
                }
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    const updateStop = async (stopId, updates) => {
        if (!tour) return;

        // 1. Optimistic UI update
        const newStops = tour.stops.map(stop =>
            stop.id === stopId ? { ...stop, ...updates } : stop
        );

        // Auto-update stop completion time
        if (updates.status === 'completed') {
            const stopIndex = newStops.findIndex(s => s.id === stopId);
            if (stopIndex !== -1 && !newStops[stopIndex].completedAt) {
                newStops[stopIndex].completedAt = new Date().toISOString();
            }
        }

        const newTour = { ...tour, stops: newStops };
        setTour(newTour);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newTour)); // Local sync

        // 2. Send to API (Fire and forget, or queue)
        try {
            const stop = newStops.find(s => s.id === stopId);
            await sendReport({
                livreurId: tour.courierName,
                etablissementId: stop.name, // or stop.id
                statut: updates.status === 'issue' ? 'ANOMALIE' : updates.status === 'completed' ? 'RAS' : 'NOTE',
                note: updates.notes,
                lat: 0, // Todo: get real GPS
                lng: 0
            });
        } catch (e) {
            console.error("Failed to sync report to API", e);
            // Implement offline queue if needed
        }
    };

    const resetTour = () => {
        // Clear cache
        localStorage.removeItem(STORAGE_KEY);
        setTour(null);
        setLoading(true);
        window.location.reload();
    }

    return { tour, loading, updateStop, resetTour, error };
}
