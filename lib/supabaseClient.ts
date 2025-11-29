import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Använder Vercel/React-stil miljövariabler.
// NOTERA: Dessa måste sättas i din Vercel-dashboard.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_PUBLIC_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLIC_ANON_KEY;

let supabase: SupabaseClient | null = null;
let isSupabaseConfigured = false;

if (supabaseUrl && supabaseAnonKey) {
    try {
        supabase = createClient(supabaseUrl, supabaseAnonKey);
        isSupabaseConfigured = true;
        console.log("Supabase klient initialiserad.");
    } catch (error) {
        console.error("Kunde inte initialisera Supabase-klienten:", error);
    }
} else {
    console.warn("Supabase miljövariabler saknas. Databasfunktionalitet är inaktiverad.");
}

export { supabase, isSupabaseConfigured };
