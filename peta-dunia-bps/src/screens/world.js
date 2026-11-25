// Screen 1: World Map (#/world)
import { AppState } from '../state/index.js';
import { BpsData } from '../data/index.js';
import { Hud, showToast } from '../ui/hud.js';
import { renderIslandSVG, renderWorldAmbient } from '../ui/island-art.js';
import { icon } from '../ui/icons.js';

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

    // Decorative sea layer (routes, sparkles, compass, boats, clouds)
    html += renderWorldAmbient(BpsData.islands);

    // Islands Container
    html += '<div class="world-islands" role="region" aria-label="Daftar Pulau Unit Kerja">';

    const islands = BpsData.islands;
    for (let i = 0; i < islands.length; i++) {
      const island = islands[i];
      const left = island.rect[0];
      const top = island.rect[1];
      const width = island.rect[2];
      const height = island.rect[3];

      const badgeHtml = (!island.locked && island.star)
        ? '<span class="island-star">' + icon('starFilled', { size: 'l' }) + '</span>'
        : '';

      html += '' +
        '<button type="button" class="world-island' + (island.locked ? ' is-locked' : ' is-unlocked') + '" ' +
          'id="island-' + island.id + '" ' +
          'data-id="' + island.id + '" ' +
          'style="left:' + left + 'px; top:' + top + 'px; width:' + width + 'px; height:' + height + 'px;" ' +
          'aria-label="' + island.label + (island.locked ? ' (Terkunci)' : '') + '">' +
          '<span class="island-art">' + renderIslandSVG(island) + badgeHtml + '</span>' +
          // Label pill (unit color + lock icon when locked; meaning never by color alone)
          '<span class="pill island-pill' + (island.locked ? ' is-locked' : '') + '" data-unit="' + island.id + '">' +
            (island.locked ? icon('lock', { size: 's' }) : '') +
            '<span class="island-pill-label">' + island.label + '</span>' +
          '</span>' +
        '</button>';
    }

    html += '</div>'; // .world-islands
    html += '</div>'; // .screen-world

    this.container.innerHTML = html;
    this.bindEvents();
  },

  bindEvents() {
    const islandButtons = this.container.querySelectorAll('.world-island');
    for (let i = 0; i < islandButtons.length; i++) {
      islandButtons[i].addEventListener('click', function (e) {
        e.preventDefault();
        const islandId = this.getAttribute('data-id');

        if (islandId === 'sestama') {
          window.location.hash = '#/island';
        } else {
          showToast('Pulau ini segera hadir');
        }
      });
    }
  }
};

export default WorldScreen;

