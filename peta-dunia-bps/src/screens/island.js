// Screen 2: Island "Sekretariat Utama" (#/island)
import { AppState } from '../state/index.js';
import { BpsData } from '../data/index.js';
import { Hud, showToast } from '../ui/hud.js';
import { renderBigIslandSVG, renderBiroBuildingSVG } from '../ui/island-art.js';
import { icon } from '../ui/icons.js';

let unsubscribeState = null;

export const IslandScreen = {
  mount(container) {
    this.container = container;
    this.render();

    unsubscribeState = AppState.subscribe(() => {
      this.updateTiles();
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

  updateTiles() {
    const currentUnit = AppState.currentUnit;
    const tiles = this.container.querySelectorAll('.biro-tile');

    for (let i = 0; i < tiles.length; i++) {
      const tile = tiles[i];
      const name = tile.getAttribute('data-name');
      const isCurrent = (name === currentUnit);

      tile.classList.toggle('is-current-unit', isCurrent);
      tile.setAttribute('aria-label', isCurrent ? (name + ' · Biro Anda') : name);
    }
  },

  render() {
    let html = '<div class="screen screen-island">';

    // Left HUD Card with Back Button
    html += '<div class="hud-left-wrapper">';
    html += Hud.renderLeftCard({
      title: 'Sekretariat Utama',
      subtitle: 'Sekretariat Utama · 7 biro',
      hasBack: true
    });
    html += '</div>';

    // Right HUD Card
    html += '<div class="hud-right-wrapper">';
    html += Hud.renderRightCard(AppState);
    html += '</div>';

    // Large Island Oval (rect: 70, 110, 820, 420)
    html += '<div class="island-main-oval" style="left: 70px; top: 110px; width: 820px; height: 420px;" role="region" aria-label="Pulau Sekretariat Utama">';
    html += renderBigIslandSVG(820, 420);

    // Biro tiles flex container
    html += '<div class="biro-tiles-layout">';

    const biros = BpsData.biros;
    const currentUnit = AppState.currentUnit;

    // Row 1: 4 biro tiles
    html += '<div class="biro-row biro-row-1">';
    for (let i = 0; i < 4 && i < biros.length; i++) {
      html += this.renderBiroTileHtml(biros[i], currentUnit, i);
    }
    html += '</div>';

    // Row 2: 3 biro tiles
    html += '<div class="biro-row biro-row-2">';
    for (let j = 4; j < biros.length; j++) {
      html += this.renderBiroTileHtml(biros[j], currentUnit, j);
    }
    html += '</div>';

    html += '</div>'; // .biro-tiles-layout
    html += '</div>'; // .island-main-oval
    html += '</div>'; // .screen-island

    this.container.innerHTML = html;
    this.bindEvents();
  },

  renderBiroTileHtml(biro, currentUnit, index = 0) {
    const name = biro.name;
    const isCurrent = (name === currentUnit);
    const isSdm = (name === 'Biro SDM');
    const displayText = isCurrent ? (name + ' · Biro Anda') : name;
    const tint = isSdm ? 'var(--unit-sestama-tint)' : 'var(--unit-biro-tint)';
    const pillUnit = isSdm ? 'sestama' : 'biro';

    return '' +
      '<button type="button" class="biro-tile' + (isCurrent ? ' is-current-unit' : '') + (isSdm ? ' is-playable' : '') + '" ' +
        'data-id="' + biro.id + '" ' +
        'data-name="' + name + '" ' +
        'aria-label="' + displayText + '">' +
        '<span class="biro-tooltip" aria-hidden="true">' + name + '</span>' +
        '<span class="biro-ribbon" aria-hidden="true">' + icon('starFilled', { size: 's' }) + 'Biro Anda</span>' +
        '<span class="biro-building">' +
          renderBiroBuildingSVG(biro, index, tint) +
          (isSdm ? '<span class="biro-star">' + icon('starFilled', { size: 'l' }) + '</span>' : '') +
        '</span>' +
        '<span class="pill biro-pill" data-unit="' + pillUnit + '">' +
          '<span class="biro-pill-text">' + name + '</span>' +
        '</span>' +
      '</button>';
  },

  bindEvents() {
    // Bind HUD back button
    Hud.bindLeftCardEvents(this.container, () => {
      window.location.hash = '#/world';
    });

    // Bind Biro tile clicks
    const tiles = this.container.querySelectorAll('.biro-tile');
    for (let i = 0; i < tiles.length; i++) {
      tiles[i].addEventListener('click', function (e) {
        e.preventDefault();
        const name = this.getAttribute('data-name');
        if (name === 'Biro SDM') {
          window.location.hash = '#/office';
        } else {
          showToast('Peta kantor belum tersedia di prototype');
        }
      });
    }
  }
};

export default IslandScreen;

