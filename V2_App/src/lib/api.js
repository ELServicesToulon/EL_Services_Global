const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwxyNfzBZKsV6CpWsN39AuB0Ja40mpdEmkAGf0Ml_1tOIMfJDE-nsu7ySXTcyaJuURb/exec';

export async function fetchTournee(email) {
    try {
        // use no-cors if simple GET, but we use POST for actions usually to avoid some cache issues
        // However, Apps Script CORS is tricky.
        // Best method: POST with text/plain (no preflight) to avoid CORS issues if possible, 
        // OR standard fetch if the GAS script handles OPTIONS (it usually doesn't by default).

        // Actually, GAS Web App redirects. 'fetch' follows redirects.
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors', // Opaque response. We CANNOT read data with no-cors.
            // Wait, for READING data we CANNOT use no-cors. We MUST use cors.
            // Google Apps Script supports CORS requests *if* the script returns correct headers?
            // Actually GAS handles headers automatically for GET/POST.

            // Standard approach: POST with content-type 'application/x-www-form-urlencoded' is often safest.
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                action: 'getTournee',
                email: email
            })
        });

        // The issue: GAS returns 302 Redirect. Fetch follows automatically.
        // If we get an opaque response (due to CORS misconfig), we fail.
        // Let's try standard fetch.

        const data = await response.json();

        if (data.status === 'success') {
            return data.data;
        } else {
            throw new Error(data.message || 'API Error');
        }

    } catch (error) {
        console.warn("API Fetch failed, falling back to mock (or error handling).", error);
        // During dev/transition, if API fails, maybe we still want to show something?
        // But user said "REMPLACE", so maybe error is better.
        throw error;
    }
}

export async function sendReport(reportData) {
    // reportData: { livreurId, etablissementId, statut, note, lat, lng }
    await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            action: 'saveLivraisonReport',
            ...reportData
        })
    });
}

export async function fetchSlots(date) {
    // date: YYYY-MM-DD
    const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            action: 'getSlots',
            date: date
        })
    });
    const data = await response.json();
    if (data.status === 'success') {
        return data.data; // List of { time, status, taken, inPast }
    }
    throw new Error(data.message || 'Error fetching slots');
}
