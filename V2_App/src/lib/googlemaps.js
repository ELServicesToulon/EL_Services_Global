/**
 * Google Maps API Integration for V2
 * 
 * Features:
 * - Geocoding (address → coordinates)
 * - Reverse geocoding (coordinates → address)
 * - Places Autocomplete
 * - Distance calculation
 */

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

/**
 * Geocode an address to coordinates
 * @param {string} address - Full address string
 * @returns {Promise<{lat: number, lng: number, formatted: string}|null>}
 */
export async function geocodeAddress(address) {
    if (!GOOGLE_MAPS_API_KEY) {
        console.warn('Google Maps API key not configured');
        return null;
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}&region=fr`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 'OK' && data.results.length > 0) {
            const result = data.results[0];
            return {
                lat: result.geometry.location.lat,
                lng: result.geometry.location.lng,
                formatted: result.formatted_address,
                placeId: result.place_id
            };
        }
        
        console.warn('Geocoding failed:', data.status);
        return null;
    } catch (error) {
        console.error('Geocoding error:', error);
        return null;
    }
}

/**
 * Reverse geocode coordinates to address
 * @param {number} lat 
 * @param {number} lng 
 * @returns {Promise<string|null>}
 */
export async function reverseGeocode(lat, lng) {
    if (!GOOGLE_MAPS_API_KEY) return null;

    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}&language=fr`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 'OK' && data.results.length > 0) {
            return data.results[0].formatted_address;
        }
        return null;
    } catch (error) {
        console.error('Reverse geocoding error:', error);
        return null;
    }
}

/**
 * Search places (autocomplete)
 * @param {string} query - Search query
 * @param {string} types - Place types (e.g., 'establishment', 'address')
 * @returns {Promise<Array>}
 */
export async function searchPlaces(query, types = 'establishment') {
    if (!GOOGLE_MAPS_API_KEY || !query || query.length < 2) return [];

    // Note: Places Autocomplete requires the Places library loaded via script
    // For REST API, we use the Place Search endpoint
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&type=${types}&region=fr&key=${GOOGLE_MAPS_API_KEY}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 'OK') {
            return data.results.map(place => ({
                placeId: place.place_id,
                name: place.name,
                address: place.formatted_address,
                lat: place.geometry?.location?.lat,
                lng: place.geometry?.location?.lng,
                types: place.types
            }));
        }
        return [];
    } catch (error) {
        console.error('Place search error:', error);
        return [];
    }
}

/**
 * Calculate distance between two points (Haversine formula)
 * @param {number} lat1 
 * @param {number} lng1 
 * @param {number} lat2 
 * @param {number} lng2 
 * @returns {number} Distance in kilometers
 */
export function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRad(deg) {
    return deg * (Math.PI / 180);
}

/**
 * Get distance matrix between origin and destinations (driving)
 * @param {string} origin - Origin address or lat,lng
 * @param {string[]} destinations - Array of destination addresses
 * @returns {Promise<Array<{distance: number, duration: number}>>}
 */
export async function getDistanceMatrix(origin, destinations) {
    if (!GOOGLE_MAPS_API_KEY) return [];

    const destinationsParam = destinations.map(d => encodeURIComponent(d)).join('|');
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${destinationsParam}&mode=driving&language=fr&key=${GOOGLE_MAPS_API_KEY}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 'OK' && data.rows.length > 0) {
            return data.rows[0].elements.map(el => ({
                distance: el.distance?.value / 1000 || 0, // km
                duration: el.duration?.value / 60 || 0,   // minutes
                status: el.status
            }));
        }
        return [];
    } catch (error) {
        console.error('Distance matrix error:', error);
        return [];
    }
}

/**
 * Check if API key is configured
 */
export function isConfigured() {
    return Boolean(GOOGLE_MAPS_API_KEY);
}
