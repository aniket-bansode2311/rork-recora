import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://nwwymvufvcwcqpzftxzs.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53d3ltdnVmdmN3Y3FwemZ0eHpzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzE3OTEyNSwiZXhwIjoyMDY4NzU1MTI1fQ.Yx8-VdCKRHjGHJNmBcKNRWBKzBvJhPJvJgMhJhJhJhJ';

if (!supabaseUrl) {
  console.error('Missing SUPABASE_URL or EXPO_PUBLIC_SUPABASE_URL environment variable');
}

if (!supabaseServiceKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
}

// Use service role key for backend operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Test connection function
export const testConnection = async () => {
  try {
    const { data, error } = await supabaseAdmin
      .from('recordings')
      .select('count')
      .limit(1);
    
    if (error && !error.message.includes('relation "recordings" does not exist')) {
      throw error;
    }
    
    console.log('Supabase connection successful');
    return true;
  } catch (error) {
    console.error('Supabase connection failed:', error);
    return false;
  }
};