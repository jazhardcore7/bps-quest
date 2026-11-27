import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BpsData } from '../src/data/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const read = (rel) => fs.readFileSync(path.resolve(__dirname, rel), 'utf8');

// Resolves simple custom properties (hex values and var() references) from CSS text.
function readTokens(...cssTexts) {
  const map = new Map();
  for (const css of cssTexts) {
    for (const m of css.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
      map.set(m[1], m[2].trim());
    }
  }
  const resolve = (value, depth = 0) => {
    const ref = /^var\((--[a-z0-9-]+)\)$/i.exec(value || '');
    if (ref && depth < 10) return resolve(map.get(ref[1]), depth + 1);
    return value;
  };
  return (name) => resolve(map.get(name));
}

function luminance(hex) {
  const h = hex.replace('#', '');
  const c = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

function ratio(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

const token = readTokens(read('../src/styles/style.css'), read('../src/styles/island-tokens.css'));
const WHITE = '#FFFFFF';

describe('world map pill contrast (white text on the rendered fill)', () => {
  // Same resolution the browser does for pillFill(): var(--pill-fix-<id>, <pillColor>)
  for (const island of BpsData.islands) {
    const fill = token('--pill-fix-' + island.id) || island.pillColor;
    it(island.id + ' pill ' + fill + ' is >= 4.5:1', () => {
      assert.match(fill, /^#[0-9a-f]{6}$/i);
      const r = ratio(WHITE, fill);
      assert.ok(r >= 4.5, island.id + ' is ' + r.toFixed(2) + ':1');
    });
  }

  it('only uses a fix token where the data color fails', () => {
    for (const island of BpsData.islands) {
      const fix = token('--pill-fix-' + island.id);
      if (fix) assert.ok(ratio(WHITE, island.pillColor) < 4.5, island.id + ' has an unneeded fix');
    }
  });
});

describe('other text pairs introduced by the restyle', () => {
  const pairs = [
    ['ink on window plate (badges, tile plaques, role chip)', '--island-ink', '--room-window'],
    ['ink on gold ("Unit Anda", own tile)', '--island-ink', '--color-gold'],
    ['board text on gold', '--board-gold-text', '--color-gold'],
    ['white on HUD card', '--color-card-text', '--color-card-bg'],
    ['subtext on HUD card (subtitle, XP label)', '--color-card-subtext', '--color-card-bg'],
    ['white on HUD buttons', '--color-card-text', '--color-page-bg']
  ];
  for (const [label, fg, bg] of pairs) {
    it(label + ' is >= 4.5:1', () => {
      const r = ratio(token(fg), token(bg));
      assert.ok(r >= 4.5, label + ' is ' + r.toFixed(2) + ':1');
    });
  }

  it('UI boundaries are >= 3:1 (HUD button edge, focus ring on the sea)', () => {
    assert.ok(ratio(token('--hud-xp-cell-edge'), token('--color-card-bg')) >= 3);
    assert.ok(ratio(token('--color-gold'), token('--color-ocean-bottom')) >= 3);
    assert.ok(ratio(token('--color-gold'), token('--color-card-bg')) >= 3);
  });
});
