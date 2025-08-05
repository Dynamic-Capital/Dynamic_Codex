import { supabase } from './lib/supabase.js';

async function main() {
  const { data, error } = await supabase.from('bot_users').select('*').limit(1);

  if (error) {
    console.error('Table "bot_users" not found:', error.message);
    return;
  }

  console.log('Table "bot_users" exists.');
}

main();
