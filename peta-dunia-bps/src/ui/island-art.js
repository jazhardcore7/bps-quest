// Inline-SVG art for the World Map and Island screens, drawn in the Office
// screen's visual grammar: flat pastel fills, 3px ink outlines, hard offset
// shadows, window grids in the Office floor color, a lighter top edge.
//
// Pure string generation: no DOM, no Firebase, no randomness at render time.
// Shapes come from a PRNG seeded by the island id, so output is deterministic.
// Colors are CSS custom properties from src/styles/island-tokens.css; the only
// data-driven colors are the unit colors from src/data/index.js (escaped).

import { BpsData } from '../data/index.js';
import { escapeHtml } from './escape.js';

/* ---------------------------------------------------------------------------
   Deterministic helpers
   ------------------------------------------------------------------------- */

function hashStr(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededRng(seed) {
  let a = hashStr(String(seed));
  return function next() {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r1 = (n) => Math.round(n * 10) / 10;

function jitterFor(seed, points, amount) {
  const rnd = seededRng('shape:' + seed);
  const out = [];
  for (let i = 0; i < points; i++) out.push(1 - amount / 2 + rnd() * amount);
  return out;
}

// Smooth closed blob through jittered ellipse points (Catmull-Rom -> cubic Bezier).
function blobPath(cx, cy, rx, ry, jitter) {
  const n = jitter.length;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * rx * jitter[i], cy + Math.sin(a) * ry * jitter[i]]);
  }
  let d = 'M' + r1(pts[0][0]) + ' ' + r1(pts[0][1]);
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    d += 'C' + r1(p1[0] + (p2[0] - p0[0]) / 6) + ' ' + r1(p1[1] + (p2[1] - p0[1]) / 6) +
      ' ' + r1(p2[0] - (p3[0] - p1[0]) / 6) + ' ' + r1(p2[1] - (p3[1] - p1[1]) / 6) +
      ' ' + r1(p2[0]) + ' ' + r1(p2[1]);
  }
  return d + 'Z';
}

/* ---------------------------------------------------------------------------
   Island lookup and per-island shape parameters
   ------------------------------------------------------------------------- */

export const ISLAND_IDS = BpsData.islands.map((i) => i.id);

export function getIsland(islandId) {
  return BpsData.islands.find((i) => i.id === islandId) || null;
}

// Silhouette variety: number of wobble points and how irregular the outline is.
const SHAPES = {
  pimpinan: { points: 9, amount: 0.16, squash: 0.95 },
  sestama: { points: 12, amount: 0.12, squash: 1.0 },
  mis: { points: 8, amount: 0.2, squash: 0.92 },
  sosial: { points: 11, amount: 0.18, squash: 1.0 },
  produksi: { points: 10, amount: 0.22, squash: 0.9 },
  'distribusi-jasa': { points: 7, amount: 0.18, squash: 1.0 },
  neraca: { points: 13, amount: 0.1, squash: 0.94 },
  itama: { points: 9, amount: 0.24, squash: 0.96 }
};
const DEFAULT_SHAPE = { points: 10, amount: 0.14, squash: 1.0 };

/* ---------------------------------------------------------------------------
   Building grammar (64 x 64 box, ground line at y = 60)
   ------------------------------------------------------------------------- */

const OUTLINE = 'stroke="var(--island-outline)" stroke-width="3" stroke-linejoin="round"';
const THIN = 'stroke="var(--island-outline)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"';

// Wall with hard offset shadow, ink outline and a lighter top edge.
function wall(x, y, w, h, fill) {
  return '' +
    '<rect x="' + x + '" y="' + (y + 4) + '" width="' + w + '" height="' + h + '" fill="var(--island-ink)" fill-opacity="0.35"/>' +
    '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="1.5" fill="' + fill + '" ' + OUTLINE + '/>' +
    '<rect x="' + (x + 2) + '" y="' + (y + 2) + '" width="' + (w - 4) + '" height="3" fill="var(--island-foam)" fill-opacity="0.55"/>';
}

