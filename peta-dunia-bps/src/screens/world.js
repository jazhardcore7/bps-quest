// Screen 1: World Map (#/world)
import { AppState } from '../state/index.js';
import { BpsData } from '../data/index.js';
import { Hud } from '../ui/hud.js';
import { escapeHtml } from '../ui/escape.js';

let unsubscribeState = null;

export const WorldScreen = {
  mount(container) {
    this.container = container;
    this.render();

    unsubscribeState = AppState.subscribe(() => {
      this.updateHud();
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

    // Islands Container (all 8 islands unlocked)
    html += '<div class="world-islands" role="region" aria-label="Daftar Pulau Unit Kerja">';

    const islands = BpsData.islands;
    for (let i = 0; i < islands.length; i++) {
      const island = islands[i];
      const left = island.rect[0];
      const top = island.rect[1];
      const width = island.rect[2];
      const height = island.rect[3];
      const safeLabel = escapeHtml(island.label);

      html += '' +
        '<button type="button" class="world-island is-unlocked" ' +
          'id="island-' + escapeHtml(island.id) + '" ' +
          'data-id="' + escapeHtml(island.id) + '" ' +
          'style="left:' + left + 'px; top:' + top + 'px; width:' + width + 'px; height:' + height + 'px;" ' +
          'aria-label="' + safeLabel + '">' +
          '<div class="island-building" style="background-color: ' + escapeHtml(island.blockColor) + ';">' +
            '<div class="building-roof-accent"></div>' +
            '<div class="building-windows">' +
              '<span class="window-pane"></span><span class="window-pane"></span>' +
              '<span class="window-pane"></span><span class="window-pane"></span>' +
            '</div>' +
            '<div class="building-door"></div>' +
          '</div>' +
          '<div class="island-pill" style="background-color: ' + escapeHtml(island.pillColor) + ';">' +
            '<span class="island-pill-label">' + safeLabel + '</span>' +
          '</div>' +
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
