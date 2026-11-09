// Reusable HUD components, icons, and toast notifications
let toastTimeout = null;

export const icons = {
  lock: '<svg width="13" height="13" viewBox="0 0 24 24" fill="#FFFFFF" class="icon-lock" aria-hidden="true"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>',
  star: '<svg width="14" height="14" viewBox="0 0 24 24" fill="#FFD24A" class="icon-star" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
  backArrow: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>',
  avatar: '<svg width="40" height="40" viewBox="0 0 40 40" class="hud-avatar-svg" aria-hidden="true">' +
    '<circle cx="20" cy="20" r="20" fill="#FFD9B0"/>' +
    '<path d="M12 15 C12 9 28 9 28 15 C26 12 23 11 20 11 C17 11 14 12 12 15 Z" fill="#3B2A20"/>' +
    '<circle cx="20" cy="17" r="7" fill="#F2B583"/>' +
    '<path d="M14 14 C16 12 24 12 26 14 C25 13 23 12.5 20 12.5 C17 12.5 15 13 14 14 Z" fill="#3B2A20"/>' +
    '<path d="M8 38 C8 29 14 26 20 26 C26 26 32 29 32 38 Z" fill="#2E86DE"/>' +
    '</svg>'
};

export function renderRightCard(state) {
  const player = (state && state.player) || {
    name: 'Pegawai Demo',
    level: 1,
    title: 'Explorer',
    xp: 120,
    xpToNext: 500
  };
  const percent = Math.min(100, Math.max(0, Math.round((player.xp / player.xpToNext) * 100)));

  return '' +
    '<div class="hud-card hud-right-card" aria-label="Informasi Pemain">' +
      '<div class="hud-avatar-wrap">' +
        icons.avatar +
      '</div>' +
      '<div class="hud-player-info">' +
        '<div class="hud-player-level">Level ' + player.level + ' · ' + player.title + '</div>' +
        '<div class="hud-xp-text">' + player.xp + ' / ' + player.xpToNext + ' XP</div>' +
        '<div class="hud-progress-track" role="progressbar" aria-valuenow="' + player.xp + '" aria-valuemin="0" aria-valuemax="' + player.xpToNext + '">' +
          '<div class="hud-progress-fill" style="width: ' + percent + '%;"></div>' +
        '</div>' +
      '</div>' +
    '</div>';
}

export function renderLeftCard(options = {}) {
  const hasBack = Boolean(options.hasBack);
  const title = options.title || 'Peta Dunia BPS';
  const subtitle = options.subtitle || 'Jelajahi seluruh pulau unit kerja di BPS';

  const backBtnHtml = hasBack
    ? '<button type="button" class="hud-back-btn" id="hud-back-button" aria-label="Kembali">' +
        icons.backArrow +
      '</button>'
    : '';

  return '' +
    '<div class="hud-card hud-left-card' + (hasBack ? ' has-back' : '') + '">' +
      backBtnHtml +
      '<div class="hud-title-wrap">' +
        '<h1 class="hud-title">' + title + '</h1>' +
        '<div class="hud-subtitle">' + subtitle + '</div>' +
      '</div>' +
    '</div>';
}

export function bindLeftCardEvents(container, onBack) {
  const backBtn = container.querySelector('#hud-back-button');
  if (backBtn) {
    backBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof onBack === 'function') {
        onBack();
      } else {
        window.history.back();
      }
    });
  }
}

export function showToast(message, duration = 2000) {
  const stage = document.getElementById('stage');
  if (!stage) return;

  const existing = stage.querySelector('.bps-toast');
  if (existing) {
    existing.remove();
  }
  if (toastTimeout) {
    clearTimeout(toastTimeout);
    toastTimeout = null;
  }

  const toast = document.createElement('div');
  toast.className = 'bps-toast';
  toast.setAttribute('role', 'alert');
  toast.textContent = message;
  stage.appendChild(toast);

  void toast.offsetWidth;
  toast.classList.add('visible');

  toastTimeout = setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, duration);
}

export const Hud = {
  icons,
  renderRightCard,
  renderLeftCard,
  bindLeftCardEvents,
  showToast
};
