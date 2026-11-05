// Screen 3: Office floor-plan screen with a walkable avatar on HTML Canvas
(function (window) {
  'use strict';

  // ---------------------------------------------------------------------------
  // Data Definitions: Floor, Rooms (Obstacles), Board, and Labels
  // ---------------------------------------------------------------------------
  var FLOOR = {
    x: 70,
    y: 70,
    w: 1215,
    h: 430,
    fill: '#E8EEF6',
    stroke: '#1E3A5F',
    strokeWidth: 6
  };

  var ROOMS = [
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

  var FLOOR_LABELS = [
    { text: 'Area Meja Pegawai', x: 380, y: 170 },
    { text: 'Area Meja Pegawai', x: 620, y: 415 }
  ];

  var BOARD = {
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

  var BOARD_CENTER = { x: 788, y: 165 };
  var INTERACTION_DISTANCE = 80;

  // World bounds and transformation constants
  var WORLD_OFFSET_X = 60;
  var WORLD_OFFSET_Y = 60;
  var WORLD_WIDTH = 1240; // 1300 - 60
  var CANVAS_CSS_W = 920;
  var CANVAS_CSS_H = 382;
  var WORLD_SCALE = CANVAS_CSS_W / WORLD_WIDTH; // 920 / 1240

  // ---------------------------------------------------------------------------
  // Screen Implementation
  // ---------------------------------------------------------------------------
  var OfficeScreen = {
    mount: function (container) {
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

      // Render DOM
      this.render();

      // Setup Canvas
      this.setupCanvas();

      // Bind all listeners (Keyboard, D-Pad, Mouse, State)
      this.bindEvents();

      // Listen to Info Panel events (pauses / resumes game loop)
      var self = this;
      this.onPanelChange = function (isOpen) {
        self.isPaused = isOpen;
        if (!isOpen) {
          // Reset lastTime to avoid delta-time leap on resume
          self.lastTime = performance.now();
        }
      };
      if (typeof window.setPanelCallback === 'function') {
        window.setPanelCallback(this.onPanelChange);
      }

      // Check if modal is already open
      if (typeof window.isInfoPanelOpen === 'function' && window.isInfoPanelOpen()) {
        this.isPaused = true;
      }

      // Start game loop
      this.lastTime = performance.now();
      this.gameLoop = this.gameLoop.bind(this);
      this.rafId = requestAnimationFrame(this.gameLoop);
    },

    unmount: function () {
      this.active = false;

      // Cancel game loop
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }

      // Clean up panel callback
      if (typeof window.setPanelCallback === 'function') {
        window.setPanelCallback(null);
      }
      this.onPanelChange = null;

      // Unbind all events
      this.unbindEvents();

      // Clear DOM
      if (this.container) {
        this.container.innerHTML = '';
      }
    },

    render: function () {
      var html = '<div class="screen screen-office">';

      // Left HUD Card (with back button)
      html += '<div class="hud-left-wrapper">';
      html += window.Hud.renderLeftCard({
        title: 'Biro SDM',
        subtitle: 'Lantai kantor',
        hasBack: true
      });
      html += '</div>';

      // Right HUD Card
      html += '<div class="hud-right-wrapper">';
      html += window.Hud.renderRightCard(window.AppState);
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

      html += '</div>'; // .screen-office

      this.container.innerHTML = html;
    },

    setupCanvas: function () {
      this.canvas = this.container.querySelector('#office-canvas');
      if (!this.canvas) return;

      this.ctx = this.canvas.getContext('2d');
      this.dpr = window.devicePixelRatio || 1;

      // Crisp rendering at devicePixelRatio
      this.canvas.width = CANVAS_CSS_W * this.dpr;
      this.canvas.height = CANVAS_CSS_H * this.dpr;
      this.canvas.style.width = CANVAS_CSS_W + 'px';
      this.canvas.style.height = CANVAS_CSS_H + 'px';
    },

    // -------------------------------------------------------------------------
    // Event Listeners (Keyboard, D-Pad, Canvas Clicks, HUD Back)
    // -------------------------------------------------------------------------
    bindEvents: function () {
      var self = this;

      // 1. HUD Back Button
      window.Hud.bindLeftCardEvents(this.container, function () {
        window.location.hash = '#/island';
      });

      // 2. Keyboard Handlers
      this.handleKeyDown = function (e) {
        if (self.isPaused) return;

        var key = e.key;
        var code = e.code;

        // Prevent page scroll on arrows
        if (key === 'ArrowUp' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowRight') {
          e.preventDefault();
        }

        if (code === 'KeyW' || key === 'w' || key === 'W' || key === 'ArrowUp') {
          self.keys.up = true;
        } else if (code === 'KeyS' || key === 's' || key === 'S' || key === 'ArrowDown') {
          self.keys.down = true;
        } else if (code === 'KeyA' || key === 'a' || key === 'A' || key === 'ArrowLeft') {
          self.keys.left = true;
        } else if (code === 'KeyD' || key === 'd' || key === 'D' || key === 'ArrowRight') {
          self.keys.right = true;
        } else if (code === 'KeyE' || key === 'e' || key === 'E') {
          // Check proximity to board
          var dist = self.getDistanceToBoard();
          if (dist <= INTERACTION_DISTANCE) {
            window.openInfoPanel('Biro SDM');
          }
        }
      };

      this.handleKeyUp = function (e) {
        var key = e.key;
        var code = e.code;

        if (code === 'KeyW' || key === 'w' || key === 'W' || key === 'ArrowUp') {
          self.keys.up = false;
        } else if (code === 'KeyS' || key === 's' || key === 'S' || key === 'ArrowDown') {
          self.keys.down = false;
        } else if (code === 'KeyA' || key === 'a' || key === 'A' || key === 'ArrowLeft') {
          self.keys.left = false;
        } else if (code === 'KeyD' || key === 'd' || key === 'D' || key === 'ArrowRight') {
          self.keys.right = false;
        }
      };

      window.addEventListener('keydown', this.handleKeyDown);
      window.addEventListener('keyup', this.handleKeyUp);

      // 3. Canvas Click Handler (Clicking the board or proximity)
      this.handleCanvasClick = function (e) {
        if (self.isPaused) return;

        var rect = self.canvas.getBoundingClientRect();
        // Calculate mouse position inside CSS canvas (taking stage scaling into account)
        var cssX = (e.clientX - rect.left) / (rect.width / CANVAS_CSS_W);
        var cssY = (e.clientY - rect.top) / (rect.height / CANVAS_CSS_H);

        // Convert CSS canvas pixels to world coordinates
        var worldX = (cssX / WORLD_SCALE) + WORLD_OFFSET_X;
        var worldY = (cssY / WORLD_SCALE) + WORLD_OFFSET_Y;

        // Check if click was inside the Board rect
        if (worldX >= BOARD.x && worldX <= BOARD.x + BOARD.w &&
            worldY >= BOARD.y && worldY <= BOARD.y + BOARD.h) {
          window.openInfoPanel('Biro SDM');
          return;
        }

        // Or click near board center within interaction range
        var dx = worldX - BOARD_CENTER.x;
        var dy = worldY - BOARD_CENTER.y;
        if (Math.sqrt(dx * dx + dy * dy) <= INTERACTION_DISTANCE) {
          window.openInfoPanel('Biro SDM');
        }
      };

      this.canvas.addEventListener('click', this.handleCanvasClick);

      // 4. On-screen D-Pad Handlers (Pointer events)
      var dpadButtons = this.container.querySelectorAll('.dpad-btn');
      this.dpadHandlers = [];

      for (var i = 0; i < dpadButtons.length; i++) {
        (function (btn) {
          var dir = btn.getAttribute('data-dir');

          function activate(e) {
            e.preventDefault();
            if (self.isPaused) return;
            self.keys[dir] = true;
            btn.classList.add('is-active');
          }

          function deactivate(e) {
            e.preventDefault();
            self.keys[dir] = false;
            btn.classList.remove('is-active');
          }

          btn.addEventListener('pointerdown', activate);
          btn.addEventListener('pointerup', deactivate);
          btn.addEventListener('pointercancel', deactivate);
          btn.addEventListener('pointerleave', deactivate);

          self.dpadHandlers.push({
            btn: btn,
            activate: activate,
            deactivate: deactivate
          });
        })(dpadButtons[i]);
      }
    },

    unbindEvents: function () {
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
        for (var i = 0; i < this.dpadHandlers.length; i++) {
          var h = this.dpadHandlers[i];
          h.btn.removeEventListener('pointerdown', h.activate);
          h.btn.removeEventListener('pointerup', h.deactivate);
          h.btn.removeEventListener('pointercancel', h.deactivate);
          h.btn.removeEventListener('pointerleave', h.deactivate);
        }
        this.dpadHandlers = [];
      }
    },

    // -------------------------------------------------------------------------
    // Physics, Collision Detection & Wall Sliding
    // -------------------------------------------------------------------------
    getDistanceToBoard: function () {
      var dx = this.avatar.x - BOARD_CENTER.x;
      var dy = this.avatar.y - BOARD_CENTER.y;
      return Math.sqrt(dx * dx + dy * dy);
    },

    updatePhysics: function (dt) {
      if (this.isPaused) return;

      var dx = 0;
      var dy = 0;

      if (this.keys.up) dy -= 1;
      if (this.keys.down) dy += 1;
      if (this.keys.left) dx -= 1;
      if (this.keys.right) dx += 1;

      if (dx === 0 && dy === 0) return;

      // Normalize diagonal velocity
      if (dx !== 0 && dy !== 0) {
        var invLen = 1 / Math.SQRT2;
        dx *= invLen;
        dy *= invLen;
      }

      var moveDist = this.avatar.speed * dt;
      var r = this.avatar.radius;

      // 1. Separate X movement and collision resolution
      if (dx !== 0) {
        var nextX = this.avatar.x + dx * moveDist;
        this.avatar.x = this.resolveMovementX(nextX, this.avatar.y, r, dx);
      }

      // 2. Separate Y movement and collision resolution
      if (dy !== 0) {
        var nextY = this.avatar.y + dy * moveDist;
        this.avatar.y = this.resolveMovementY(this.avatar.x, nextY, r, dy);
      }
    },

    resolveMovementX: function (targetX, y, r, dx) {
      // Outer wall boundaries: 70..1285
      var minX = FLOOR.x + r;
      var maxX = (FLOOR.x + FLOOR.w) - r;
      targetX = Math.max(minX, Math.min(maxX, targetX));

      var obstacles = ROOMS.concat([BOARD]);
      for (var i = 0; i < obstacles.length; i++) {
        var obs = obstacles[i];
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

    resolveMovementY: function (x, targetY, r, dy) {
      // Outer wall boundaries: 70..500
      var minY = FLOOR.y + r;
      var maxY = (FLOOR.y + FLOOR.h) - r;
      targetY = Math.max(minY, Math.min(maxY, targetY));

      var obstacles = ROOMS.concat([BOARD]);
      for (var i = 0; i < obstacles.length; i++) {
        var obs = obstacles[i];
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

    circleIntersectsAABB: function (cx, cy, r, rx, ry, rw, rh) {
      // Find closest point on rectangle to circle center
      var closestX = Math.max(rx, Math.min(cx, rx + rw));
      var closestY = Math.max(ry, Math.min(cy, ry + rh));

      var distX = cx - closestX;
      var distY = cy - closestY;

      return (distX * distX + distY * distY) < (r * r);
    },

    // -------------------------------------------------------------------------
    // Canvas Drawing / Rendering Pipeline
    // -------------------------------------------------------------------------
    gameLoop: function (timestamp) {
      if (!this.active) return;

      var dt = (timestamp - this.lastTime) / 1000;
      this.lastTime = timestamp;

      // Clamp delta time to avoid large jumps
      if (dt > 0.1) dt = 0.1;

      // Update position if not paused
      if (!this.isPaused && dt > 0) {
        this.updatePhysics(dt);
      }

      // Render frame
      this.draw();

      this.rafId = requestAnimationFrame(this.gameLoop);
    },

    draw: function () {
      var ctx = this.ctx;
      if (!ctx) return;

      // Clear full canvas buffer
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.restore();

      // Apply world transformation: scale = 920/1240, translate(-60, -60)
      ctx.save();
      ctx.scale(this.dpr * WORLD_SCALE, this.dpr * WORLD_SCALE);
      ctx.translate(-WORLD_OFFSET_X, -WORLD_OFFSET_Y);

      // Draw Order:
      // 1. Floor
      this.drawFloor(ctx);

      // 2. Rooms
      this.drawRooms(ctx);

      // 3. Floor Labels
      this.drawFloorLabels(ctx);

      // 4. Board (Papan Informasi)
      this.drawBoard(ctx);

      // 5. Avatar
      this.drawAvatar(ctx);

      // 6. "Tekan E" bubble if in proximity
      if (this.getDistanceToBoard() <= INTERACTION_DISTANCE) {
        this.drawInteractionBubble(ctx);
      }

      ctx.restore();
    },

    drawFloor: function (ctx) {
      ctx.fillStyle = FLOOR.fill;
      ctx.fillRect(FLOOR.x, FLOOR.y, FLOOR.w, FLOOR.h);

      ctx.strokeStyle = FLOOR.stroke;
      ctx.lineWidth = FLOOR.strokeWidth;
      ctx.strokeRect(FLOOR.x, FLOOR.y, FLOOR.w, FLOOR.h);
    },

    drawRooms: function (ctx) {
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#1E3A5F';
      ctx.fillStyle = '#10263F';

      for (var i = 0; i < ROOMS.length; i++) {
        var r = ROOMS[i];

        // Fill & Stroke
        ctx.fillStyle = r.fill;
        ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.strokeRect(r.x, r.y, r.w, r.h);

        // Room Label (Centered, 18px system sans-serif, #10263F)
        ctx.fillStyle = '#10263F';
        this.drawRoomLabel(ctx, r);
      }
    },

    drawRoomLabel: function (ctx, r) {
      var name = r.name;
      var centerX = r.x + r.w / 2;
      var centerY = r.y + r.h / 2;

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Multi-line handling for long titles like "Ruang Kepala Biro SDM" or narrow rooms
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

    drawFloorLabels: function (ctx) {
      ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#6B7F96';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';

      for (var i = 0; i < FLOOR_LABELS.length; i++) {
        var l = FLOOR_LABELS[i];
        ctx.fillText(l.text, l.x, l.y);
      }
    },

    drawBoard: function (ctx) {
      var x = BOARD.x;
      var y = BOARD.y;
      var w = BOARD.w;
      var h = BOARD.h;
      var r = BOARD.radius;

      // Rounded rectangle path
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

      // Board Label: "Papan Informasi" bold 16px rotated -90deg and centered
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

    drawAvatar: function (ctx) {
      var av = this.avatar;

      // Body Circle: radius 22, fill #2E86DE, 4px white stroke
      ctx.beginPath();
      ctx.arc(av.x, av.y, av.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#2E86DE';
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Face Circle: radius 9, skin-tone, offset upwards
      ctx.beginPath();
      ctx.arc(av.x, av.y - 6, 9, 0, Math.PI * 2);
      ctx.fillStyle = '#F2B583';
      ctx.fill();

      // Hair cap
      ctx.beginPath();
      ctx.arc(av.x, av.y - 8, 9, Math.PI, 0);
      ctx.fillStyle = '#3B2A20';
      ctx.fill();
    },

    drawInteractionBubble: function (ctx) {
      var av = this.avatar;
      var bx = av.x;
      var by = av.y - 42;
      var bw = 88;
      var bh = 30;
      var br = 8;

      ctx.save();
      // Drop shadow for bubble
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 2;

      // Bubble background
      ctx.beginPath();
      ctx.moveTo(bx - bw / 2 + br, by - bh / 2);
      ctx.lineTo(bx + bw / 2 - br, by - bh / 2);
      ctx.quadraticCurveTo(bx + bw / 2, by - bh / 2, bx + bw / 2, by - bh / 2 + br);
      ctx.lineTo(bx + bw / 2, by + bh / 2 - br);
      ctx.quadraticCurveTo(bx + bw / 2, by + bh / 2, bx + bw / 2 - br, by + bh / 2);

      // Pointer tail
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

      // Text "Tekan E" (white 16px)
      ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Tekan E', bx, by);
    }
  };

  window.OfficeScreen = OfficeScreen;
})(window);
