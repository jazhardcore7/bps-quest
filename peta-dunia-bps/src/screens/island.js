// Screen 2: Island "Sekretariat Utama" (#/island)
import { AppState } from '../state/index.js';
import { BpsData } from '../data/index.js';
import { Hud, showToast } from '../ui/hud.js';

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
      const isSdm = (name === 'Biro SDM');

      const block = tile.querySelector('.biro-building-block');
      const pillText = tile.querySelector('.biro-pill-text');

      if (isCurrent || isSdm) {
        block.style.borderColor = '#FFD24A';
      } else {
        block.style.borderColor = '#FFFFFF';
      }

      if (pillText) {
        if (isCurrent) {
          pillText.textContent = name + ' · Biro Anda';
        } else {
          pillText.textContent = name;
        }
      }

      if (isCurrent) {
        tile.classList.add('is-current-unit');
      } else {
        tile.classList.remove('is-current-unit');
      }
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

    // Biro tiles flex container
    html += '<div class="biro-tiles-layout">';

    const biros = BpsData.biros;
    const currentUnit = AppState.currentUnit;

    // Row 1: 4 biro tiles
    html += '<div class="biro-row biro-row-1">';
    for (let i = 0; i < 4 && i < biros.length; i++) {
      html += this.renderBiroTileHtml(biros[i], currentUnit);
    }
    html += '</div>';

    // Row 2: 3 biro tiles
    html += '<div class="biro-row biro-row-2">';
    for (let j = 4; j < biros.length; j++) {
      html += this.renderBiroTileHtml(biros[j], currentUnit);
    }
    html += '</div>';

    html += '</div>'; // .biro-tiles-layout
    html += '</div>'; // .island-main-oval
    html += '</div>'; // .screen-island

    this.container.innerHTML = html;
    this.bindEvents();
  },

  renderBiroTileHtml(biro, currentUnit) {
    const name = biro.name;
    const isCurrent = (name === currentUnit);
    const isSdm = (name === 'Biro SDM');

    const blockColor = isSdm ? '#4CB8A0' : '#6FA8DC';
    const borderColor = (isCurrent || isSdm) ? '#FFD24A' : '#FFFFFF';
    const pillColor = isSdm ? '#1F8A70' : '#1C4FA0';
    const displayText = isCurrent ? (name + ' · Biro Anda') : name;

    return '' +
      '<button type="button" class="biro-tile' + (isCurrent ? ' is-current-unit' : '') + '" ' +
        'data-id="' + biro.id + '" ' +
        'data-name="' + name + '" ' +
        'aria-label="' + displayText + '">' +
        // Building block: 62x70
        '<div class="biro-building-block" style="background-color: ' + blockColor + '; border-color: ' + borderColor + ';">' +
          '<div class="biro-building-roof"></div>' +
          '<div class="biro-windows">' +
            '<span class="b-win"></span><span class="b-win"></span>' +
            '<span class="b-win"></span><span class="b-win"></span>' +
          '</div>' +
          '<div class="biro-door"></div>' +
        '</div>' +
        // Pill below
        '<div class="biro-pill" style="background-color: ' + pillColor + ';">' +
          '<span class="biro-pill-text">' + displayText + '</span>' +
        '</div>' +
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
          showToast('Peta kantor belum tersedia di prototype', 2000);
        }
      });
    }
  }
};

export default IslandScreen;
