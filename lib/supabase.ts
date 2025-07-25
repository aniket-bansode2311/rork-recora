import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://nwwymvufvcwcqpzftxzs.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53d3ltdnVmdmN3Y3FwemZ0eHpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxNzkxMjUsImV4cCI6MjA2ODc1NTEyNX0.mjlWwH3QwBOJt_K2UzZyeRbKbUbi2wGIdWqT-EACmHU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});