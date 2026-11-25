// Canvas drawing for the office floor plan (#/office). Visuals only.
// Colors and fonts come from tokens.css, read once at mount (readOfficeTheme).
// Static pieces (floor, rooms, doors, furniture, board, labels) are drawn once
// into an offscreen layer; dynamic pieces (glow, avatar, bubble) every frame
// without allocating.

/* ---------------- theme ---------------- */

export function readOfficeTheme() {
  const cs = getComputedStyle(document.documentElement);
  const v = (name) => cs.getPropertyValue(name).trim() || 'black';
  const T = {
    ink: v('--ink'),
    inkSoft: v('--ink-soft'),
    inkShadow: v('--ink-shadow'),
    paper: v('--paper'),
    white: v('--white'),
    gold: v('--gold'),
    goldShade: v('--gold-shade'),
    glass: v('--glass'),
    wood: v('--wood'),
    tree: v('--tree'),
    danger: v('--danger'),
    ocean: v('--ocean-3'),
    floor: v('--office-floor'),
    floorLine: v('--office-floor-line'),
    wallTop: v('--office-wall-top'),
    carpet: v('--room-carpet'),
    carpetDot: v('--room-carpet-dot'),
    tile: v('--room-tile'),
    tileLine: v('--room-tile-line'),
    green: v('--room-green'),
    greenLine: v('--room-green-line'),
    woodFloor: v('--room-wood'),
    woodLine: v('--room-wood-line'),
    sofa: v('--sofa'),
    rug: v('--rug'),
    skin: v('--skin'),
    hair: v('--hair'),
    shirt: v('--unit-sestama-tint'),
    boardGlow: v('--board-glow')
  };
  const display = v('--font-display');
  const body = v('--font-body');
  T.fonts = {
    display,
    body,
    floorLabel: '600 26px ' + display,
    nameTag: '700 13px ' + body,
    bubble: '800 14px ' + body,
    keycap: '600 15px ' + display
  };
  return T;
}

/* ---------------- primitives ---------------- */

function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

function box(ctx, T, x, y, w, h, fill, r = 3, lw = 2.5) {
  roundRectPath(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = lw;
  ctx.strokeStyle = T.ink;
  ctx.stroke();
}

function disc(ctx, T, x, y, r, fill, lw = 2) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = lw;
  ctx.strokeStyle = T.ink;
  ctx.stroke();
}

/* ---------------- room floor textures ---------------- */

const ROOM_KIND = {
  'Rapat 2': 'carpet',
  'Pintu Keluar': 'tile',
  'WC Perempuan': 'tile',
  'WC Pria': 'tile',
  'R. Sholat': 'green',
  'R. Pembinaan': 'carpet',
  'R. Pantry': 'wood',
  'Perkap': 'tile',
  'R. Kolaborasi': 'green',
  'R. Tunggu': 'wood',
  'Rapat 1': 'carpet',
  'Ruang Kepala Biro SDM': 'carpet'
};

