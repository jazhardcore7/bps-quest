// Procedural inline-SVG art for the world map and island screens.
// Everything is deterministic: shapes come from a PRNG seeded by the unit id,
// so the same island always renders identically. No Math.random at render time.
// Colors are CSS custom properties from tokens.css (no raw hex here).

import { icon } from './icons.js';

/* ---------------- deterministic helpers ---------------- */

function hashStr(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededRng(seedStr) {
  let a = hashStr(seedStr);
  return function next() {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r1 = (n) => Math.round(n * 10) / 10;

// Wobble factors around an ellipse; shared by all layers of one island so they stay concentric.
function makeJitter(seedStr, points = 10, amount = 0.1) {
  const rnd = seededRng(seedStr);
  const out = [];
  for (let i = 0; i < points; i++) out.push(1 - amount / 2 + rnd() * amount);
  return out;
}

// Closed smooth blob through jittered ellipse points (Catmull-Rom -> cubic Bezier).
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
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += 'C' + r1(c1x) + ' ' + r1(c1y) + ' ' + r1(c2x) + ' ' + r1(c2y) + ' ' + r1(p2[0]) + ' ' + r1(p2[1]);
  }
  return d + 'Z';
}

/* ---------------- shared pieces ---------------- */

function tree(x, y, size, fill) {
  const trunkW = r1(size * 0.32);
  const trunkH = r1(size * 0.7);
  return '' +
    '<rect x="' + r1(x - trunkW / 2) + '" y="' + r1(y) + '" width="' + trunkW + '" height="' + trunkH + '" rx="1.5" ' +
      'fill="var(--wood)" stroke="var(--ink)" stroke-width="2"/>' +
    '<circle cx="' + r1(x) + '" cy="' + r1(y - size * 0.25) + '" r="' + r1(size * 0.62) + '" ' +
      'fill="' + fill + '" stroke="var(--ink)" stroke-width="2.5"/>';
}

function cloud(x, y, w, className) {
  const h = w * 0.42;
  return '' +
    '<g class="' + className + '">' +
      '<path d="M' + r1(x + w * 0.18) + ' ' + r1(y + h) +
        'a' + r1(h * 0.5) + ' ' + r1(h * 0.5) + ' 0 0 1 ' + r1(w * 0.06) + ' -' + r1(h * 0.62) +
        'a' + r1(h * 0.55) + ' ' + r1(h * 0.55) + ' 0 0 1 ' + r1(w * 0.3) + ' -' + r1(h * 0.18) +
        'a' + r1(h * 0.62) + ' ' + r1(h * 0.62) + ' 0 0 1 ' + r1(w * 0.36) + ' ' + r1(h * 0.18) +
        'a' + r1(h * 0.45) + ' ' + r1(h * 0.45) + ' 0 0 1 ' + r1(w * 0.02) + ' ' + r1(h * 0.62) + 'Z" ' +
        'fill="var(--sea-foam)" fill-opacity="0.94" stroke="var(--ink)" stroke-width="2.5" stroke-linejoin="round"/>' +
    '</g>';
}

/* ---------------- world map island ---------------- */

/**
 * Inline SVG for one world-map island, sized to its stage rectangle.
 * @param {{id:string, rect:number[], locked?:boolean}} unit
 * @returns {string}
 */
export function renderIslandSVG(unit) {
  const w = unit.rect[2];
  const h = unit.rect[3];
  const locked = Boolean(unit.locked);
  const jitter = makeJitter('island:' + unit.id, 10, 0.14);
  const rnd = seededRng('trees:' + unit.id);

  const cx = w / 2;
  const cy = h * 0.48;
  const k = Math.min(w / 200, h / 120);

  const sand = locked ? 'var(--locked-sand)' : 'var(--sand)';
  const grass = locked ? 'var(--locked-grass)' : 'var(--grass)';
  const lip = locked ? 'var(--locked-grass-shade)' : 'var(--grass-shade)';
  const leaf = locked ? 'var(--locked-tree)' : 'var(--tree)';
  const roof = locked ? 'var(--locked)' : 'var(--unit-' + unit.id + '-tint)';

  const gx = w * 0.35;
  const gy = h * 0.3;

  let svg = '<svg class="island-svg" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" aria-hidden="true" focusable="false">';

  // 1. shallow water ring
  svg += '<path d="' + blobPath(cx, cy + 4, w * 0.5, h * 0.5, jitter) + '" fill="var(--ocean-shallow)" fill-opacity="0.75"/>';
  // 2. sand rim with ink outline
  svg += '<path d="' + blobPath(cx, cy + 3, w * 0.43, h * 0.4, jitter) + '" fill="' + sand + '" stroke="var(--ink)" stroke-width="3"/>';
  // 3. grass lip (depth) + grass top
  svg += '<path d="' + blobPath(cx, cy + 3, gx, gy, jitter) + '" fill="' + lip + '"/>';
  svg += '<path d="' + blobPath(cx, cy - 2, gx, gy, jitter) + '" fill="' + grass + '" stroke="var(--ink)" stroke-width="2"/>';

  // 4. trees (2 or 3, deterministic)
  const treeSize = 13 * k;
  svg += tree(cx - gx * (0.62 + rnd() * 0.12), cy - gy * 0.1, treeSize, leaf);
  svg += tree(cx + gx * (0.6 + rnd() * 0.14), cy + gy * 0.05, treeSize * 0.9, leaf);
  if (rnd() > 0.45) svg += tree(cx - gx * 0.34, cy + gy * 0.55, treeSize * 0.75, leaf);

  // 5. small house tinted with the unit color
  const hw = 34 * k;
  const hh = 22 * k;
  const hx = cx - hw / 2;
  const hy = cy - hh * 0.55;
  svg += '<g class="island-house">' +
    '<rect x="' + r1(hx) + '" y="' + r1(hy) + '" width="' + r1(hw) + '" height="' + r1(hh) + '" rx="2" ' +
      'fill="var(--paper)" stroke="var(--ink)" stroke-width="2.5"/>' +
    '<path d="M' + r1(hx - 5 * k) + ' ' + r1(hy + 2) + 'L' + r1(cx) + ' ' + r1(hy - 15 * k) + 'L' + r1(hx + hw + 5 * k) + ' ' + r1(hy + 2) + 'Z" ' +
      'fill="' + roof + '" stroke="var(--ink)" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<rect x="' + r1(cx - 4 * k) + '" y="' + r1(hy + hh - 11 * k) + '" width="' + r1(8 * k) + '" height="' + r1(11 * k) + '" ' +
      'fill="var(--ink)"/>' +
    '<rect x="' + r1(hx + 5 * k) + '" y="' + r1(hy + 5 * k) + '" width="' + r1(6 * k) + '" height="' + r1(6 * k) + '" ' +
      'fill="var(--glass)" stroke="var(--ink)" stroke-width="1.5"/>' +
    '<rect x="' + r1(hx + hw - 11 * k) + '" y="' + r1(hy + 5 * k) + '" width="' + r1(6 * k) + '" height="' + r1(6 * k) + '" ' +
      'fill="var(--glass)" stroke="var(--ink)" stroke-width="1.5"/>' +
    '</g>';

  // 6. locked: soft cloud cover over half the island
  if (locked) {
    svg += cloud(cx - w * 0.05, cy - h * 0.38, w * 0.55, 'island-cloud');
  }

  svg += '</svg>';
  return svg;
}

/* ---------------- world ambient layer ---------------- */

// Island centers in stage coordinates, used for the dashed routes.
function centerOf(islands, id) {
  const isl = islands.find((i) => i.id === id);
  if (!isl) return null;
  return [isl.rect[0] + isl.rect[2] / 2, isl.rect[1] + isl.rect[3] / 2];
}

const ROUTES = [
  ['sestama', 'metodologi'], ['metodologi', 'sosial'], ['sosial', 'produksi'],
  ['kepala', 'metodologi'], ['kepala', 'sosial'], ['sestama', 'distribusi'],
  ['distribusi', 'neraca'], ['neraca', 'itama'], ['metodologi', 'neraca']
];

// Fixed decorative positions in free sea (stage coordinates).
const SPARKLES = [
  [292, 120], [352, 200], [610, 200], [720, 372], [520, 382], [60, 380],
  [940, 380], [70, 540], [360, 540], [640, 545], [915, 540], [255, 375]
];
const WAVES = [
  [210, 190], [580, 175], [700, 205], [40, 400], [345, 385], [660, 380],
  [920, 200], [30, 545], [600, 540], [880, 545]
];

function sparkle(x, y, i) {
  return '<path class="sparkle" style="animation-delay:' + (i * 0.7).toFixed(1) + 's" ' +
    'd="M' + x + ' ' + (y - 6) + 'L' + (x + 1.6) + ' ' + (y - 1.6) + 'L' + (x + 6) + ' ' + y + 'L' + (x + 1.6) + ' ' + (y + 1.6) +
    'L' + x + ' ' + (y + 6) + 'L' + (x - 1.6) + ' ' + (y + 1.6) + 'L' + (x - 6) + ' ' + y + 'L' + (x - 1.6) + ' ' + (y - 1.6) + 'Z" ' +
    'fill="var(--sea-foam)"/>';
}

function wave(x, y, i) {
  return '<path class="wave" style="animation-delay:-' + (i * 0.9).toFixed(1) + 's" ' +
    'd="M' + x + ' ' + y + 'q6 -6 12 0t12 0" fill="none" stroke="var(--sea-foam)" stroke-opacity="0.6" ' +
    'stroke-width="2.5" stroke-linecap="round"/>';
}

function compass(x, y) {
  return '<g class="compass" transform="translate(' + x + ' ' + y + ')">' +
    '<circle r="26" fill="var(--paper)" stroke="var(--ink)" stroke-width="3"/>' +
    '<circle r="19" fill="none" stroke="var(--ink)" stroke-width="1.5" stroke-dasharray="2 4"/>' +
    '<path d="M0 -20L5 0L0 20L-5 0Z" fill="var(--paper)" stroke="var(--ink)" stroke-width="2" stroke-linejoin="round"/>' +
    '<path d="M0 -20L5 0L-5 0Z" fill="var(--danger)" stroke="var(--ink)" stroke-width="2" stroke-linejoin="round"/>' +
    '<path d="M-20 0L0 -4L20 0L0 4Z" fill="var(--sand)" stroke="var(--ink)" stroke-width="1.5" stroke-linejoin="round"/>' +
    '<circle r="2.5" fill="var(--ink)"/>' +
    '</g>';
}

function boatSVG() {
  return '<svg class="boat-svg" viewBox="0 0 48 40" width="48" height="40" aria-hidden="true" focusable="false">' +
    '<path d="M24 4V27" stroke="var(--ink)" stroke-width="2.5" stroke-linecap="round"/>' +
    '<path d="M26 6L40 24H26Z" fill="var(--paper)" stroke="var(--ink)" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<path d="M22 10L12 24H22Z" fill="var(--gold)" stroke="var(--ink)" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<path d="M5 27H43L37 36H11Z" fill="var(--wood)" stroke="var(--ink)" stroke-width="2.5" stroke-linejoin="round"/>' +
    '</svg>';
}

/**
 * Decorative sea layer for the world map: routes, sparkles, waves, compass, boats, clouds.
 * Entirely aria-hidden. Motion is CSS-only and disabled under reduced motion.
 * @param {Array} islands - BpsData.islands (layout truth)
 */
export function renderWorldAmbient(islands) {
  let routes = '';
  for (const [a, b] of ROUTES) {
    const p = centerOf(islands, a);
    const q = centerOf(islands, b);
    if (!p || !q) continue;
    const mx = (p[0] + q[0]) / 2;
    const my = (p[1] + q[1]) / 2;
    // bow the curve perpendicular to the segment, deterministically
    const dx = q[0] - p[0];
    const dy = q[1] - p[1];
    const len = Math.hypot(dx, dy) || 1;
    const bow = 18;
    const c = [mx - (dy / len) * bow, my + (dx / len) * bow];
    routes += '<path d="M' + r1(p[0]) + ' ' + r1(p[1]) + 'Q' + r1(c[0]) + ' ' + r1(c[1]) + ' ' + r1(q[0]) + ' ' + r1(q[1]) + '"/>';
  }

  let svg = '<svg class="world-sea-svg" viewBox="0 0 960 560" width="960" height="560" aria-hidden="true" focusable="false">' +
    '<g class="routes" fill="none" stroke="var(--paper)" stroke-opacity="0.75" stroke-width="3" stroke-dasharray="2 9" stroke-linecap="round">' +
      routes + '</g>' +
    '<g class="waves">' + WAVES.map((p, i) => wave(p[0], p[1], i)).join('') + '</g>' +
    '<g class="sparkles">' + SPARKLES.map((p, i) => sparkle(p[0], p[1], i)).join('') + '</g>' +
    compass(645, 128) +
    '</svg>';

  const boats =
    '<div class="boat boat-a"><div class="boat-bob">' + boatSVG() + '</div></div>' +
    '<div class="boat boat-b"><div class="boat-bob">' + boatSVG() + '</div></div>';

  const clouds =
    '<svg class="sky-cloud sky-cloud-a" viewBox="0 0 120 56" width="120" height="56" aria-hidden="true" focusable="false">' + cloud(4, 6, 112, '') + '</svg>' +
    '<svg class="sky-cloud sky-cloud-b" viewBox="0 0 96 46" width="96" height="46" aria-hidden="true" focusable="false">' + cloud(4, 5, 88, '') + '</svg>' +
    '<svg class="sky-cloud sky-cloud-c" viewBox="0 0 80 40" width="80" height="40" aria-hidden="true" focusable="false">' + cloud(4, 4, 72, '') + '</svg>';

  return '<div class="world-ambient" aria-hidden="true">' + svg + boats + clouds + '</div>';
}

/* ---------------- island screen ---------------- */

/**
 * Large island base for the #/island screen (sand, grass, perimeter trees).
 * @param {number} w
 * @param {number} h
 */
export function renderBigIslandSVG(w, h) {
  const jitter = makeJitter('island:sestama-main', 14, 0.08);
  const cx = w / 2;
  const cy = h / 2;
  const gx = w * 0.45;
  const gy = h * 0.4;

  let svg = '<svg class="big-island-svg" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" aria-hidden="true" focusable="false">';
  svg += '<path d="' + blobPath(cx, cy + 6, w * 0.5, h * 0.5, jitter) + '" fill="var(--ocean-shallow)" fill-opacity="0.75"/>';
  svg += '<path d="' + blobPath(cx, cy + 4, w * 0.48, h * 0.46, jitter) + '" fill="var(--sand)" stroke="var(--ink)" stroke-width="3"/>';
  svg += '<path d="' + blobPath(cx, cy + 6, gx, gy, jitter) + '" fill="var(--grass-shade)"/>';
  svg += '<path d="' + blobPath(cx, cy - 2, gx, gy, jitter) + '" fill="var(--grass)" stroke="var(--ink)" stroke-width="2.5"/>';

  // footpaths behind the two building rows
  svg += '<g fill="none" stroke="var(--footpath)" stroke-width="16" stroke-linecap="round" stroke-opacity="0.9">' +
    '<path d="M' + r1(w * 0.14) + ' ' + r1(h * 0.37) + 'H' + r1(w * 0.86) + '"/>' +
    '<path d="M' + r1(w * 0.22) + ' ' + r1(h * 0.71) + 'H' + r1(w * 0.78) + '"/>' +
    '<path d="M' + r1(w * 0.5) + ' ' + r1(h * 0.37) + 'V' + r1(h * 0.71) + '"/>' +
    '</g>';

  // perimeter trees (deterministic angles; avoid the building rows)
  const angles = [200, 215, 232, 250, 290, 308, 325, 340, 160, 145, 128, 52, 35, 20];
  for (let i = 0; i < angles.length; i++) {
    const a = (angles[i] * Math.PI) / 180;
    const tx = cx + Math.cos(a) * gx * 0.9;
    const ty = cy - 2 + Math.sin(a) * gy * 0.82;
    svg += tree(tx, ty, i % 3 === 0 ? 15 : 12, 'var(--tree)');
  }
  // a small pier on the south shore
  svg += '<g class="pier">' +
    '<rect x="' + r1(cx - 9) + '" y="' + r1(h * 0.88) + '" width="18" height="' + r1(h * 0.1) + '" fill="var(--wood)" stroke="var(--ink)" stroke-width="2.5"/>' +
    '<path d="M' + r1(cx - 9) + ' ' + r1(h * 0.92) + 'h18M' + r1(cx - 9) + ' ' + r1(h * 0.95) + 'h18" stroke="var(--ink)" stroke-width="1.5"/>' +
    '</g>';
  svg += '</svg>';
  return svg;
}

const BUILDING_VARIANTS = ['gable', 'flat', 'dome', 'tower', 'gable', 'flat', 'dome'];

/**
 * Small illustrated biro building (72x80 viewBox).
 * @param {{id:string}} biro
 * @param {number} index - position in BpsData.biros (selects a variant)
 * @param {string} tintVar - CSS color for the roof, e.g. 'var(--unit-biro-tint)'
 */
export function renderBiroBuildingSVG(biro, index, tintVar) {
  const variant = BUILDING_VARIANTS[index % BUILDING_VARIANTS.length];
  const ink = 'stroke="var(--ink)" stroke-width="2.5" stroke-linejoin="round"';
  let roof = '';
  let bodyY = 30;
  let bodyH = 40;

  if (variant === 'gable') {
    roof = '<path d="M8 32L36 8L64 32Z" fill="' + tintVar + '" ' + ink + '/>';
  } else if (variant === 'flat') {
    bodyY = 24; bodyH = 46;
    roof = '<rect x="10" y="16" width="52" height="10" rx="2" fill="' + tintVar + '" ' + ink + '/>' +
      '<path d="M50 16V4" stroke="var(--ink)" stroke-width="2.5" stroke-linecap="round"/>' +
      '<path d="M50 4H60L57 8L60 12H50" fill="var(--gold)" ' + ink + '/>';
  } else if (variant === 'dome') {
    roof = '<path d="M12 32A24 22 0 0 1 60 32Z" fill="' + tintVar + '" ' + ink + '/>' +
      '<circle cx="36" cy="9" r="3" fill="var(--gold)" stroke="var(--ink)" stroke-width="2"/>';
  } else {
    bodyY = 22; bodyH = 48;
    roof = '<path d="M14 24L36 4L58 24Z" fill="' + tintVar + '" ' + ink + '/>' +
      '<rect x="30" y="12" width="12" height="8" rx="1" fill="var(--glass)" stroke="var(--ink)" stroke-width="2"/>';
  }

  const winY1 = bodyY + 8;
  const winY2 = bodyY + 20;
  const win = (x, y) => '<rect x="' + x + '" y="' + y + '" width="9" height="8" rx="1" fill="var(--glass)" stroke="var(--ink)" stroke-width="2"/>';

  return '<svg class="biro-building-svg" viewBox="0 0 72 80" width="72" height="80" aria-hidden="true" focusable="false">' +
    '<ellipse cx="36" cy="74" rx="30" ry="5" fill="var(--ink)" fill-opacity="0.22"/>' +
    '<rect x="12" y="' + bodyY + '" width="48" height="' + bodyH + '" rx="3" fill="var(--paper)" ' + ink + '/>' +
    roof +
    win(18, winY1) + win(45, winY1) + win(18, winY2) + win(45, winY2) +
    '<path d="M30 70V' + (bodyY + bodyH - 16) + 'a6 6 0 0 1 12 0V70Z" fill="' + tintVar + '" ' + ink + '/>' +
    '</svg>';
}

export const IslandArt = {
  renderIslandSVG,
  renderWorldAmbient,
  renderBigIslandSVG,
  renderBiroBuildingSVG,
  starBadge: () => icon('starFilled', { size: 'l' }),
  lockIcon: () => icon('lock', { size: 's' })
};

export default IslandArt;
