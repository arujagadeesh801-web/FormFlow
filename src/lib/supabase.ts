import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  ''
).trim();

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('http') &&
    !supabaseUrl.includes('your-project.supabase.co')
  );
};

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    })
  : null;

/**
 * Helper to ping and verify connectivity to Supabase PostgreSQL
 */
export const checkSupabaseConnection = async (): Promise<{ ok: boolean; message: string }> => {
  if (!isSupabaseConfigured() || !supabase) {
    return { ok: false, message: 'Supabase credentials are not configured in .env' };
  }
  try {
    const { error } = await supabase.from('forms').select('id').limit(1);
    if (error) {
      return { ok: false, message: `Database error: ${error.message}` };
    }
    return { ok: true, message: 'Successfully connected to Supabase PostgreSQL database!' };
  } catch (err: any) {
    return { ok: false, message: err?.message || 'Network error connecting to Supabase' };
  }
};