// Window grid; keeps the legacy hook classes .building-windows / .window-pane.
function windows(x, y, cols, rows, cw, ch, gap) {
  let s = '<g class="building-windows">';
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      s += '<rect class="window-pane" x="' + (x + c * (cw + gap)) + '" y="' + (y + r * (ch + gap)) + '" width="' + cw + '" height="' + ch + '" ' +
        'fill="var(--room-window)" stroke="var(--island-outline)" stroke-width="1.5"/>';
    }
  }
  return s + '</g>';
}

function door(x, y, w, h) {
  return '<rect class="building-door" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="var(--island-outline)"/>';
}

// Shadowed roof polygon/path in the unit color.
function roof(d, unitColor) {
  return '<path d="' + d + '" transform="translate(0 4)" fill="var(--island-ink)" fill-opacity="0.35"/>' +
    '<path class="building-roof-accent" d="' + d + '" fill="' + unitColor + '" ' + OUTLINE + '/>';
}

function star(cx, cy, r) {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    d += (i === 0 ? 'M' : 'L') + r1(cx + Math.cos(a) * rr) + ' ' + r1(cy + Math.sin(a) * rr);
  }
  return '<path d="' + d + 'Z" fill="var(--board-gold)" ' + THIN + '/>';
}

// One motif per island; unitColor tints the roof/accent only.
const MOTIFS = {
  // Tall tower with a flag
  pimpinan: (u) =>
    '<path d="M32 -8V4" ' + THIN + '/>' +
    '<path d="M33 -8h12l-3 4 3 4H33z" fill="var(--board-gold)" ' + THIN + '/>' +
    wall(21, 15, 22, 45, 'var(--room-blue)') +
    roof('M18 16L32 3L46 16Z', u) +
    windows(26, 22, 2, 3, 5, 6, 3) +
    door(29, 51, 6, 9),

  // Administration hall with a star in the pediment
  sestama: (u) =>
    wall(6, 27, 52, 33, 'var(--room-cream)') +
    roof('M2 28L32 9L62 28Z', u) +
    star(32, 20, 5) +
    '<path d="M14 33V56M24 33V56M40 33V56M50 33V56" ' + THIN + '/>' +
    door(28, 46, 8, 14),

  // Server block with an antenna
  mis: (u) =>
    '<path d="M46 18V4" ' + THIN + '/>' +
    '<circle cx="46" cy="4" r="3" fill="var(--board-gold)" ' + THIN + '/>' +
    wall(12, 21, 40, 39, 'var(--room-gray)') +
    roof('M9 17h46v7H9z', u) +
    '<rect x="17" y="29" width="30" height="6" fill="var(--room-window)" ' + THIN + '/>' +
    '<rect x="17" y="38" width="30" height="6" fill="var(--room-window)" ' + THIN + '/>' +
    '<rect x="17" y="47" width="30" height="6" fill="var(--room-window)" ' + THIN + '/>' +
    '<circle cx="42" cy="32" r="1.6" fill="var(--board-gold-stroke)"/>' +
    '<circle cx="42" cy="41" r="1.6" fill="var(--board-gold-stroke)"/>' +
    '<circle cx="42" cy="50" r="1.6" fill="var(--board-gold-stroke)"/>',

  // Community house with a people sign
  sosial: (u) =>
    wall(12, 29, 40, 31, 'var(--room-green)') +
    roof('M7 30L32 10L57 30Z', u) +
    '<rect x="20" y="34" width="24" height="15" rx="2" fill="var(--room-window)" ' + THIN + '/>' +
    '<circle cx="28" cy="39" r="2.6" fill="var(--island-outline)"/>' +
    '<circle cx="36" cy="39" r="2.6" fill="var(--island-outline)"/>' +
    '<path d="M23.5 47a4.5 4.5 0 0 1 9 0M31.5 47a4.5 4.5 0 0 1 9 0" fill="var(--island-outline)"/>' +
    door(29, 52, 6, 8),

  // Factory with a chimney
  produksi: (u) =>
    '<circle cx="57" cy="6" r="3.5" fill="var(--island-foam)" ' + THIN + '/>' +
    '<circle cx="62" cy="1" r="2.5" fill="var(--island-foam)" ' + THIN + '/>' +
    wall(49, 12, 9, 48, 'var(--room-gray)') +
    wall(5, 31, 44, 29, 'var(--room-gray)') +
    roof('M5 31V21L16 31V21L27 31V21L38 31V21L49 31Z', u) +
    windows(10, 38, 4, 1, 6, 6, 4) +
    door(20, 50, 10, 10),

  // Warehouse with a delivery crate
  'distribusi-jasa': (u) =>
    wall(3, 29, 46, 31, 'var(--room-cream)') +
    roof('M1 30Q26 10 51 30Z', u) +
    '<rect x="16" y="39" width="20" height="21" fill="var(--room-window)" ' + THIN + '/>' +
    '<path d="M16 45h20M16 51h20" ' + THIN + '/>' +
    '<rect x="51" y="47" width="12" height="13" fill="var(--island-trunk)" ' + THIN + '/>' +
    '<path d="M51 47l12 13M63 47L51 60" ' + THIN + '/>',

  // Building with a pie-chart sign
  neraca: (u) =>
    '<path d="M50 24V14" ' + THIN + '/>' +
    '<circle cx="50" cy="9" r="8" fill="var(--room-window)" ' + THIN + '/>' +
    '<path d="M50 9V1A8 8 0 0 1 57.6 11.5Z" fill="' + u + '" ' + THIN + '/>' +
    '<path d="M50 9L57.6 11.5A8 8 0 0 1 45 15.3Z" fill="var(--board-gold)" ' + THIN + '/>' +
    wall(8, 24, 40, 36, 'var(--room-blue)') +
    roof('M5 20h46v7H5z', u) +
    windows(13, 32, 3, 2, 6, 6, 5) +
    door(24, 51, 8, 9),

  // Building with a shield emblem
  itama: (u) =>
    wall(11, 22, 42, 38, 'var(--room-gray)') +
    roof('M8 18h48v7H8z', u) +
    '<path d="M32 30l9 3v7c0 6-4 10-9 12c-5-2-9-6-9-12v-7z" fill="var(--board-gold)" ' + THIN + '/>' +
    '<path d="M28 41l3 3 5-6" fill="none" ' + THIN + '/>' +
    windows(14, 30, 1, 2, 5, 6, 5) +
    windows(45, 30, 1, 2, 5, 6, 5)
};