function drawRoomFloor(ctx, T, r) {
  const kind = ROOM_KIND[r.name] || 'tile';
  ctx.save();
  ctx.beginPath();
  ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();

  if (kind === 'carpet') {
    ctx.fillStyle = T.carpet;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = T.carpetDot;
    for (let yy = r.y + 8; yy < r.y + r.h; yy += 16) {
      for (let xx = r.x + 8 + ((yy - r.y) % 32 === 8 ? 0 : 8); xx < r.x + r.w; xx += 16) {
        ctx.beginPath();
        ctx.arc(xx, yy, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (kind === 'tile') {
    ctx.fillStyle = T.tile;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = T.tileLine;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let xx = r.x + 20; xx < r.x + r.w; xx += 20) { ctx.moveTo(xx, r.y); ctx.lineTo(xx, r.y + r.h); }
    for (let yy = r.y + 20; yy < r.y + r.h; yy += 20) { ctx.moveTo(r.x, yy); ctx.lineTo(r.x + r.w, yy); }
    ctx.stroke();
  } else if (kind === 'green') {
    ctx.fillStyle = T.green;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = T.greenLine;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let d = -r.h; d < r.w; d += 16) { ctx.moveTo(r.x + d, r.y + r.h); ctx.lineTo(r.x + d + r.h, r.y); }
    ctx.stroke();
  } else {
    ctx.fillStyle = T.woodFloor;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = T.woodLine;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    let row = 0;
    for (let yy = r.y + 14; yy < r.y + r.h + 14; yy += 14, row++) {
      ctx.moveTo(r.x, yy); ctx.lineTo(r.x + r.w, yy);
      for (let xx = r.x + (row % 2 ? 22 : 48); xx < r.x + r.w; xx += 56) {
        ctx.moveTo(xx, yy - 14); ctx.lineTo(xx, yy);
      }
    }
    ctx.stroke();
  }
  ctx.restore();
}

/* ---------------- walls & doors ---------------- */

// Door gaps are visual cues only; collision still uses the full room rectangles.
// [room index in ROOMS, side, position along the side 0..1]
const DOORS = [
  [0, 'bottom', 0.5], [1, 'bottom', 0.5], [2, 'bottom', 0.5], [3, 'bottom', 0.5],
  [4, 'top', 0.2], [5, 'top', 0.5], [6, 'left', 0.5], [7, 'right', 0.5], [8, 'right', 0.5],
  [9, 'top', 0.5], [10, 'top', 0.5], [11, 'top', 0.5], [12, 'top', 0.3]
];
const DOOR_W = 30;

function strokeWall(ctx, T, x, y, w, h, lw) {
  ctx.lineWidth = lw;
  ctx.strokeStyle = T.ink;
  ctx.strokeRect(x, y, w, h);
  // lighter top edge for a hint of wall thickness
  ctx.lineWidth = 2;
  ctx.strokeStyle = T.wallTop;
  ctx.strokeRect(x, y - lw * 0.3, w, h);
}

function drawDoor(ctx, T, room, side, t) {
  const g = DOOR_W / 2;
  let cx;
  let cy;
  let horizontal;
  if (side === 'top' || side === 'bottom') {
    cx = room.x + room.w * t;
    cy = side === 'top' ? room.y : room.y + room.h;
    horizontal = true;
  } else {
    cx = side === 'left' ? room.x : room.x + room.w;
    cy = room.y + room.h * t;
    horizontal = false;
  }

  // gap in the wall
  ctx.fillStyle = T.floor;
  if (horizontal) ctx.fillRect(cx - g, cy - 5, DOOR_W, 10);
  else ctx.fillRect(cx - 5, cy - g, 10, DOOR_W);

  // door posts
  ctx.fillStyle = T.ink;
  if (horizontal) {
    ctx.fillRect(cx - g - 3, cy - 5, 4, 10);
    ctx.fillRect(cx + g - 1, cy - 5, 4, 10);
  } else {
    ctx.fillRect(cx - 5, cy - g - 3, 10, 4);
    ctx.fillRect(cx - 5, cy + g - 1, 10, 4);
  }

  // open door leaf + swing arc, inside the room
  const inward = (side === 'top' || side === 'left') ? 1 : -1;
  ctx.strokeStyle = T.inkSoft;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  if (horizontal) {
    ctx.moveTo(cx - g, cy);
    ctx.lineTo(cx - g, cy + inward * DOOR_W);
  } else {
    ctx.moveTo(cx, cy - g);
    ctx.lineTo(cx + inward * DOOR_W, cy - g);
  }
  ctx.stroke();
  ctx.setLineDash([3, 4]);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (horizontal) {
    const a0 = inward > 0 ? 0 : -Math.PI / 2;
    ctx.arc(cx - g, cy, DOOR_W, a0, a0 + Math.PI / 2);
  } else {
    const a0 = inward > 0 ? 0 : Math.PI / 2;
    ctx.arc(cx, cy - g, DOOR_W, a0, a0 + Math.PI / 2);
  }
  ctx.stroke();
  ctx.setLineDash([]);
}

/* ---------------- furniture ---------------- */

function desk(ctx, T, x, y) {
  disc(ctx, T, x + 25, y + 36, 8, T.inkSoft);            // chair
  box(ctx, T, x, y, 50, 28, T.wood, 3);                   // desk
  ctx.fillStyle = T.ink;                                  // monitor
  ctx.fillRect(x + 15, y + 4, 20, 12);
  ctx.fillStyle = T.glass;
  ctx.fillRect(x + 17, y + 6, 16, 7);
  ctx.fillStyle = T.ink;
  ctx.fillRect(x + 23, y + 16, 4, 4);
}

function plant(ctx, T, x, y) {
  box(ctx, T, x - 7, y, 14, 12, T.rug, 2, 2);
  disc(ctx, T, x - 5, y - 4, 7, T.tree, 2);
  disc(ctx, T, x + 5, y - 5, 7, T.tree, 2);
  disc(ctx, T, x, y - 11, 7, T.tree, 2);
}

function chairsAlong(ctx, T, x, y0, y1, count) {
  const step = (y1 - y0) / (count - 1);
  for (let i = 0; i < count; i++) disc(ctx, T, x, y0 + i * step, 7, T.inkSoft);
}

function roundTable(ctx, T, x, y) {
  disc(ctx, T, x - 22, y, 7, T.inkSoft);
  disc(ctx, T, x + 22, y, 7, T.inkSoft);
  disc(ctx, T, x, y - 22, 7, T.inkSoft);
  disc(ctx, T, x, y + 22, 7, T.inkSoft);
  disc(ctx, T, x, y, 15, T.wood, 2.5);
}

function sofa(ctx, T, x, y, w, h) {
  box(ctx, T, x, y, w, h, T.sofa, 5);
  ctx.strokeStyle = T.ink;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (w > h) { ctx.moveTo(x + 4, y + h * 0.4); ctx.lineTo(x + w - 4, y + h * 0.4); }
  else { ctx.moveTo(x + w * 0.4, y + 4); ctx.lineTo(x + w * 0.4, y + h - 4); }
  ctx.stroke();
}

function prayerRug(ctx, T, x, y) {
  box(ctx, T, x, y, 30, 20, T.rug, 2, 2);
  ctx.strokeStyle = T.gold;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 4, y + 4, 22, 12);
}

function toilet(ctx, T, x, y) {
  box(ctx, T, x - 8, y - 18, 16, 7, T.white, 2, 2);
  ctx.beginPath();
  ctx.ellipse(x, y, 8, 10, 0, 0, Math.PI * 2);
  ctx.fillStyle = T.white;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = T.ink;
  ctx.stroke();
}

// Open-plan desks ("Area Meja Pegawai") and corridor plants, in world units.
const OPEN_DESKS = [
  [220, 88], [290, 88], [360, 88], [430, 88], [500, 88], [570, 88], [640, 88],
  [220, 200], [290, 200], [360, 200], [500, 200], [570, 200], [640, 200],
  [600, 330], [670, 330], [740, 330], [810, 330],
  [600, 450], [670, 450], [740, 450], [810, 450]
];
const PLANTS = [[92, 258], [708, 80], [415, 484], [855, 270], [1262, 262], [1020, 270]];

// Room interiors keyed by room name. Coordinates are absolute world units.
const INTERIORS = {
  'Rapat 2': (ctx, T) => {
    chairsAlong(ctx, T, 98, 140, 200, 3);
    chairsAlong(ctx, T, 162, 140, 200, 3);
    box(ctx, T, 108, 128, 44, 84, T.wood, 6);
  },
  'Rapat 1': (ctx, T) => {
    chairsAlong(ctx, T, 995, 380, 450, 3);
    chairsAlong(ctx, T, 1071, 380, 450, 3);
    box(ctx, T, 1005, 365, 56, 100, T.wood, 6);
  },
  'Ruang Kepala Biro SDM': (ctx, T) => {
    box(ctx, T, 1170, 445, 92, 34, T.rug, 4, 2);
    disc(ctx, T, 1216, 422, 8, T.inkSoft);
    desk(ctx, T, 1191, 382);
    sofa(ctx, T, 1116, 392, 18, 72);
    plant(ctx, T, 1266, 466);
  },
  'Pintu Keluar': (ctx, T) => {
    box(ctx, T, 856, 118, 104, 70, T.tile, 2, 2);
    ctx.strokeStyle = T.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let yy = 128; yy < 188; yy += 10) { ctx.moveTo(856, yy); ctx.lineTo(960, yy); }
    ctx.stroke();
    box(ctx, T, 878, 206, 60, 16, T.rug, 3, 2);
  },
  'WC Perempuan': (ctx, T) => {
    toilet(ctx, T, 1030, 160); toilet(ctx, T, 1070, 160); toilet(ctx, T, 1110, 160);
  },
  'WC Pria': (ctx, T) => {
    toilet(ctx, T, 1180, 160); toilet(ctx, T, 1235, 160);
  },
  'R. Sholat': (ctx, T) => {
    prayerRug(ctx, T, 138, 368); prayerRug(ctx, T, 176, 368);
    prayerRug(ctx, T, 214, 368); prayerRug(ctx, T, 252, 368);
  },
  'R. Pembinaan': (ctx, T) => {
    plant(ctx, T, 376, 376);
  },
  'R. Pantry': (ctx, T, r) => {
    if (r.h > 80) {
      box(ctx, T, 132, 402, 126, 14, T.wood, 2);
      box(ctx, T, 140, 404, 18, 10, T.glass, 2, 1.5);
      disc(ctx, T, 232, 478, 11, T.wood);
      plant(ctx, T, 142, 482);
    } else {
      box(ctx, T, 276, 486, 104, 8, T.wood, 2, 2);
    }
  },
  'Perkap': (ctx, T) => {
    box(ctx, T, 360, 402, 22, 13, T.wood, 2, 2);
    box(ctx, T, 360, 416, 22, 13, T.wood, 2, 2);
    box(ctx, T, 360, 430, 22, 13, T.wood, 2, 2);
  },
  'R. Kolaborasi': (ctx, T) => {
    roundTable(ctx, T, 480, 392);
    roundTable(ctx, T, 540, 440);
    sofa(ctx, T, 452, 468, 54, 16);
  },
  'R. Tunggu': (ctx, T) => {
    sofa(ctx, T, 881, 362, 18, 80);
    disc(ctx, T, 928, 402, 9, T.wood);
    plant(ctx, T, 944, 470);
  }
};

