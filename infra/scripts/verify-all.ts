import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const functionsRoot = join(process.cwd(), 'supabase', 'functions');

try {
  const dirs = readdirSync(functionsRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  const missing: string[] = [];

  for (const fn of dirs) {
    const entry = join(functionsRoot, fn, 'index.ts');
    try {
      statSync(entry);
      console.log(`\u2705 ${fn}`);
    } catch {
      console.error(`\u274c Missing ${fn}/index.ts`);
      missing.push(fn);
    }
  }

  if (missing.length) {
    console.error('Edge function verification failed');
    process.exit(1);
  }

  console.log('All edge functions verified');
} catch (err) {
  console.error('Verification encountered an error', err);
  process.exit(1);
}
