import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const supabaseUrl = 'https://poipkkidkdlqfobtdaqw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvaXBra2lka2RscWZvYnRkYXF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0NzA4MjAsImV4cCI6MjA3MDA0NjgyMH0.P45tNfn0ypSHeL1HjFj4CkBKijaPi1zqYhIBCn5ex4Q';

export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});