export const MOTIF_IDS = Object.keys(MOTIFS);

function tree(x, y, s) {
  return '' +
    '<rect x="' + r1(x - 1.6 * s) + '" y="' + r1(y) + '" width="' + r1(3.2 * s) + '" height="' + r1(6 * s) + '" fill="var(--island-trunk)" ' + THIN + '/>' +
    '<circle cx="' + r1(x) + '" cy="' + r1(y - 2 * s) + '" r="' + r1(6 * s) + '" fill="var(--island-tree)" ' + OUTLINE + '/>';
}

/**
 * Inline SVG for one world-map island, sized to its stage rectangle.
 * @param {string} islandId - one of ISLAND_IDS; unknown ids get a generic shape and building
 * @param {{ width?: number, height?: number, blockColor?: string }} [opts]
 * @returns {string}
 */
export function renderIslandSVG(islandId, opts = {}) {
  const id = String(islandId == null ? '' : islandId);
  const meta = getIsland(id);
  const w = Number(opts.width) || (meta ? meta.rect[2] : 200);
  const h = Number(opts.height) || (meta ? meta.rect[3] : 120);
  const unitColor = escapeHtml(String(opts.blockColor || (meta && meta.blockColor) || 'var(--room-blue)'));
  const shape = SHAPES[id] || DEFAULT_SHAPE;
  const jitter = jitterFor(id, shape.points, shape.amount);
  const rnd = seededRng('props:' + id);

  const cx = w / 2;
  const cy = h * 0.46;
  const gx = w * 0.36;
  const gy = h * 0.3 * shape.squash;
  const k = Math.min(w / 200, h / 120);

  let svg = '<svg class="island-art-svg" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" ' +
    'data-island="' + escapeHtml(id) + '" aria-hidden="true" focusable="false">';

  // 1. shallow water ring and 2. foam line
  svg += '<path d="' + blobPath(cx, cy + 4, w * 0.5, h * 0.5 * shape.squash, jitter) + '" fill="var(--island-shallow)" fill-opacity="0.85"/>';
  svg += '<path d="' + blobPath(cx, cy + 3, w * 0.455, h * 0.44 * shape.squash, jitter) + '" fill="none" stroke="var(--island-foam)" stroke-width="2.5" stroke-dasharray="7 5" stroke-linecap="round"/>';
  // 3. sand rim with ink outline
  svg += '<path d="' + blobPath(cx, cy + 3, w * 0.42, h * 0.39 * shape.squash, jitter) + '" fill="var(--color-island-sand)" ' + OUTLINE + '/>';
  // 4. grass: shaded lip, then top with ink outline
  svg += '<path d="' + blobPath(cx, cy + 4, gx, gy, jitter) + '" fill="var(--island-grass-shade)"/>';
  svg += '<path d="' + blobPath(cx, cy - 1, gx, gy, jitter) + '" fill="var(--color-island-grass)" stroke="var(--island-outline)" stroke-width="2.5"/>';
  // 5. trees (2 or 3, deterministic)
  svg += tree(cx - gx * (0.66 + rnd() * 0.12), cy + gy * 0.05, k * 1.05);
  svg += tree(cx + gx * (0.64 + rnd() * 0.12), cy + gy * 0.1, k * 0.95);
  if (rnd() > 0.45) svg += tree(cx - gx * 0.4, cy + gy * 0.6, k * 0.8);
  // 6. one building in the Office grammar
  const motif = MOTIFS[id] || MOTIFS.sestama;
  const bScale = 1.02 * k;
  const bx = cx - 32 * bScale;
  const by = cy - 50 * bScale;
  svg += '<g class="island-art-building" transform="translate(' + r1(bx) + ' ' + r1(by) + ') scale(' + r1(bScale * 100) / 100 + ')">' +
    motif(unitColor) + '</g>';

  svg += '</svg>';
  return svg;
}

