// Screen 3: Office floor-plan screen with a walkable avatar on HTML Canvas
import { AppState } from '../state/index.js';
import { Hud } from '../ui/hud.js';
import { openInfoPanel, isInfoPanelOpen, setPanelCallback } from '../ui/panel.js';
import { icon } from '../ui/icons.js';
import {
  readOfficeTheme,
  drawStaticWorld,
  drawBoardGlow,
  drawAvatar,
  drawNameTag,
  fitNameTag,
  drawKeycapBubble
} from '../ui/office-art.js';

let unsubscribeState = null;

// ---------------------------------------------------------------------------
// Data Definitions: Floor, Rooms (Obstacles), Board, and Labels
// ---------------------------------------------------------------------------
const FLOOR = {
  x: 70,
  y: 70,
  w: 1215,
  h: 430,
  fill: '#E8EEF6',
  stroke: '#1E3A5F',
  strokeWidth: 6
};

const ROOMS = [
  { name: 'Rapat 2', x: 70, y: 70, w: 120, h: 170, fill: '#CFE3F7' },
  { name: 'Pintu Keluar', x: 818, y: 70, w: 180, h: 175, fill: '#D9D9E3' },
  { name: 'WC Perempuan', x: 1000, y: 70, w: 140, h: 155, fill: '#D9D9E3' },
  { name: 'WC Pria', x: 1145, y: 70, w: 125, h: 155, fill: '#D9D9E3' },
  { name: 'R. Sholat', x: 125, y: 310, w: 165, h: 85, fill: '#D5ECD0' },
  { name: 'R. Pembinaan', x: 290, y: 305, w: 100, h: 90, fill: '#CFE3F7' },
  { name: 'R. Pantry', x: 125, y: 395, w: 140, h: 105, fill: '#F7E6C4' },
  { name: 'Perkap', x: 265, y: 395, w: 125, h: 55, fill: '#CFE3F7' },
  { name: 'R. Pantry', x: 265, y: 450, w: 125, h: 50, fill: '#F7E6C4' },
  { name: 'R. Kolaborasi', x: 440, y: 310, w: 140, h: 180, fill: '#D5ECD0' },
  { name: 'R. Tunggu', x: 873, y: 310, w: 90, h: 185, fill: '#F7E6C4' },
  { name: 'Rapat 1', x: 963, y: 310, w: 140, h: 180, fill: '#CFE3F7' },
  { name: 'Ruang Kepala Biro SDM', x: 1105, y: 305, w: 175, h: 185, fill: '#CFE3F7' }
];

const FLOOR_LABELS = [
  { text: 'Area Meja Pegawai', x: 380, y: 170 },
  { text: 'Area Meja Pegawai', x: 620, y: 415 }
];

const BOARD = {
  x: 765,
  y: 95,
  w: 46,
  h: 140,
  radius: 18,
  fill: '#FFD24A',
  stroke: '#B8860B',
  strokeWidth: 5,
  label: 'Papan Informasi'
};

const BOARD_CENTER = { x: 788, y: 165 };
const INTERACTION_DISTANCE = 80;

// World bounds and transformation constants
const WORLD_OFFSET_X = 60;
const WORLD_OFFSET_Y = 60;
const WORLD_WIDTH = 1240; // 1300 - 60
const CANVAS_CSS_W = 920;
const CANVAS_CSS_H = 382;
const WORLD_SCALE = CANVAS_CSS_W / WORLD_WIDTH; // 920 / 1240

// Same obstacle list as before (rooms + board), built once instead of per move.
const OBSTACLES = ROOMS.concat([BOARD]);

// Visual-only constants
const MAX_RENDER_SCALE = 3;      // cap on backing-store density (dpr x stage scale)
const WALK_FRAME_MS = 140;       // two-frame walk cycle
const NAME_TAG_MAX_W = 150;      // world units
const WORLD_VIEW = { FLOOR, ROOMS, BOARD, BOARD_CENTER, FLOOR_LABELS };

