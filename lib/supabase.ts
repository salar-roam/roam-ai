// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// Ensure environment variables are set
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// --- ADD THESE DEBUGGING LINES ---
console.log('DEBUG (lib/supabase.ts): Checking environment variables...');
console.log(`DEBUG (lib/supabase.ts): SUPABASE_URL is ${supabaseUrl ? 'PRESENT' : 'MISSING'}. Value starts with: ${supabaseUrl ? supabaseUrl.substring(0, 20) + '...' : 'N/A'}`);
console.log(`DEBUG (lib/supabase.ts): SUPABASE_ANON_KEY is ${supabaseAnonKey ? 'PRESENT' : 'MISSING'}. Value starts with: ${supabaseAnonKey ? supabaseAnonKey.substring(0, 20) + '...' : 'N/A'}`);
// --- END DEBUGGING LINES ---

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables!');
  // IMPORTANT: For debugging, we are letting it proceed to throw the error from createClient
  // In a production scenario, you might want to throw here more gracefully.
}

// Create a single Supabase client for convenience
// The `|| ''` here will cause `createClient` to throw if the values are missing,
// which is what we are currently observing.
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');