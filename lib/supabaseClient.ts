
import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Check if configured
export const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey;

// Fallback values to prevent crash during client initialization if env vars are missing.
// We use a valid-format URL to satisfy the constructor validation, but request will fail if used.
const urlToUse = supabaseUrl || 'https://placeholder.supabase.co';
const keyToUse = supabaseAnonKey || 'placeholder-key';

if (!isSupabaseConfigured) {
  console.warn('Supabase Environment variables are missing. Auth and DB features will not work.');
}

export const supabase = createClient(urlToUse, keyToUse);
