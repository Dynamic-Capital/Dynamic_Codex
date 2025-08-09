import { createClient } from '@supabase/supabase-js';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(0);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const BUCKET = 'miniapp';
const DIST_DIR = path.resolve('dist');

async function ensureBucket() {
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.some((b) => b.name === BUCKET)) {
    await supabase.storage.createBucket(BUCKET, { public: true });
  }
}

async function uploadDir(root: string, dir = ''): Promise<void> {
  const fullDir = path.join(root, dir);
  const entries = await fs.readdir(fullDir, { withFileTypes: true });
  for (const entry of entries) {
    const relPath = path.posix.join(dir, entry.name);
    const fullPath = path.join(root, relPath);
    if (entry.isDirectory()) {
      await uploadDir(root, relPath);
    } else {
      const content = await fs.readFile(fullPath);
      await supabase.storage.from(BUCKET).upload(relPath, content, {
        upsert: true,
        cacheControl: 'public, max-age=31536000, immutable',
      });
    }
  }
}

function getPublicBaseUrl(): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl('index.html');
  return data.publicUrl.replace(/\/index\.html$/, '');
}

async function getSecret(name: string): Promise<string | undefined> {
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
  const projectRef = process.env.SUPABASE_PROJECT_REF;
  if (!accessToken || !projectRef) return undefined;
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/secrets`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return undefined;
  const secrets = (await res.json()) as { name: string; value: string }[];
  return secrets.find((s) => s.name === name)?.value;
}

async function setSecret(name: string, value: string): Promise<void> {
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
  const projectRef = process.env.SUPABASE_PROJECT_REF;
  if (!accessToken || !projectRef) return;
  await fetch(`https://api.supabase.com/v1/projects/${projectRef}/secrets`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ secrets: [{ name, value }] }),
  });
}

async function updateWebappUrl() {
  const url = getPublicBaseUrl();
  const current = await getSecret('WEBAPP_URL');
  if (current !== url) {
    await setSecret('WEBAPP_URL', url);
  }
}

async function main() {
  await ensureBucket();
  await uploadDir(DIST_DIR);
  await updateWebappUrl();
}

main().catch((err) => {
  console.error(err);
});