/**
 * Large island base for the #/island/<id> screen (shallow ring, foam, sand,
 * grass, perimeter trees). Building tiles are HTML on top of it.
 */
export function renderBigIslandSVG(islandId, w = 820, h = 420) {
  const id = String(islandId == null ? '' : islandId);
  const shape = SHAPES[id] || DEFAULT_SHAPE;
  const jitter = jitterFor('big:' + id, shape.points + 4, Math.min(0.1, shape.amount));
  const cx = w / 2;
  const cy = h / 2;
  const gx = w * 0.45;
  const gy = h * 0.4;

  let svg = '<svg class="island-big-svg" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" ' +
    'data-island="' + escapeHtml(id) + '" aria-hidden="true" focusable="false">';
  svg += '<path d="' + blobPath(cx, cy + 6, w * 0.5, h * 0.5, jitter) + '" fill="var(--island-shallow)" fill-opacity="0.85"/>';
  svg += '<path d="' + blobPath(cx, cy + 5, w * 0.485, h * 0.47, jitter) + '" fill="none" stroke="var(--island-foam)" stroke-width="3" stroke-dasharray="10 7" stroke-linecap="round"/>';
  svg += '<path d="' + blobPath(cx, cy + 4, w * 0.47, h * 0.45, jitter) + '" fill="var(--color-island-sand)" ' + OUTLINE + '/>';
  svg += '<path d="' + blobPath(cx, cy + 6, gx, gy, jitter) + '" fill="var(--island-grass-shade)"/>';
  svg += '<path d="' + blobPath(cx, cy - 1, gx, gy, jitter) + '" fill="var(--color-island-grass)" stroke="var(--island-outline)" stroke-width="2.5"/>';
  const angles = [198, 214, 232, 306, 326, 342, 150, 132, 48, 30];
  for (let i = 0; i < angles.length; i++) {
    const a = (angles[i] * Math.PI) / 180;
    svg += tree(cx + Math.cos(a) * gx * 0.92, cy - 1 + Math.sin(a) * gy * 0.86, i % 3 === 0 ? 1.5 : 1.25);
  }
  svg += '</svg>';
  return svg;
}

/* ---------------------------------------------------------------------------
   World ambient layer: 6 animated elements (owner decision D-08)
   ------------------------------------------------------------------------- */

export const AMBIENT_ANIMATED_COUNT = 6;

function centerOf(id) {
  const isl = getIsland(id);
  return isl ? [isl.rect[0] + isl.rect[2] / 2, isl.rect[1] + isl.rect[3] / 2] : null;
}

