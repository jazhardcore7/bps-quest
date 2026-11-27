import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.resolve(__dirname, '../dist');

function walkFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, out);
    } else {
      out.push(fullPath);
    }
  }
  return out;
}

describe('Production build exclusion of demo-login switcher', () => {
  it('excludes "demo-login" and "@demo.bps.local" from all files in dist/', () => {
    assert.ok(fs.existsSync(DIST_DIR), 'dist/ directory must exist (run npm run build first)');
    const files = walkFiles(DIST_DIR);
    assert.ok(files.length > 0, 'dist/ must contain built files');

    const matches = [];
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes('demo-login') || content.includes('@demo.bps.local')) {
        matches.push(path.relative(DIST_DIR, file));
      }
    }

    assert.deepEqual(
      matches,
      [],
      `Expected zero dist/ files containing demo-login or demo emails, found: ${matches.join(', ')}`
    );
  });
});
