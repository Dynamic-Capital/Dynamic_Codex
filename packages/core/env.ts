// BEGIN ENV-GUARD
import { z } from 'zod';

const schema = z.object({
  SUPABASE_URL: z.string().url(),
  TELEGRAM_BOT_TOKEN: z.string(),
  VIP_CHAT_ID: z.string(),
  WEBAPP_URL: z.string().url(),
  BSC_RPC_URL: z.string(),
  TRON_API_URL: z.string(),
  USDT_BSC_CONTRACT: z.string(),
  USDT_TRON_CONTRACT: z.string(),
  MIN_CONF_BSC: z.string(),
  MIN_CONF_TRON: z.string(),
});

export type Env = z.infer<typeof schema>;
let cached: Env | null = null;

export function getEnv(): Env {
  if (!cached) {
    const raw = typeof Deno !== 'undefined' ? Deno.env.toObject() : process.env;
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      const missing = parsed.error.issues
        .map((i) => i.path.join('.'))
        .join(', ');
      throw new Error(`Missing or invalid env: ${missing}`);
    }
    cached = parsed.data;
  }
  return cached;
}
// END ENV-GUARD