export const OfficeScreen = {
  mount(container) {
    this.container = container;
    this.active = true;
    this.isPaused = false;
    this.rafId = null;
    this.lastTime = 0;

    // Avatar state
    this.avatar = {
      x: 700,
      y: 290,
      radius: 22,
      speed: 220 // px/sec
    };

    // Input keys state
    this.keys = {
      up: false,
      down: false,
      left: false,
      right: false
    };

    this.render();
    this.setupCanvas();
    this.bindEvents();

    this.onPanelChange = (isOpen) => {
      this.isPaused = isOpen;
      if (!isOpen) {
        this.lastTime = performance.now();
      }
    };
    setPanelCallback(this.onPanelChange);

    if (isInfoPanelOpen()) {
      this.isPaused = true;
    }

    this.lastTime = performance.now();
    this.gameLoop = this.gameLoop.bind(this);
    this.rafId = requestAnimationFrame(this.gameLoop);

    unsubscribeState = AppState.subscribe(() => {
      this.updateHud();
    });
  },

  unmount() {
    if (typeof unsubscribeState === 'function') {
      unsubscribeState();
      unsubscribeState = null;
    }

    this.active = false;

    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    setPanelCallback(null);
    this.onPanelChange = null;

    this.unbindEvents();

    if (this.container) {
      this.container.innerHTML = '';
    }
  },

  render() {
    let html = '<div class="screen screen-office">';

    // Left HUD Card (with back button)
    html += '<div class="hud-left-wrapper">';
    html += Hud.renderLeftCard({
      title: 'Biro SDM',
      subtitle: 'Lantai kantor',
      hasBack: true
    });
    html += '</div>';

    // Right HUD Card
    html += '<div class="hud-right-wrapper">';
    html += Hud.renderRightCard(AppState);
    html += '</div>';

    // Interactive Floor-Plan Canvas (position 20, 96; 920x382 CSS px)
    html += '<canvas id="office-canvas" width="920" height="382" aria-label="Denah Lantai Kantor Biro SDM"></canvas>';

    // Bottom-left hint text
    html += '<div class="office-hint-text">' +
      '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / panah: bergerak' +
      '<span class="office-hint-sep" aria-hidden="true">·</span>' +
      '<kbd>E</kbd> baca papan informasi' +
    '</div>';

    // On-screen D-Pad (bottom-right of the stage)
    html += '<div class="office-dpad" aria-label="Navigasi D-Pad">';
    const chev = icon('chevronRight', { size: 'l' });
    html += '  <button type="button" class="dpad-btn dpad-up" data-dir="up" aria-label="Atas">' + chev + '</button>';
    html += '  <button type="button" class="dpad-btn dpad-left" data-dir="left" aria-label="Kiri">' + chev + '</button>';
    html += '  <div class="dpad-center" aria-hidden="true"></div>';
    html += '  <button type="button" class="dpad-btn dpad-right" data-dir="right" aria-label="Kanan">' + chev + '</button>';
    html += '  <button type="button" class="dpad-btn dpad-down" data-dir="down" aria-label="Bawah">' + chev + '</button>';
    html += '</div>';

    html += '</div>';

    this.container.innerHTML = html;
  },

  updateHud() {
    if (!this.container) return;
    const rightWrapper = this.container.querySelector('.hud-right-wrapper');
    if (rightWrapper) {
      rightWrapper.innerHTML = Hud.renderRightCard(AppState);
    }
  },

  setupCanvas() {
    this.canvas = this.container.querySelector('#office-canvas');
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    this.canvas.style.width = CANVAS_CSS_W + 'px';
    this.canvas.style.height = CANVAS_CSS_H + 'px';

    // Visual state (read once; nothing here affects movement or collision)
    this.theme = readOfficeTheme();
    this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.staticLayer = document.createElement('canvas');
    this.pose = { bob: 0, step: 0, fx: 0, fy: 1, moving: false };
    this.prevX = this.avatar.x;
    this.prevY = this.avatar.y;
    this.nameTagSource = null;
    this.nameTag = { text: '', width: 0 };

    this.resizeCanvas();

    // Rebuild once web fonts are ready so labels use the display face.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        if (this.active) this.needsRebuild = true;
      });
    }
  },

  // Backing store follows devicePixelRatio x on-screen stage scale, so the plan
  // stays crisp when the stage is scaled up. Rebuilds the static layer.
  resizeCanvas() {
    if (!this.canvas) return;
    this.dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    const stageScale = rect.width > 0 ? rect.width / CANVAS_CSS_W : 1;
    this.renderScale = Math.min(MAX_RENDER_SCALE, this.dpr * stageScale);

    const w = Math.round(CANVAS_CSS_W * this.renderScale);
    const h = Math.round(CANVAS_CSS_H * this.renderScale);
    this.canvas.width = w;
    this.canvas.height = h;
    this.staticLayer.width = w;
    this.staticLayer.height = h;

    const sctx = this.staticLayer.getContext('2d');
    sctx.setTransform(1, 0, 0, 1, 0, 0);
    sctx.clearRect(0, 0, w, h);
    const k = this.renderScale * WORLD_SCALE;
    sctx.setTransform(k, 0, 0, k, -WORLD_OFFSET_X * k, -WORLD_OFFSET_Y * k);
    drawStaticWorld(sctx, this.theme, WORLD_VIEW);
    sctx.setTransform(1, 0, 0, 1, 0, 0);

    this.nameTagSource = null; // re-measure with the current font
    this.needsRebuild = false;
    this.staticBuilds = (this.staticBuilds || 0) + 1;
  },

  bindEvents() {
    Hud.bindLeftCardEvents(this.container, () => {
      window.location.hash = '#/island';
    });

    this.handleKeyDown = (e) => {
      if (this.isPaused) return;

      const key = e.key;
      const code = e.code;

      if (key === 'ArrowUp' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowRight') {
        e.preventDefault();
      }

      if (code === 'KeyW' || key === 'w' || key === 'W' || key === 'ArrowUp') {
        this.keys.up = true;
      } else if (code === 'KeyS' || key === 's' || key === 'S' || key === 'ArrowDown') {
        this.keys.down = true;
      } else if (code === 'KeyA' || key === 'a' || key === 'A' || key === 'ArrowLeft') {
        this.keys.left = true;
      } else if (code === 'KeyD' || key === 'd' || key === 'D' || key === 'ArrowRight') {
        this.keys.right = true;
      } else if (code === 'KeyE' || key === 'e' || key === 'E') {
        const dist = this.getDistanceToBoard();
        if (dist <= INTERACTION_DISTANCE) {
          openInfoPanel('Biro SDM');
        }
      }
    };

    this.handleKeyUp = (e) => {
      const key = e.key;
      const code = e.code;

      if (code === 'KeyW' || key === 'w' || key === 'W' || key === 'ArrowUp') {
        this.keys.up = false;
      } else if (code === 'KeyS' || key === 's' || key === 'S' || key === 'ArrowDown') {
        this.keys.down = false;
      } else if (code === 'KeyA' || key === 'a' || key === 'A' || key === 'ArrowLeft') {
        this.keys.left = false;
      } else if (code === 'KeyD' || key === 'd' || key === 'D' || key === 'ArrowRight') {
        this.keys.right = false;
      }
    };

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);

    // Resize or zoom (devicePixelRatio change) marks the static layer for rebuild;
    // the rebuild happens on the next frame, at most once per frame.
    this.handleResize = () => {
      this.needsRebuild = true;
    };
    window.addEventListener('resize', this.handleResize);

    this.handleCanvasClick = (e) => {
      if (this.isPaused) return;

      const rect = this.canvas.getBoundingClientRect();
      const cssX = (e.clientX - rect.left) / (rect.width / CANVAS_CSS_W);
      const cssY = (e.clientY - rect.top) / (rect.height / CANVAS_CSS_H);

      const worldX = (cssX / WORLD_SCALE) + WORLD_OFFSET_X;
      const worldY = (cssY / WORLD_SCALE) + WORLD_OFFSET_Y;

      if (worldX >= BOARD.x && worldX <= BOARD.x + BOARD.w &&
          worldY >= BOARD.y && worldY <= BOARD.y + BOARD.h) {
        openInfoPanel('Biro SDM');
        return;
      }

      const dx = worldX - BOARD_CENTER.x;
      const dy = worldY - BOARD_CENTER.y;
      if (Math.sqrt(dx * dx + dy * dy) <= INTERACTION_DISTANCE) {
        openInfoPanel('Biro SDM');
      }
    };

    this.canvas.addEventListener('click', this.handleCanvasClick);

    const dpadButtons = this.container.querySelectorAll('.dpad-btn');
    this.dpadHandlers = [];

    for (let i = 0; i < dpadButtons.length; i++) {
      const btn = dpadButtons[i];
      const dir = btn.getAttribute('data-dir');

      const activate = (e) => {
        e.preventDefault();
        if (this.isPaused) return;
        this.keys[dir] = true;
        btn.classList.add('is-active');
      };

      const deactivate = (e) => {
        e.preventDefault();
        this.keys[dir] = false;
        btn.classList.remove('is-active');
      };

      btn.addEventListener('pointerdown', activate);
      btn.addEventListener('pointerup', deactivate);
      btn.addEventListener('pointercancel', deactivate);
      btn.addEventListener('pointerleave', deactivate);

      this.dpadHandlers.push({ btn, activate, deactivate });
    }
  },

  unbindEvents() {
    if (this.handleKeyDown) {
      window.removeEventListener('keydown', this.handleKeyDown);
      this.handleKeyDown = null;
    }
    if (this.handleKeyUp) {
      window.removeEventListener('keyup', this.handleKeyUp);
      this.handleKeyUp = null;
    }
    if (this.handleResize) {
      window.removeEventListener('resize', this.handleResize);
      this.handleResize = null;
    }
    if (this.canvas && this.handleCanvasClick) {
      this.canvas.removeEventListener('click', this.handleCanvasClick);
      this.handleCanvasClick = null;
    }

    if (this.dpadHandlers) {
      for (let i = 0; i < this.dpadHandlers.length; i++) {
        const h = this.dpadHandlers[i];
        h.btn.removeEventListener('pointerdown', h.activate);
        h.btn.removeEventListener('pointerup', h.deactivate);
        h.btn.removeEventListener('pointercancel', h.deactivate);
        h.btn.removeEventListener('pointerleave', h.deactivate);
      }
      this.dpadHandlers = [];
    }
  },

  getDistanceToBoard() {
    const dx = this.avatar.x - BOARD_CENTER.x;
    const dy = this.avatar.y - BOARD_CENTER.y;
    return Math.sqrt(dx * dx + dy * dy);
  },

  updatePhysics(dt) {
    if (this.isPaused) return;

    let dx = 0;
    let dy = 0;

    if (this.keys.up) dy -= 1;
    if (this.keys.down) dy += 1;
    if (this.keys.left) dx -= 1;
    if (this.keys.right) dx += 1;

    if (dx === 0 && dy === 0) return;

    if (dx !== 0 && dy !== 0) {
      const invLen = 1 / Math.SQRT2;
      dx *= invLen;
      dy *= invLen;
    }

    const moveDist = this.avatar.speed * dt;
    const r = this.avatar.radius;

    if (dx !== 0) {
      const nextX = this.avatar.x + dx * moveDist;
      this.avatar.x = this.resolveMovementX(nextX, this.avatar.y, r, dx);
    }

    if (dy !== 0) {
      const nextY = this.avatar.y + dy * moveDist;
      this.avatar.y = this.resolveMovementY(this.avatar.x, nextY, r, dy);
    }
  },

  resolveMovementX(targetX, y, r, dx) {
    const minX = FLOOR.x + r;
    const maxX = (FLOOR.x + FLOOR.w) - r;
    targetX = Math.max(minX, Math.min(maxX, targetX));

    const obstacles = OBSTACLES;
    for (let i = 0; i < obstacles.length; i++) {
      const obs = obstacles[i];
      if (this.circleIntersectsAABB(targetX, y, r, obs.x, obs.y, obs.w, obs.h)) {
        if (dx > 0) {
          targetX = Math.min(targetX, obs.x - r - 0.05);
        } else if (dx < 0) {
          targetX = Math.max(targetX, obs.x + obs.w + r + 0.05);
        }
      }
    }
    return Math.max(minX, Math.min(maxX, targetX));
  },

  resolveMovementY(x, targetY, r, dy) {
    const minY = FLOOR.y + r;
    const maxY = (FLOOR.y + FLOOR.h) - r;
    targetY = Math.max(minY, Math.min(maxY, targetY));

    const obstacles = OBSTACLES;
    for (let i = 0; i < obstacles.length; i++) {
      const obs = obstacles[i];
      if (this.circleIntersectsAABB(x, targetY, r, obs.x, obs.y, obs.w, obs.h)) {
        if (dy > 0) {
          targetY = Math.min(targetY, obs.y - r - 0.05);
        } else if (dy < 0) {
          targetY = Math.max(targetY, obs.y + obs.h + r + 0.05);
        }
      }
    }
    return Math.max(minY, Math.min(maxY, targetY));
  },

  circleIntersectsAABB(cx, cy, r, rx, ry, rw, rh) {
    const closestX = Math.max(rx, Math.min(cx, rx + rw));
    const closestY = Math.max(ry, Math.min(cy, ry + rh));

    const distX = cx - closestX;
    const distY = cy - closestY;

    return (distX * distX + distY * distY) < (r * r);
  },

  gameLoop(timestamp) {
    if (!this.active) return;

    let dt = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;

    if (dt > 0.1) dt = 0.1;

    if (!this.isPaused && dt > 0) {
      this.updatePhysics(dt);
    }

    this.draw();

    this.rafId = requestAnimationFrame(this.gameLoop);
  },

  draw() {
    const ctx = this.ctx;
    if (!ctx) return;
    if (this.needsRebuild) this.resizeCanvas();

    const T = this.theme;
    const k = this.renderScale * WORLD_SCALE;

    // 1. static layer (cached)
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.drawImage(this.staticLayer, 0, 0);

    // 2. dynamic layer in world coordinates
    ctx.setTransform(k, 0, 0, k, -WORLD_OFFSET_X * k, -WORLD_OFFSET_Y * k);

    const near = this.getDistanceToBoard() <= INTERACTION_DISTANCE;
    if (near) {
      const pulse = this.reduceMotion ? 1 : 0.5 + 0.5 * Math.sin(this.lastTime / 380);
      drawBoardGlow(ctx, T, BOARD, pulse, this.renderScale);
    }

    this.updatePose();
    const av = this.avatar;
    drawAvatar(ctx, T, av.x, av.y, this.pose);

    const name = (AppState.player && AppState.player.displayName) || 'Pegawai BPS';
    if (name !== this.nameTagSource) {
      this.nameTag = fitNameTag(ctx, T, name, NAME_TAG_MAX_W);
      this.nameTagSource = name;
    }
    drawNameTag(ctx, T, av.x, av.y, this.nameTag.text, this.nameTag.width);

    if (near) {
      drawKeycapBubble(ctx, T, av.x, av.y);
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
  },

  // Derives walk frame and facing from how far the avatar moved since the last
  // frame. Reads position only; never writes movement state.
  updatePose() {
    const dx = this.avatar.x - this.prevX;
    const dy = this.avatar.y - this.prevY;
    this.prevX = this.avatar.x;
    this.prevY = this.avatar.y;

    const pose = this.pose;
    pose.moving = (dx * dx + dy * dy) > 0.0001;
    if (pose.moving) {
      pose.fx = dx > 0.01 ? 1 : (dx < -0.01 ? -1 : 0);
      pose.fy = dy > 0.01 ? 1 : (dy < -0.01 ? -1 : (pose.fx !== 0 ? 0 : pose.fy));
      if (this.reduceMotion) {
        pose.step = 0;
        pose.bob = 0;
      } else {
        pose.step = Math.floor(this.lastTime / WALK_FRAME_MS) % 2;
        pose.bob = pose.step ? -2 : 0;
      }
    } else {
      pose.step = 0;
      pose.bob = 0;
    }
  }
};

export default OfficeScreen;

