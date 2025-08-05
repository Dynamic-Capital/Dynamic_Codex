import { supabase } from './lib/supabase.js';

export async function testSupabaseConnection() {
  const { error: userError } = await supabase.from('bot_users').select('id').limit(1);
  if (userError) {
    console.error('bot_users table check failed:', userError.message);
  }

  const { error: cmdError } = await supabase.from('bot_commands').select('command').limit(1);
  if (cmdError) {
    console.error('bot_commands table check failed:', cmdError.message);
  }

  if (!userError && !cmdError) {
    console.log('Supabase connection successful.');
    return true;
  }
  return false;
}

if (import.meta.main) {
  testSupabaseConnection();
}
