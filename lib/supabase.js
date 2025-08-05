import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables from a `.env` file
dotenv.config();

const supabaseUrl = 'https://tiqpsykeueqfajcerckd.supabase.co';
const { SUPABASE_KEY } = process.env;

if (!SUPABASE_KEY) {
  throw new Error('SUPABASE_KEY must be set in .env');
}

export const supabase = createClient(supabaseUrl, SUPABASE_KEY);
