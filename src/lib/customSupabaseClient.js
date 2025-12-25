import { createClient } from '@supabase/supabase-js';

// Nuevo proyecto Supabase - ArgMed
// Project ID: msnppinpethxfxskfgsv
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://msnppinpethxfxskfgsv.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY_HERE';

if (!supabaseAnonKey || supabaseAnonKey === 'YOUR_ANON_KEY_HERE') {
  console.error('❌ Supabase Anon Key no configurada. Agrega VITE_SUPABASE_ANON_KEY en .env');
}

const customSupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export default customSupabaseClient;

export { 
    customSupabaseClient,
    customSupabaseClient as supabase,
};