/* ---------------- labels ---------------- */

const TALL_ROOM = 120; // rooms at least this tall put the label near the top

function labelLines(ctx, T, r) {
  if (r.name === 'Ruang Kepala Biro SDM') return { lines: ['Ruang Kepala', 'Biro SDM'], size: 16 };
  if (r.name === 'WC Perempuan') return { lines: ['WC', 'Perempuan'], size: 16 };
  const maxW = r.w - 16;
  for (let size = 17; size >= 13; size--) {
    ctx.font = '600 ' + size + 'px ' + T.fonts.display;
    if (ctx.measureText(r.name).width <= maxW) return { lines: [r.name], size };
  }
  const cut = r.name.lastIndexOf(' ');
  return { lines: cut > 0 ? [r.name.slice(0, cut), r.name.slice(cut + 1)] : [r.name], size: 14 };
}

function drawRoomLabel(ctx, T, r) {
  const { lines, size } = labelLines(ctx, T, r);
  ctx.font = '600 ' + size + 'px ' + T.fonts.display;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const lineH = size + 4;
  let textW = 0;
  for (let i = 0; i < lines.length; i++) textW = Math.max(textW, ctx.measureText(lines[i]).width);
  const plateW = Math.min(textW + 12, r.w - 8);
  const plateH = lines.length * lineH + 6;
  const cx = r.x + r.w / 2;
  const top = r.h >= TALL_ROOM ? r.y + 10 : r.y + (r.h - plateH) / 2 - (r.h < 70 ? 0 : 6);

  box(ctx, T, cx - plateW / 2, top, plateW, plateH, T.paper, 5, 2);
  ctx.fillStyle = T.ink;
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], cx, top + 3 + lineH / 2 + i * lineH + 1);
  }
}

