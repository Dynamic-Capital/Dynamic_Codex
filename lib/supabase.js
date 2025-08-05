import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables from a `.env` file
dotenv.config();

const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set in .env');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