const ROUTES = [
  ['sestama', 'mis'], ['mis', 'sosial'], ['sosial', 'produksi'], ['pimpinan', 'mis'],
  ['pimpinan', 'sosial'], ['sestama', 'distribusi-jasa'], ['distribusi-jasa', 'neraca'],
  ['neraca', 'itama'], ['mis', 'neraca']
];

function cloudSVG(w) {
  const h = Math.round(w * 0.45);
  return '<svg viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" aria-hidden="true" focusable="false">' +
    '<path d="M' + r1(w * 0.14) + ' ' + r1(h * 0.86) + 'H' + r1(w * 0.88) +
    'a' + r1(h * 0.3) + ' ' + r1(h * 0.3) + ' 0 0 0 -' + r1(w * 0.1) + ' -' + r1(h * 0.44) +
    'a' + r1(h * 0.38) + ' ' + r1(h * 0.38) + ' 0 0 0 -' + r1(w * 0.34) + ' -' + r1(h * 0.14) +
    'a' + r1(h * 0.32) + ' ' + r1(h * 0.32) + ' 0 0 0 -' + r1(w * 0.26) + ' ' + r1(h * 0.26) +
    'a' + r1(h * 0.24) + ' ' + r1(h * 0.24) + ' 0 0 0 -' + r1(w * 0.04) + ' ' + r1(h * 0.32) + 'Z" ' +
    'fill="var(--island-foam)" ' + OUTLINE + '/></svg>';
}

function boatSVG() {
  return '<svg viewBox="0 0 48 40" width="48" height="40" aria-hidden="true" focusable="false">' +
    '<path d="M24 4V27" ' + THIN + '/>' +
    '<path d="M26 6L40 24H26Z" fill="var(--room-window)" ' + OUTLINE + '/>' +
    '<path d="M22 10L12 24H22Z" fill="var(--board-gold)" ' + OUTLINE + '/>' +
    '<path d="M5 31H43L37 39H11Z" fill="var(--island-ink)" fill-opacity="0.35"/>' +
    '<path d="M5 27H43L37 36H11Z" fill="var(--island-trunk)" ' + OUTLINE + '/></svg>';
}

function sparkles(points) {
  return points.map(([x, y]) =>
    '<path d="M' + x + ' ' + (y - 5) + 'L' + (x + 1.4) + ' ' + (y - 1.4) + 'L' + (x + 5) + ' ' + y + 'L' + (x + 1.4) + ' ' + (y + 1.4) +
    'L' + x + ' ' + (y + 5) + 'L' + (x - 1.4) + ' ' + (y + 1.4) + 'L' + (x - 5) + ' ' + y + 'L' + (x - 1.4) + ' ' + (y - 1.4) + 'Z" ' +
    'fill="var(--island-foam)"/>').join('');
}

/**
 * Decorative sea layer for the world map. Static: wave texture, dashed routes,
 * compass. Animated (exactly 6, class "is-animated"): 2 clouds, 2 boats,
 * 2 shimmer groups. Entirely aria-hidden.
 */