/* ---------------- board ---------------- */

function drawBoardStatic(ctx, T, board, center) {
  roundRectPath(ctx, board.x, board.y, board.w, board.h, 12);
  ctx.fillStyle = T.gold;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = T.ink;
  ctx.stroke();
  // inner bevel
  roundRectPath(ctx, board.x + 6, board.y + 6, board.w - 12, board.h - 12, 8);
  ctx.lineWidth = 2;
  ctx.strokeStyle = T.goldShade;
  ctx.stroke();
  // label runs along the board; shrink until it fits inside the bevel
  const maxLen = board.h - 22;
  let size = 16;
  ctx.font = '600 ' + size + 'px ' + T.fonts.display;
  while (size > 11 && ctx.measureText(board.label).width > maxLen) {
    size -= 1;
    ctx.font = '600 ' + size + 'px ' + T.fonts.display;
  }

  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = T.ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(board.label, 0, 0);
  ctx.restore();
}

/* ---------------- static layer ---------------- */

/**
 * Draws everything that never changes, in world coordinates. The caller sets
 * the world transform on ctx.
 */
export function drawStaticWorld(ctx, T, world) {
  const { FLOOR, ROOMS, BOARD, BOARD_CENTER, FLOOR_LABELS } = world;

  // floor with tile grid
  ctx.fillStyle = T.floor;
  ctx.fillRect(FLOOR.x, FLOOR.y, FLOOR.w, FLOOR.h);
  ctx.strokeStyle = T.floorLine;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let x = FLOOR.x + 40; x < FLOOR.x + FLOOR.w; x += 40) { ctx.moveTo(x, FLOOR.y); ctx.lineTo(x, FLOOR.y + FLOOR.h); }
  for (let y = FLOOR.y + 40; y < FLOOR.y + FLOOR.h; y += 40) { ctx.moveTo(FLOOR.x, y); ctx.lineTo(FLOOR.x + FLOOR.w, y); }
  ctx.stroke();

  // open-plan furniture and plants (under walls/labels)
  for (let i = 0; i < OPEN_DESKS.length; i++) desk(ctx, T, OPEN_DESKS[i][0], OPEN_DESKS[i][1]);
  for (let i = 0; i < PLANTS.length; i++) plant(ctx, T, PLANTS[i][0], PLANTS[i][1]);

  // room floors, walls, doors, interiors
  for (let i = 0; i < ROOMS.length; i++) drawRoomFloor(ctx, T, ROOMS[i]);
  for (let i = 0; i < ROOMS.length; i++) {
    const r = ROOMS[i];
    strokeWall(ctx, T, r.x, r.y, r.w, r.h, 6);
  }
  strokeWall(ctx, T, FLOOR.x, FLOOR.y, FLOOR.w, FLOOR.h, 9);
  for (let i = 0; i < DOORS.length; i++) {
    const room = ROOMS[DOORS[i][0]];
    if (room) drawDoor(ctx, T, room, DOORS[i][1], DOORS[i][2]);
  }
  for (let i = 0; i < ROOMS.length; i++) {
    const fn = INTERIORS[ROOMS[i].name];
    if (fn) fn(ctx, T, ROOMS[i]);
  }

  // open-area labels
  ctx.font = T.fonts.floorLabel;
  ctx.fillStyle = T.inkSoft;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < FLOOR_LABELS.length; i++) {
    ctx.fillText(FLOOR_LABELS[i].text, FLOOR_LABELS[i].x, FLOOR_LABELS[i].y);
  }

  for (let i = 0; i < ROOMS.length; i++) drawRoomLabel(ctx, T, ROOMS[i]);
  drawBoardStatic(ctx, T, BOARD, BOARD_CENTER);
}

