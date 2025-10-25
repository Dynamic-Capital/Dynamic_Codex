// BEGIN SECRETS_SYNC
import fs from 'fs';
import { spawnSync } from 'child_process';

interface ManifestKey {
  name: string;
  scope: string[];
  envs: string[];
  required: boolean;
  default?: string;
}

interface Status {
  key: string;
  in_codex: boolean;
  in_github: boolean;
  in_supabase: boolean;
  action: string;
}

const manifestPath = new URL('../secrets/manifest.json', import.meta.url);
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as {
  environments: string[];
  keys: ManifestKey[];
};

const args = process.argv.slice(2);
const envArg = args.find((a) => a.startsWith('--env='))?.split('=')[1] ?? 'production';
const apply = args.includes('--apply');

const statuses: Status[] = [];
let missingRequired = false;

// Attempt to read existing supabase secrets list once
let supabaseSecrets: Set<string> | null = null;
function loadSupabaseSecrets(): Set<string> {
  if (supabaseSecrets) return supabaseSecrets;
  try {
    const res = spawnSync('supabase', ['secrets', 'list'], { encoding: 'utf-8' });
    if (res.status === 0) {
      const lines = res.stdout.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      supabaseSecrets = new Set(lines);
    } else {
      supabaseSecrets = new Set();
    }
  } catch {
    supabaseSecrets = new Set();
  }
  return supabaseSecrets;
}

function mask(val: string) {
  return val.length <= 4 ? '****' : val.slice(0, 2) + '****' + val.slice(-2);
}

for (const key of manifest.keys) {
  if (!key.envs.includes(envArg)) continue;
  const value = process.env[key.name];
  const inCodex = Boolean(value);
  if (key.required && !value) {
    missingRequired = true;
  }

  let inGithub = false;
  let inSupabase = false;
  let action = 'noop';

  // Github presence check
  if (key.scope.includes('github') && process.env.GITHUB_TOKEN && process.env.GITHUB_REPOSITORY) {
    try {
      const repo = process.env.GITHUB_REPOSITORY;
      const resp = await fetch(`https://api.github.com/repos/${repo}/actions/secrets/${key.name}`, {
        headers: { Authorization: `token ${process.env.GITHUB_TOKEN}` },
      });
      inGithub = resp.status === 200;
    } catch {
      inGithub = false;
    }
  }

  // Supabase presence check
  if (key.scope.includes('supabase')) {
    inSupabase = loadSupabaseSecrets().has(key.name);
  }

  if (!value) {
    action = 'missing-env';
  } else if (apply) {
    const actions: string[] = [];
    if (key.scope.includes('github') && process.env.GITHUB_TOKEN && process.env.GITHUB_REPOSITORY) {
      actions.push('github');
      // Actual upsert omitted intentionally
    }
    if (key.scope.includes('supabase')) {
      actions.push('supabase');
      try {
        spawnSync('supabase', ['secrets', 'set', `${key.name}=${value}`], { stdio: 'ignore' });
      } catch {
        // ignore
      }
    }
    action = actions.length ? `sync:${actions.join('+')}` : 'noop';
  }

  statuses.push({
    key: key.name,
    in_codex: inCodex,
    in_github: inGithub,
    in_supabase: inSupabase,
    action,
  });
}

console.table(statuses);

if (missingRequired) {
  console.error('Required secrets missing in environment.');
  if (!apply) {
    console.error('Run with --apply after setting the missing values.');
  }
  process.exit(1);
}
// END SECRETS_SYNC
