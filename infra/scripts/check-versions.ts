import { execSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';

interface Tool {
  name: string;
  cmd: string;
  min?: string;
  install: string;
}

const tools: Tool[] = [
  { name: 'node', cmd: 'node --version', min: '20.0.0', install: 'nvm install 20 && nvm use 20' },
  { name: 'npm', cmd: 'npm --version', install: 'npm install -g npm' },
  { name: 'pnpm', cmd: 'pnpm --version', install: 'npm install -g pnpm' },
  { name: 'deno', cmd: 'deno --version', min: '1.44.0', install: 'deno upgrade' },
  { name: 'supabase', cmd: 'supabase --version', min: '1.188.0', install: 'npm install -g supabase' },
];

function parseVersion(output: string): string {
  const match = output.match(/(\d+\.\d+\.\d+)/);
  return match ? match[1] : '0.0.0';
}

function satisfies(version: string, required: string): boolean {
  const v = version.split('.').map(Number);
  const r = required.split('.').map(Number);
  for (let i = 0; i < Math.max(v.length, r.length); i++) {
    const diff = (v[i] || 0) - (r[i] || 0);
    if (diff > 0) return true;
    if (diff < 0) return false;
  }
  return true;
}

for (const tool of tools) {
  try {
    const out = execSync(tool.cmd, { encoding: 'utf8' });
    const version = parseVersion(out);
    if (tool.min) {
      const ok = satisfies(version, tool.min);
      console.log(`${tool.name}: ${version} (required >= ${tool.min})`);
      if (!ok) {
        console.log(`  upgrade: ${tool.install}`);
      }
    } else {
      console.log(`${tool.name}: ${version}`);
    }
  } catch {
    console.log(`${tool.name}: not found`);
    console.log(`  install: ${tool.install}`);
  }
}

const workspaces = ['webapp', 'dashboard'];
for (const ws of workspaces) {
  const pkg = path.join(ws, 'package.json');
  if (existsSync(pkg)) {
    console.log(`\nDependencies in ${ws}:`);
    try {
      const result = execSync('npx npm-check-updates --target=minor', {
        cwd: ws,
        stdio: 'pipe',
        encoding: 'utf8',
      });
      console.log(result.trim());
    } catch (err) {
      console.error(`  failed to check ${ws}`);
    }
  } else {
    console.log(`\nWorkspace ${ws} not found, skipping.`);
  }
}
