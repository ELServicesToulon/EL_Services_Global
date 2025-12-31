import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let supabaseInstance = null

try {
    if (supabaseUrl && supabaseAnonKey) {
        supabaseInstance = createClient(supabaseUrl, supabaseAnonKey)
    } else {
        console.warn('Supabase keys missing. Auth details might be unavailable.')
    }
} catch (error) {
    console.warn('Failed to initialize Supabase client:', error)
}

// Fallback mock if initialization failed
export const supabase = supabaseInstance || {
    auth: {
        getSession: () => Promise.resolve({ data: { session: null } }),
        signInWithOtp: () => Promise.resolve({ error: { message: 'Supabase not configured' } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } })
    }
}
