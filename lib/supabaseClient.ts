import { createClient } from '@supabase/supabase-js'

// 1. Skapa variabler för URL och Key
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// 2. Exportera en flagga som berättar om konfigurationen lyckades
// App.tsx använder denna för att undvika att krascha om nycklar saknas.
export const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey;

if (!isSupabaseConfigured) {
  console.error('Supabase URLs saknas! Kontrollera Vercel Environment Variables.');
}

// 3. Exportera klienten (skapa den bara om konfigurerad)
export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : ({ auth: { onAuthStateChange: () => ({ subscription: { unsubscribe: () => {} } }) } } as any);
