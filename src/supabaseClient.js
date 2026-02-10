// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

// Correctly READ the variables defined in your .env.local file
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY


// --- ADD THIS LINE FOR DEBUGGING ---
if (import.meta.env.DEV) console.log("Supabase URL from env:", supabaseUrl);
// --- END DEBUGGING LINE ---

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
	auth: { persistSession: true, detectSessionInUrl: true }
});