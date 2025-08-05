import { supabase } from './lib/supabase.js';

async function main() {
  const { error: userError } = await supabase.from('bot_users').select('*').limit(1);
  const { error: cmdError } = await supabase.from('bot_commands').select('*').limit(1);

  if (userError) {
    console.error('Table "bot_users" not found:', userError.message);
  }
  if (cmdError) {
    console.error('Table "bot_commands" not found:', cmdError.message);
  }

  if (!userError && !cmdError) {
    console.log('Required tables exist.');
  }
}

main();
