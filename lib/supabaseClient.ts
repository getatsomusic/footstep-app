import { createClient } from '@supabase/supabase-js'

// Hämta från Vercel Environment Variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Kontrollera om konfigurationen är korrekt
export const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey;

if (!isSupabaseConfigured) {
  console.error('Supabase URLs saknas! Kontrollera Vercel Environment Variables.');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'finns' : 'SAKNAS');
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'finns' : 'SAKNAS');
}

// Skapa Supabase-klienten
export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : ({ auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }) } } as any);
