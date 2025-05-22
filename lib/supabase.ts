// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// Ensure environment variables are set
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables!');
  // In a production app, you might want to throw an error or handle this more gracefully.
  // For now, we'll just log and proceed, but API calls will fail.
}

// Create a single Supabase client for convenience
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');