export function renderWorldAmbient() {
  let routes = '';
  for (const [a, b] of ROUTES) {
    const p = centerOf(a);
    const q = centerOf(b);
    if (!p || !q) continue;
    const dx = q[0] - p[0];
    const dy = q[1] - p[1];
    const len = Math.hypot(dx, dy) || 1;
    const c = [(p[0] + q[0]) / 2 - (dy / len) * 16, (p[1] + q[1]) / 2 + (dx / len) * 16];
    routes += '<path d="M' + r1(p[0]) + ' ' + r1(p[1]) + 'Q' + r1(c[0]) + ' ' + r1(c[1]) + ' ' + r1(q[0]) + ' ' + r1(q[1]) + '"/>';
  }

  let waves = '';
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 9; col++) {
      const x = 30 + col * 110 + (row % 2) * 55;
      const y = 40 + row * 80;
      waves += '<path d="M' + x + ' ' + y + 'q7 -6 14 0t14 0"/>';
    }
  }

  const compass = '<g transform="translate(928 528)">' +
    '<circle r="24" fill="var(--room-window)" ' + OUTLINE + '/>' +
    '<path d="M0 -17L5 0L0 17L-5 0Z" fill="var(--room-window)" ' + THIN + '/>' +
    '<path d="M0 -17L5 0H-5Z" fill="var(--island-outline)"/>' +
    '<circle r="2.5" fill="var(--island-outline)"/></g>';

  const svg = '<svg class="world-sea-svg" viewBox="0 0 960 560" width="960" height="560" aria-hidden="true" focusable="false">' +
    '<g class="world-waves" fill="none" stroke="var(--island-foam)" stroke-opacity="0.35" stroke-width="2" stroke-linecap="round">' + waves + '</g>' +
    '<g class="world-routes" fill="none" stroke="var(--island-foam)" stroke-opacity="0.8" stroke-width="2.5" stroke-dasharray="2 8" stroke-linecap="round">' + routes + '</g>' +
    compass +
    '<g class="ambient-shimmer ambient-shimmer-a is-animated">' + sparkles([[290, 125], [350, 205], [600, 200], [940, 375]]) + '</g>' +
    '<g class="ambient-shimmer ambient-shimmer-b is-animated">' + sparkles([[720, 372], [520, 385], [60, 382], [365, 540], [915, 545]]) + '</g>' +
    '</svg>';

  return '<div class="world-ambient" aria-hidden="true">' + svg +
    '<div class="ambient-cloud ambient-cloud-a is-animated">' + cloudSVG(110) + '</div>' +
    '<div class="ambient-cloud ambient-cloud-b is-animated">' + cloudSVG(86) + '</div>' +
    '<div class="ambient-boat ambient-boat-a is-animated">' + boatSVG() + '</div>' +
    '<div class="ambient-boat ambient-boat-b is-animated">' + boatSVG() + '</div>' +
    '</div>';
}

/* ---------------------------------------------------------------------------
   Labels, badges, "Unit Anda"
   ------------------------------------------------------------------------- */

/**
 * CSS background for an island pill: the contrast-fix token when one exists,
 * otherwise the island's pillColor from src/data/index.js.
 */
export function pillFill(island) {
  if (!island) return 'var(--island-outline)';
  return 'var(--pill-fix-' + escapeHtml(String(island.id)) + ', ' + escapeHtml(String(island.pillColor || '')) + ')';
}

const TYPE_LABELS = {
  biro: 'biro',
  direktorat: 'direktorat',
  inspektorat: 'inspektorat',
  deputi: 'deputi',
  pusat: 'pusat',
  bagian: 'bagian'
};

/**
 * Badge text for an island, from units already in memory: the count of the
 * most common child-unit type ("5 biro", "3 direktorat"). Returns null when
 * the island has no child units in the given list.
 * @param {Array} units
 * @param {string} islandId
 * @returns {{ count: number, text: string } | null}
 */
export function islandBadge(units, islandId) {
  const list = (Array.isArray(units) ? units : []).filter((u) => u && u.island === islandId && u.archived !== true);
  if (list.length === 0) return null;
  const ids = new Set(list.map((u) => u.id));
  const children = list.filter((u) => u.parentId && ids.has(u.parentId));
  if (children.length === 0) return null;
  const counts = new Map();
  for (const u of children) {
    const key = TYPE_LABELS[u.type] || 'unit';
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  let best = null;
  for (const [label, count] of counts) {
    if (!best || count > best.count) best = { label, count };
  }
  return { count: best.count, text: best.count + ' ' + best.label };
}

/**
 * The island that contains the user's unit, from units already in memory.
 * Checks the unit id first, then each id in unitPath (deepest first).
 * @returns {string | null} island id
 */
export function islandOfUser(units, unitId, unitPath) {
  const list = Array.isArray(units) ? units : [];
  const candidates = [unitId].concat(Array.isArray(unitPath) ? [...unitPath].reverse() : []).filter(Boolean);
  for (const id of candidates) {
    const u = list.find((x) => x && x.id === id);
    if (u && u.island) return u.island;
  }
  return null;
}

export default {
  renderIslandSVG,
  renderBigIslandSVG,
  renderWorldAmbient,
  pillFill,
  islandBadge,
  islandOfUser,
  ISLAND_IDS,
  MOTIF_IDS,
  AMBIENT_ANIMATED_COUNT
};
