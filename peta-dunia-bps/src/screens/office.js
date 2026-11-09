// Screen 3: Office floor-plan screen with a walkable avatar on HTML Canvas
import { AppState } from '../state/index.js';
import { Hud } from '../ui/hud.js';
import { openInfoPanel, isInfoPanelOpen, setPanelCallback } from '../ui/panel.js';

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
    html += '<div class="office-hint-text">WASD / panah: bergerak · E: baca papan informasi</div>';

    // On-screen D-Pad (bottom-right of the stage)
    html += '<div class="office-dpad" aria-label="Navigasi D-Pad">';
    html += '  <button type="button" class="dpad-btn dpad-up" data-dir="up" aria-label="Atas">&#9650;</button>';
    html += '  <button type="button" class="dpad-btn dpad-left" data-dir="left" aria-label="Kiri">&#9664;</button>';
    html += '  <div class="dpad-center"></div>';
    html += '  <button type="button" class="dpad-btn dpad-right" data-dir="right" aria-label="Kanan">&#9654;</button>';
    html += '  <button type="button" class="dpad-btn dpad-down" data-dir="down" aria-label="Bawah">&#9660;</button>';
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
    this.dpr = window.devicePixelRatio || 1;

    this.canvas.width = CANVAS_CSS_W * this.dpr;
    this.canvas.height = CANVAS_CSS_H * this.dpr;
    this.canvas.style.width = CANVAS_CSS_W + 'px';
    this.canvas.style.height = CANVAS_CSS_H + 'px';
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

    const obstacles = ROOMS.concat([BOARD]);
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

    const obstacles = ROOMS.concat([BOARD]);
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

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.restore();

    ctx.save();
    ctx.scale(this.dpr * WORLD_SCALE, this.dpr * WORLD_SCALE);
    ctx.translate(-WORLD_OFFSET_X, -WORLD_OFFSET_Y);

    this.drawFloor(ctx);
    this.drawRooms(ctx);
    this.drawFloorLabels(ctx);
    this.drawBoard(ctx);
    this.drawAvatar(ctx);

    if (this.getDistanceToBoard() <= INTERACTION_DISTANCE) {
      this.drawInteractionBubble(ctx);
    }

    ctx.restore();
  },

  drawFloor(ctx) {
    ctx.fillStyle = FLOOR.fill;
    ctx.fillRect(FLOOR.x, FLOOR.y, FLOOR.w, FLOOR.h);

    ctx.strokeStyle = FLOOR.stroke;
    ctx.lineWidth = FLOOR.strokeWidth;
    ctx.strokeRect(FLOOR.x, FLOOR.y, FLOOR.w, FLOOR.h);
  },

  drawRooms(ctx) {
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#1E3A5F';
    ctx.fillStyle = '#10263F';

    for (let i = 0; i < ROOMS.length; i++) {
      const r = ROOMS[i];
      ctx.fillStyle = r.fill;
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeRect(r.x, r.y, r.w, r.h);

      ctx.fillStyle = '#10263F';
      this.drawRoomLabel(ctx, r);
    }
  },

  drawRoomLabel(ctx, r) {
    const name = r.name;
    const centerX = r.x + r.w / 2;
    const centerY = r.y + r.h / 2;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (name === 'Ruang Kepala Biro SDM') {
      ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('Ruang Kepala', centerX, centerY - 14);
      ctx.fillText('Biro SDM', centerX, centerY + 14);
    } else if (name === 'WC Perempuan') {
      ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('WC', centerX, centerY - 11);
      ctx.fillText('Perempuan', centerX, centerY + 11);
    } else if (name === 'WC Pria') {
      ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('WC Pria', centerX, centerY);
    } else if (name === 'R. Kolaborasi') {
      ctx.font = '17px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('R. Kolaborasi', centerX, centerY);
    } else if (r.w < 110 && name.length > 8) {
      ctx.font = '15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(name, centerX, centerY);
    } else {
      ctx.font = '18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(name, centerX, centerY);
    }
  },

  drawFloorLabels(ctx) {
    ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#6B7F96';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < FLOOR_LABELS.length; i++) {
      const l = FLOOR_LABELS[i];
      ctx.fillText(l.text, l.x, l.y);
    }
  },

  drawBoard(ctx) {
    const x = BOARD.x;
    const y = BOARD.y;
    const w = BOARD.w;
    const h = BOARD.h;
    const r = BOARD.radius;

    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();

    ctx.fillStyle = BOARD.fill;
    ctx.fill();

    ctx.strokeStyle = BOARD.stroke;
    ctx.lineWidth = BOARD.strokeWidth;
    ctx.stroke();

    ctx.save();
    ctx.translate(BOARD_CENTER.x, BOARD_CENTER.y);
    ctx.rotate(-Math.PI / 2);
    ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#5A4500';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(BOARD.label, 0, 0);
    ctx.restore();
  },

  drawAvatar(ctx) {
    const av = this.avatar;

    ctx.beginPath();
    ctx.arc(av.x, av.y, av.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#2E86DE';
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(av.x, av.y - 6, 9, 0, Math.PI * 2);
    ctx.fillStyle = '#F2B583';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(av.x, av.y - 8, 9, Math.PI, 0);
    ctx.fillStyle = '#3B2A20';
    ctx.fill();
  },

  drawInteractionBubble(ctx) {
    const av = this.avatar;
    const bx = av.x;
    const by = av.y - 42;
    const bw = 88;
    const bh = 30;
    const br = 8;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;

    ctx.beginPath();
    ctx.moveTo(bx - bw / 2 + br, by - bh / 2);
    ctx.lineTo(bx + bw / 2 - br, by - bh / 2);
    ctx.quadraticCurveTo(bx + bw / 2, by - bh / 2, bx + bw / 2, by - bh / 2 + br);
    ctx.lineTo(bx + bw / 2, by + bh / 2 - br);
    ctx.quadraticCurveTo(bx + bw / 2, by + bh / 2, bx + bw / 2 - br, by + bh / 2);

    ctx.lineTo(bx + 6, by + bh / 2);
    ctx.lineTo(bx, by + bh / 2 + 6);
    ctx.lineTo(bx - 6, by + bh / 2);

    ctx.lineTo(bx - bw / 2 + br, by + bh / 2);
    ctx.quadraticCurveTo(bx - bw / 2, by + bh / 2, bx - bw / 2, by + bh / 2 - br);
    ctx.lineTo(bx - bw / 2, by - bh / 2 + br);
    ctx.quadraticCurveTo(bx - bw / 2, by - bh / 2, bx - bw / 2 + br, by - bh / 2);
    ctx.closePath();

    ctx.fillStyle = '#0F3D6E';
    ctx.fill();
    ctx.restore();

    ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Tekan E', bx, by);
  }
};

export default OfficeScreen;

