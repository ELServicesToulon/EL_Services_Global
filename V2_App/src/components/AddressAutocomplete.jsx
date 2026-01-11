import { useState, useEffect, useRef } from 'react'
import { searchPlaces, geocodeAddress } from '../lib/googlemaps'
import { MapPin, Loader2 } from 'lucide-react'

/**
 * AddressAutocomplete Component
 * 
 * Uses Google Maps Places API for address suggestions
 * Falls back to French Government API (api-adresse.data.gouv.fr) if Google not configured
 */
export default function AddressAutocomplete({ 
    value = '', 
    onChange, 
    onSelect,
    placeholder = 'Entrez une adresse...',
    className = ''
}) {
    const [query, setQuery] = useState(value)
    const [suggestions, setSuggestions] = useState([])
    const [loading, setLoading] = useState(false)
    const [showSuggestions, setShowSuggestions] = useState(false)
    const debounceRef = useRef(null)
    const wrapperRef = useRef(null)

    // Sync with external value
    useEffect(() => {
        setQuery(value)
    }, [value])

    // Close suggestions on outside click
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setShowSuggestions(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleInputChange = (e) => {
        const val = e.target.value
        setQuery(val)
        onChange?.(val)

        // Debounce search
        if (debounceRef.current) clearTimeout(debounceRef.current)
        
        if (val.length < 3) {
            setSuggestions([])
            setShowSuggestions(false)
            return
        }

        debounceRef.current = setTimeout(async () => {
            setLoading(true)
            
            // Try Google Maps first, fallback to French Gov API
            let results = await searchPlaces(val, 'address')
            
            if (!results || results.length === 0) {
                // Fallback to api-adresse.data.gouv.fr
                results = await searchFrenchGovAPI(val)
            }

            setSuggestions(results)
            setShowSuggestions(results.length > 0)
            setLoading(false)
        }, 300)
    }

    const handleSelect = async (suggestion) => {
        const address = suggestion.address || suggestion.name
        setQuery(address)
        setShowSuggestions(false)
        onChange?.(address)

        // Get full geocode data if coordinates not present
        let coords = { lat: suggestion.lat, lng: suggestion.lng }
        if (!coords.lat && suggestion.placeId) {
            const geocoded = await geocodeAddress(address)
            if (geocoded) {
                coords = { lat: geocoded.lat, lng: geocoded.lng }
            }
        }

        onSelect?.({
            address,
            placeId: suggestion.placeId,
            ...coords
        })
    }

    return (
        <div ref={wrapperRef} className={`relative ${className}`}>
            <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                    type="text"
                    value={query}
                    onChange={handleInputChange}
                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                    placeholder={placeholder}
                    className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                {loading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
                )}
            </div>

            {showSuggestions && suggestions.length > 0 && (
                <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-auto">
                    {suggestions.map((suggestion, index) => (
                        <li
                            key={suggestion.placeId || index}
                            onClick={() => handleSelect(suggestion)}
                            className="px-4 py-3 hover:bg-blue-50 cursor-pointer text-sm border-b border-gray-100 last:border-b-0 transition-colors"
                        >
                            <div className="font-medium text-gray-800">{suggestion.name || suggestion.address}</div>
                            {suggestion.name && suggestion.address && (
                                <div className="text-xs text-gray-500 mt-0.5">{suggestion.address}</div>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}

/**
 * Fallback: French Government Address API
 */
async function searchFrenchGovAPI(query) {
    try {
        const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5`
        const response = await fetch(url)
        const data = await response.json()

        return (data.features || []).map(f => ({
            name: f.properties.label,
            address: f.properties.label,
            lat: f.geometry.coordinates[1],
            lng: f.geometry.coordinates[0],
            placeId: f.properties.id
        }))
    } catch (error) {
        console.error('French Gov API error:', error)
        return []
    }
}
