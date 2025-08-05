import { supabase } from './lib/supabase.js';

export async function testSupabaseConnection() {
  const { error } = await supabase.from('bot_users').select('id').limit(1);
  if (error) {
    console.error('Supabase connection failed:', error.message);
    return false;
  }
  console.log('Supabase connection successful.');
  return true;
}

if (import.meta.main) {
  testSupabaseConnection();
}
