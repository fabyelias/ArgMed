import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bfhtmtnazzwthragaqfl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmaHRtdG5henp3dGhyYWdhcWZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNDMxNzEsImV4cCI6MjA3OTYxOTE3MX0.5oQtFmPorI8fYrXTKCABPri4QE4hE6eMG73Apd0b8wE';

const customSupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export default customSupabaseClient;

export { 
    customSupabaseClient,
    customSupabaseClient as supabase,
};
