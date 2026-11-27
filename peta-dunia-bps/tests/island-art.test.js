import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BpsData } from '../src/data/index.js';
import {
  renderIslandSVG,
  renderBigIslandSVG,
  renderWorldAmbient,
  pillFill,
  islandBadge,
  islandOfUser,
  ISLAND_IDS,
  MOTIF_IDS,
  AMBIENT_ANIMATED_COUNT
} from '../src/ui/island-art.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const units = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../src/data/bps-structure.json'), 'utf8')
).units;

describe('renderIslandSVG', () => {
  it('renders every island id from src/data/index.js with its own motif', () => {
    assert.equal(ISLAND_IDS.length, BpsData.islands.length);
    for (const island of BpsData.islands) {
      assert.ok(MOTIF_IDS.includes(island.id), 'missing motif for ' + island.id);
      const svg = renderIslandSVG(island.id);
      assert.match(svg, /^<svg class="island-art-svg"/);
      assert.match(svg, /<\/svg>$/);
      assert.ok(svg.includes('data-island="' + island.id + '"'));
      assert.ok(svg.includes('viewBox="0 0 ' + island.rect[2] + ' ' + island.rect[3] + '"'));
      assert.ok(svg.includes('class="island-art-building"'));
    }
  });

  it('is deterministic (same input, same output)', () => {
    for (const id of ISLAND_IDS) {
      assert.equal(renderIslandSVG(id), renderIslandSVG(id));
      assert.equal(renderBigIslandSVG(id), renderBigIslandSVG(id));
    }
    assert.equal(renderWorldAmbient(), renderWorldAmbient());
  });

  it('gives islands different shapes', () => {
    const outputs = new Set(ISLAND_IDS.map((id) => renderIslandSVG(id, { width: 200, height: 120 })));
    assert.equal(outputs.size, ISLAND_IDS.length);
  });

  it('tints the building with the unit color', () => {
    for (const island of BpsData.islands) {
      assert.ok(renderIslandSVG(island.id).includes('fill="' + island.blockColor + '"'));
    }
  });

  it('keeps the legacy hook classes on the SVG parts', () => {
    const all = ISLAND_IDS.map((id) => renderIslandSVG(id)).join('');
    for (const cls of ['building-roof-accent', 'building-windows', 'window-pane', 'building-door']) {
      assert.ok(all.includes('class="' + cls + '"'), 'missing .' + cls);
    }
  });

  it('escapes unexpected input instead of emitting it as markup', () => {
    const evilId = '"><script>alert(1)</script>';
    const svg = renderIslandSVG(evilId, { blockColor: '"/><img src=x onerror=alert(1)>' });
    assert.ok(!svg.includes('<script'));
    assert.ok(!svg.includes('<img'));
    assert.ok(svg.includes('&lt;script&gt;'));
    assert.ok(!renderBigIslandSVG(evilId).includes('<script'));
    const fill = pillFill({ id: '"><b>', pillColor: '"x' });
    assert.ok(!fill.includes('<b>'));
    assert.ok(!fill.includes('"'));
  });

  it('handles null/undefined ids without throwing', () => {
    assert.doesNotThrow(() => renderIslandSVG(undefined));
    assert.doesNotThrow(() => renderIslandSVG(null, { width: 100, height: 60 }));
  });
});

describe('renderWorldAmbient', () => {
  it('has exactly the agreed number of animated elements (6)', () => {
    const html = renderWorldAmbient();
    const animated = (html.match(/is-animated/g) || []).length;
    assert.equal(AMBIENT_ANIMATED_COUNT, 6);
    assert.equal(animated, AMBIENT_ANIMATED_COUNT);
    assert.ok(html.startsWith('<div class="world-ambient" aria-hidden="true">'));
  });
});

describe('pillFill', () => {
  it('prefers the contrast-fix token and falls back to the data color', () => {
    for (const island of BpsData.islands) {
      assert.equal(pillFill(island), 'var(--pill-fix-' + island.id + ', ' + island.pillColor + ')');
    }
  });
});

describe('islandBadge', () => {
  it('counts the most common child-unit type per island', () => {
    assert.deepEqual(islandBadge(units, 'sestama'), { count: 5, text: '5 biro' });
    assert.deepEqual(islandBadge(units, 'mis'), { count: 3, text: '3 direktorat' });
    assert.deepEqual(islandBadge(units, 'itama'), { count: 3, text: '3 inspektorat' });
  });

  it('returns null when there is nothing to count', () => {
    assert.equal(islandBadge(units, 'pimpinan'), null);
    assert.equal(islandBadge([], 'sestama'), null);
    assert.equal(islandBadge(null, 'sestama'), null);
  });

  it('ignores archived units', () => {
    const archived = units.map((u) => (u.id === 'biro-umum' ? { ...u, archived: true } : u));
    assert.deepEqual(islandBadge(archived, 'sestama'), { count: 4, text: '4 biro' });
  });
});

describe('islandOfUser', () => {
  it('finds the island from the unit id, then from unitPath', () => {
    assert.equal(islandOfUser(units, 'biro-sdm', []), 'sestama');
    assert.equal(islandOfUser(units, '', ['bps-pusat', 'deputi-distribusi-jasa', 'dir-harga']), 'distribusi-jasa');
    assert.equal(islandOfUser(units, 'unknown', undefined), null);
    assert.equal(islandOfUser(null, 'biro-sdm', []), null);
  });
});
