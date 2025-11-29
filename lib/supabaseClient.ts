import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey;

if (!isSupabaseConfigured) {
  console.error('Supabase konfiguration saknas!');
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? 'finns' : 'SAKNAS');
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'finns' : 'SAKNAS');
}

export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : ({ auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }) } } as any);
