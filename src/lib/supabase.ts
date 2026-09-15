import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error(
    'VITE_SUPABASE_URL is missing. Add it to your .env file.'
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    'VITE_SUPABASE_ANON_KEY is missing. Add it to your .env file.'
  );
}

export const isSupabaseConfigured = (): boolean => Boolean(supabaseUrl && supabaseAnonKey);
export const getSupabaseUrl = (): string => supabaseUrl;

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },

    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);