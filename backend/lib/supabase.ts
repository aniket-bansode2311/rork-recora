import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://nwwymvufvcwcqpzftxzs.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53d3ltdnVmdmN3Y3FwemZ0eHpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxNzkxMjUsImV4cCI6MjA2ODc1NTEyNX0.mjlWwH3QwBOJt_K2UzZyeRbKbUbi2wGIdWqT-EACmHU';

if (!supabaseUrl) {
  throw new Error('Missing SUPABASE_URL or EXPO_PUBLIC_SUPABASE_URL environment variable');
}

if (!supabaseServiceKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
}

// Use service role key for backend operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true
  },
  db: {
    ssl: {
      // Required for all platforms
      rejectUnauthorized: false
    },
});