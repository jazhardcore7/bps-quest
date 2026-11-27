// Screen 1: World Map (#/world)
import { AppState } from '../state/index.js';
import { BpsData } from '../data/index.js';
import { toUnitId } from '../config.js';
import { getCachedUnits } from '../firebase/units.js';
import { Hud } from '../ui/hud.js';
import { escapeHtml } from '../ui/escape.js';
import {
  renderIslandSVG,
  renderWorldAmbient,
  pillFill,
  islandBadge,
  islandOfUser
} from '../ui/island-art.js';

let unsubscribeState = null;

// Island that holds the signed-in user's unit (presentation only).
function userIslandId() {
  const player = AppState.player || {};
  return islandOfUser(getCachedUnits(), toUnitId(AppState.currentUnit), player.unitPath);
}

export const WorldScreen = {
  mount(container) {
    this.container = container;
    this.render();

    unsubscribeState = AppState.subscribe(() => {
      this.updateHud();
      this.updateUserPin();
    });
  },

  unmount() {
    if (typeof unsubscribeState === 'function') {
      unsubscribeState();
      unsubscribeState = null;
    }
    if (this.container) {
      this.container.innerHTML = '';
    }
  },

  updateHud() {
    if (!this.container) return;
    const hudRightContainer = this.container.querySelector('.hud-right-wrapper');
    if (hudRightContainer) {
      hudRightContainer.innerHTML = Hud.renderRightCard(AppState);
    }
  },

  // Moves the "Unit Anda" pin when the user's unit becomes known or changes.
  updateUserPin() {
    if (!this.container) return;
    const mine = userIslandId();
    const buttons = this.container.querySelectorAll('.world-island');
    for (let i = 0; i < buttons.length; i++) {
      const btn = buttons[i];
      const isMine = btn.getAttribute('data-id') === mine;
      btn.classList.toggle('is-user-island', isMine);
      const base = btn.getAttribute('data-aria-base') || '';
      btn.setAttribute('aria-label', isMine ? base + ', Unit Anda' : base);
    }
  },

  render() {
    let html = '<div class="screen screen-world">';

    // Left HUD Card
    html += '<div class="hud-left-wrapper">';
    html += Hud.renderLeftCard({
      title: 'Peta Dunia BPS',
      subtitle: 'Jelajahi seluruh pulau unit kerja di BPS',
      hasBack: false
    });
    html += '</div>';

    // Right HUD Card
    html += '<div class="hud-right-wrapper">';
    html += Hud.renderRightCard(AppState);
    html += '</div>';

    // Decorative sea layer (waves, routes, compass, 6 animated elements)
    html += renderWorldAmbient();

    // Islands Container (all 8 islands unlocked)
    html += '<div class="world-islands" role="region" aria-label="Daftar Pulau Unit Kerja">';

    const units = getCachedUnits();
    const mine = userIslandId();
    const islands = BpsData.islands;
    for (let i = 0; i < islands.length; i++) {
      const island = islands[i];
      const left = island.rect[0];
      const top = island.rect[1];
      const width = island.rect[2];
      const height = island.rect[3];
      const safeLabel = escapeHtml(island.label);
      const badge = islandBadge(units, island.id);
      const ariaBase = island.label + (badge ? ', ' + badge.text : '');
      const isMine = island.id === mine;

      html += '' +
        '<button type="button" class="world-island is-unlocked island-v2' + (isMine ? ' is-user-island' : '') + '" ' +
          'id="island-' + escapeHtml(island.id) + '" ' +
          'data-id="' + escapeHtml(island.id) + '" ' +
          'data-aria-base="' + escapeHtml(ariaBase) + '" ' +
          'style="left:' + left + 'px; top:' + top + 'px; width:' + width + 'px; height:' + height + 'px;" ' +
          'aria-label="' + escapeHtml(isMine ? ariaBase + ', Unit Anda' : ariaBase) + '">' +
          '<span class="island-building island-art">' +
            renderIslandSVG(island.id, { width, height, blockColor: island.blockColor }) +
          '</span>' +
          (badge ? '<span class="island-badge" aria-hidden="true">' + escapeHtml(badge.text) + '</span>' : '') +
          '<span class="island-user-pin" aria-hidden="true">' +
            '<svg viewBox="0 0 24 24" width="14" height="14" focusable="false"><path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z" ' +
            'fill="var(--island-ink)"/><circle cx="12" cy="10" r="2.6" fill="var(--board-gold)"/></svg>' +
            'Unit Anda' +
          '</span>' +
          '<span class="island-pill" style="background: ' + pillFill(island) + ';">' +
            '<span class="island-pill-label">' + safeLabel + '</span>' +
          '</span>' +
        '</button>';
    }

    html += '</div>';
    html += '</div>';

    this.container.innerHTML = html;
    this.bindEvents();
  },

  bindEvents() {
    const islandButtons = this.container.querySelectorAll('.world-island');
    for (let i = 0; i < islandButtons.length; i++) {
      islandButtons[i].addEventListener('click', function (e) {
        e.preventDefault();
        const islandId = this.getAttribute('data-id');
        if (islandId) {
          window.location.hash = '#/island/' + islandId;
        }
      });
    }
  }
};

export default WorldScreen;
