// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

// Correctly READ the variables defined in your .env.local file
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
	auth: { persistSession: true, detectSessionInUrl: true }
});