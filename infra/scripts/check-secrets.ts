// BEGIN SECRETS_CHECK
import fs from 'fs';

interface ManifestKey {
  name: string;
  scope: string[];
  envs: string[];
  required: boolean;
  default?: string;
}

const manifestPath = new URL('../secrets/manifest.json', import.meta.url);
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as {
  environments: string[];
  keys: ManifestKey[];
};

const args = process.argv.slice(2);
const envArg = args.find((a) => a.startsWith('--env='))?.split('=')[1] ?? 'production';

const missing: ManifestKey[] = [];

for (const key of manifest.keys) {
  if (!key.envs.includes(envArg)) continue;
  if (key.required && !process.env[key.name]) {
    missing.push(key);
  }
}

if (missing.length) {
  console.error(`Missing required secrets for ${envArg}:`);
  for (const key of missing) {
    console.error(`- ${key.name}`);
    if (key.scope.includes('github')) {
      console.error(`  GitHub: add secret ${key.name}`);
    }
    if (key.scope.includes('supabase')) {
      console.error(`  Supabase: supabase secrets set ${key.name}="..."`);
    }
    if (key.scope.includes('codex')) {
      console.error('  Codex: please add in Codex Env panel');
    }
  }
  process.exit(1);
} else {
  console.log(`All required secrets present for ${envArg}.`);
}
// END SECRETS_CHECK
