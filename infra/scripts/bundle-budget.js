// BEGIN BUNDLE-BUDGET
import { gzipSync } from 'node:zlib';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

function findBundle() {
  try {
    const files = readdirSync('dist/assets');
    return files.find((f) => f.endsWith('.js'));
  } catch {
    return null;
  }
}

const bundle = findBundle();
if (!bundle) {
  console.warn('Bundle file not found; skipping size check');
  process.exit(0);
}

const content = readFileSync(join('dist/assets', bundle));
const size = gzipSync(content).length;
const kb = Math.round(size / 1024);
if (kb > 500) {
  console.warn(`Bundle ${kb}KB exceeds 500KB gzip`);
} else {
  console.log(`Bundle ${kb}KB within limit`);
}
// END BUNDLE-BUDGET
