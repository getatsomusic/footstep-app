import { createClient } from '@supabase/supabase-js'

// Vite använder import.meta.env istället för process.env
// Vi kollar efter båda varianterna för säkerhets skull
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URLs saknas! Kontrollera Vercel Environment Variables.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
