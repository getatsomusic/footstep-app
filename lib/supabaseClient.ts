import { createClient } from '@supabase/supabase-js';

// Miljövariabler (som används av t.ex. Vercel)
// Dessa MÅSTE sättas i din Vercel-miljö/lokala .env-fil:
// REACT_APP_SUPABASE_URL (eller VITE_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_URL beroende på ditt ramverk)
// REACT_APP_SUPABASE_ANON_KEY (eller VITE_SUPABASE_ANON_KEY, NEXT_PUBLIC_SUPABASE_ANON_KEY)
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Logik för att kontrollera om konfigurationen är komplett
export const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey;

let supabase;

if (isSupabaseConfigured) {
    // Endast initiera klienten om konfigurationen är komplett
    supabase = createClient(supabaseUrl!, supabaseAnonKey!);
    console.log('Supabase-klienten initierad framgångsrikt.');
} else {
    // Lämna supabase som undefined om konfigurationen saknas
    console.error('VARNING: Supabase URL eller Anon Key saknas. Databasfunktionalitet kommer inte att fungera korrekt i Vercel-miljö.');
    // Vi kan skapa en dummy-klient eller logga ett fel, men lämnar den oinitierad är säkrast för att indikera att den inte är redo.
}

export { supabase };

// Denna funktion används av databasfunktionerna för att säkerställa att klienten är redo
export const checkSupabaseReady = (): boolean => {
    if (!isSupabaseConfigured || !supabase) {
        // I en Vercel/produktionsmiljö är det viktigt att dessa variabler är satta
        console.error('FEL: Supabase-klienten är inte konfigurerad. Kontrollera dina miljövariabler.');
        return false;
    }
    return true;
}