/* ---------------- dynamic layer ---------------- */

/** Soft pulsing glow around the board (the only blur in the UI). */
export function drawBoardGlow(ctx, T, board, pulse, blurScale) {
  ctx.save();
  ctx.shadowColor = T.boardGlow;
  ctx.shadowBlur = (10 + 12 * pulse) * blurScale;
  ctx.globalAlpha = 0.55 + 0.45 * pulse;
  roundRectPath(ctx, board.x - 3, board.y - 3, board.w + 6, board.h + 6, 14);
  ctx.lineWidth = 5;
  ctx.strokeStyle = T.gold;
  ctx.stroke();
  ctx.restore();
}

/**
 * Procedural avatar. pose = { bob, step, fx, fy } where step is 0/1 walk frame,
 * fx/fy in -1..1 is the facing hint.
 */
export function drawAvatar(ctx, T, x, y, pose) {
  const bob = pose.bob;
  // contact shadow
  ctx.beginPath();
  ctx.ellipse(x, y + 19, 17, 5.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = T.inkShadow;
  ctx.fill();

  // feet (alternate when walking)
  const lift = pose.step ? 3 : 0;
  ctx.fillStyle = T.ink;
  ctx.beginPath();
  ctx.ellipse(x - 7, y + 15 - lift, 5, 4, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 7, y + 15 - (pose.moving ? 3 - lift : 0), 5, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // body / shirt
  roundRectPath(ctx, x - 14, y - 6 + bob, 28, 22, 9);
  ctx.fillStyle = T.shirt;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = T.ink;
  ctx.stroke();

  // head
  const hy = y - 16 + bob;
  ctx.beginPath();
  ctx.arc(x, hy, 12, 0, Math.PI * 2);
  ctx.fillStyle = pose.fy < 0 ? T.hair : T.skin;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = T.ink;
  ctx.stroke();

  if (pose.fy >= 0) {
    // hair cap, shifted opposite to facing so the face shows the direction
    ctx.beginPath();
    ctx.arc(x - pose.fx * 2, hy - 2, 12, Math.PI * 1.08, Math.PI * 1.92);
    ctx.closePath();
    ctx.fillStyle = T.hair;
    ctx.fill();
    // eyes
    ctx.fillStyle = T.ink;
    ctx.beginPath();
    ctx.arc(x - 4 + pose.fx * 4, hy + 2 + pose.fy * 1.5, 1.8, 0, Math.PI * 2);
    ctx.arc(x + 4 + pose.fx * 4, hy + 2 + pose.fy * 1.5, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Name tag under the avatar. label/width are cached by the caller. */
export function drawNameTag(ctx, T, x, y, label, textW) {
  const w = textW + 14;
  const h = 19;
  const top = y + 26;
  roundRectPath(ctx, x - w / 2, top + 2, w, h, 9);
  ctx.fillStyle = T.inkShadow;
  ctx.fill();
  roundRectPath(ctx, x - w / 2, top, w, h, 9);
  ctx.fillStyle = T.paper;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = T.ink;
  ctx.stroke();
  ctx.font = T.fonts.nameTag;
  ctx.fillStyle = T.ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x, top + h / 2 + 1);
}

/** Truncates a name to fit maxW using the name-tag font (call only on change). */
export function fitNameTag(ctx, T, name, maxW) {
  ctx.font = T.fonts.nameTag;
  let text = name;
  if (ctx.measureText(text).width > maxW) {
    while (text.length > 1 && ctx.measureText(text + '…').width > maxW) text = text.slice(0, -1);
    text = text + '…';
  }
  return { text, width: ctx.measureText(text).width };
}

/** "Tekan [E]" speech bubble with a keycap, above the avatar. */
export function drawKeycapBubble(ctx, T, x, y) {
  const w = 96;
  const h = 34;
  const bx = x - w / 2;
  const by = y - 72;

  // hard shadow
  roundRectPath(ctx, bx, by + 3, w, h, 9);
  ctx.fillStyle = T.inkShadow;
  ctx.fill();

  // bubble + tail
  ctx.beginPath();
  ctx.moveTo(bx + 9, by);
  ctx.lineTo(bx + w - 9, by);
  ctx.quadraticCurveTo(bx + w, by, bx + w, by + 9);
  ctx.lineTo(bx + w, by + h - 9);
  ctx.quadraticCurveTo(bx + w, by + h, bx + w - 9, by + h);
  ctx.lineTo(x + 7, by + h);
  ctx.lineTo(x, by + h + 8);
  ctx.lineTo(x - 7, by + h);
  ctx.lineTo(bx + 9, by + h);
  ctx.quadraticCurveTo(bx, by + h, bx, by + h - 9);
  ctx.lineTo(bx, by + 9);
  ctx.quadraticCurveTo(bx, by, bx + 9, by);
  ctx.closePath();
  ctx.fillStyle = T.paper;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = T.ink;
  ctx.stroke();

  ctx.font = T.fonts.bubble;
  ctx.fillStyle = T.ink;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('Tekan', bx + 12, by + h / 2 + 1);

  // keycap
  const kx = bx + w - 36;
  const ky = by + 5;
  roundRectPath(ctx, kx, ky + 3, 24, 22, 5);
  ctx.fillStyle = T.goldShade;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = T.ink;
  ctx.stroke();
  roundRectPath(ctx, kx, ky, 24, 21, 5);
  ctx.fillStyle = T.gold;
  ctx.fill();
  ctx.stroke();
  ctx.font = T.fonts.keycap;
  ctx.fillStyle = T.ink;
  ctx.textAlign = 'center';
  ctx.fillText('E', kx + 12, ky + 11);
}
