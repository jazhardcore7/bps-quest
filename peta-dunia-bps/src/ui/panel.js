// Interactive Info Board Panel with Role-Based Quest Button & Firestore Integration
import { AppState } from '../state/index.js';
import { auth } from '../firebase/client.js';
import {
  fetchUnitData,
  fetchUnitQuests,
  fetchUserCompletions,
  claimQuest
} from '../firebase/quests.js';
import { dailyPeriodKeyJakarta } from '../config.js';
import { showToast } from './hud.js';

let isPanelOpen = false;
let panelCallback = null;
let previousActiveElement = null;
let currentUnitName = 'Biro SDM';
let cachedUnitData = null;
let keydownHandler = null;

const INFO_ROWS = [
  'Profil & Tugas Fungsi',
  'Struktur Organisasi',
  'Fasilitas & Layanan',
  'Papan Informasi Terkini'
];

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderMainContentHtml(buildingUnit, unitData = null) {
  const unit = buildingUnit || 'Biro SDM';
  const data = unitData || cachedUnitData;

  const unitName = (data && data.name) ? data.name : unit;
  const parentUnit = (data && data.parentUnit) ? data.parentUnit : 'Sekretariat Utama';
  const buildingXpText = (data && data.level) ? `Level ${data.level} · 350/600 XP` : 'Level 2 · 350/600 XP';
  const unitDesc = (data && data.description) ? data.description : ('[Deskripsi singkat tugas dan fungsi ' + unit + ', diisi pihak biro]');

  let rowsHtml = '';
  for (let i = 0; i < INFO_ROWS.length; i++) {
    const rowTitle = INFO_ROWS[i];
    rowsHtml += '' +
      '<button type="button" class="info-row-btn" data-row-title="' + rowTitle + '">' +
        '<span class="info-row-label">' + rowTitle + '</span>' +
        '<span class="info-row-arrow" aria-hidden="true">&#8250;</span>' +
      '</button>';
  }

  // Footer decided strictly by ONE function: AppState.canStartQuest(buildingUnit)
  const canStart = AppState.canStartQuest(unit);

  let footerHtml = '';
  if (canStart) {
    footerHtml = '' +
      '<div class="info-panel-footer">' +
        '<button type="button" class="btn-start-quest" id="btn-open-quests">' +
          'Mulai Quest' +
        '</button>' +
      '</div>';
  } else {
    // Render NO button element at all in the DOM
    footerHtml = '' +
      '<div class="info-panel-footer">' +
        '<div class="info-gray-note">' +
          'Quest hanya tersedia untuk pegawai ' + unit +
        '</div>' +
      '</div>';
  }

  return '' +
    '<div class="info-main-view">' +
      '<div class="info-card-header">' +
        '<div class="info-header-left">' +
          '<h2 class="info-unit-title" id="info-panel-title">' + escapeHtml(unitName) + '</h2>' +
          '<span class="info-parent-chip">' + escapeHtml(parentUnit) + '</span>' +
        '</div>' +
        '<div class="info-header-right">' +
          '<span class="info-building-xp-chip">' + escapeHtml(buildingXpText) + '</span>' +
          '<button type="button" class="info-card-close-btn" id="info-card-close" aria-label="Tutup panel">&times;</button>' +
        '</div>' +
      '</div>' +
      '<p class="info-unit-desc">' + escapeHtml(unitDesc) + '</p>' +
      '<div class="info-section-label">Akses Informasi</div>' +
      '<div class="info-rows-list">' +
        rowsHtml +
      '</div>' +
      footerHtml +
    '</div>';
}

function renderSubViewHtml(rowTitle, buildingUnit) {
  const unit = buildingUnit || 'Biro SDM';
  return '' +
    '<div class="info-sub-view">' +
      '<div class="info-sub-header">' +
        '<button type="button" class="info-sub-back-btn" id="info-sub-back" aria-label="Kembali ke menu utama">' +
          '&#8592; Kembali' +
        '</button>' +
        '<button type="button" class="info-card-close-btn" id="info-sub-close" aria-label="Tutup panel">&times;</button>' +
      '</div>' +
      '<h3 class="info-sub-title">' + escapeHtml(rowTitle) + '</h3>' +
      '<div class="info-sub-body">' +
        '<p class="info-sub-placeholder">[Konten diisi pihak ' + escapeHtml(unit) + ']</p>' +
      '</div>' +
    '</div>';
}

function trapFocus(modalElement) {
  const focusableSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

  keydownHandler = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeInfoPanel();
      return;
    }

    if (e.key === 'Tab') {
      const focusable = modalElement.querySelectorAll(focusableSelectors);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  };

  window.addEventListener('keydown', keydownHandler);

  setTimeout(() => {
    const initialFocus = modalElement.querySelector('#info-card-close') || modalElement.querySelector(focusableSelectors);
    if (initialFocus) {
      initialFocus.focus();
    }
  }, 50);
}

function untrapFocus() {
  if (keydownHandler) {
    window.removeEventListener('keydown', keydownHandler);
    keydownHandler = null;
  }
  if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
    try {
      previousActiveElement.focus();
    } catch (e) {}
    previousActiveElement = null;
  }
}

function wireMainViewEvents(card, buildingUnit) {
  const closeBtn = card.querySelector('#info-card-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      closeInfoPanel();
    });
  }

  const rowBtns = card.querySelectorAll('.info-row-btn');
  for (let i = 0; i < rowBtns.length; i++) {
    rowBtns[i].addEventListener('click', function (e) {
      e.preventDefault();
      const rowTitle = this.getAttribute('data-row-title');
      showSubView(card, rowTitle, buildingUnit);
    });
  }

  const questBtn = card.querySelector('#btn-open-quests');
  if (questBtn) {
    questBtn.addEventListener('click', (e) => {
      e.preventDefault();
      showQuestSheet(card, buildingUnit);
    });
  }
}

function showSubView(card, rowTitle, buildingUnit) {
  card.innerHTML = renderSubViewHtml(rowTitle, buildingUnit);

  const backBtn = card.querySelector('#info-sub-back');
  if (backBtn) {
    backBtn.addEventListener('click', (e) => {
      e.preventDefault();
      card.innerHTML = renderMainContentHtml(buildingUnit);
      wireMainViewEvents(card, buildingUnit);
      const firstRow = card.querySelector('.info-row-btn');
      if (firstRow) firstRow.focus();
    });
  }

  const closeBtn = card.querySelector('#info-sub-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      closeInfoPanel();
    });
  }

  if (backBtn) backBtn.focus();
}

async function showQuestSheet(card, buildingUnit) {
  card.innerHTML = '' +
    '<div class="quest-sheet-container">' +
      '<div class="quest-sheet-header">' +
        '<div class="quest-sheet-title-wrap">' +
          '<button type="button" class="quest-sheet-back-btn" id="quest-sheet-back" aria-label="Kembali ke panel">&#8592;</button>' +
          '<h3 class="quest-sheet-title">Quest tersedia</h3>' +
        '</div>' +
        '<button type="button" class="info-card-close-btn" id="quest-sheet-close" aria-label="Tutup panel">&times;</button>' +
      '</div>' +
      '<div class="quest-sheet-list" id="quest-sheet-list">' +
        '<div class="quest-loading-text">Memuat quest...</div>' +
      '</div>' +
    '</div>';

  const backBtn = card.querySelector('#quest-sheet-back');
  if (backBtn) {
    backBtn.addEventListener('click', (e) => {
      e.preventDefault();
      card.innerHTML = renderMainContentHtml(buildingUnit);
      wireMainViewEvents(card, buildingUnit);
      const questBtn = card.querySelector('#btn-open-quests');
      if (questBtn) questBtn.focus();
    });
  }

  const closeBtn = card.querySelector('#quest-sheet-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      closeInfoPanel();
    });
  }

  const uid = auth.currentUser ? auth.currentUser.uid : null;
  const listEl = card.querySelector('#quest-sheet-list');

  try {
    const [quests, completions] = await Promise.all([
      fetchUnitQuests(buildingUnit),
      fetchUserCompletions(uid, buildingUnit)
    ]);

    if (!listEl || !isPanelOpen) return;

    if (!quests || quests.length === 0) {
      listEl.innerHTML = '<div class="quest-empty-text">Belum ada quest aktif untuk unit ini.</div>';
      return;
    }

    renderQuestsList(listEl, quests, completions, buildingUnit);
  } catch (err) {
    console.error('Failed to load quests:', err);
    if (listEl) {
      listEl.innerHTML = '<div class="quest-empty-text" style="color: #DC2626;">Gagal memuat quest. Silakan coba lagi.</div>';
    }
  }
}

function renderQuestsList(listEl, quests, completions, buildingUnit) {
  const now = new Date();
  const todayPeriodKey = dailyPeriodKeyJakarta(now);

  listEl.innerHTML = '';

  quests.forEach((quest) => {
    const periodKey = quest.type === 'daily' ? todayPeriodKey : 'once';
    const isCompleted = completions.some(
      (c) => c.questId === quest.id && c.periodKey === periodKey
    );

    const itemEl = document.createElement('div');
    itemEl.className = 'quest-card-item' + (isCompleted ? ' is-completed' : '') + (quest.quiz ? ' has-quiz' : '');
    itemEl.id = `quest-item-${quest.id}`;

    let actionHtml = '';
    let quizHtml = '';

    if (isCompleted) {
      actionHtml = '' +
        '<div class="quest-item-actions">' +
          '<span class="quest-completed-badge">&#10003; Selesai</span>' +
          '<span class="quest-item-xp">+' + quest.xp + ' XP</span>' +
        '</div>';
    } else if (quest.type === 'daily') {
      actionHtml = '' +
        '<div class="quest-item-actions">' +
          '<button type="button" class="btn-claim-quest btn-claim-daily" data-quest-id="' + quest.id + '">' +
            'Selesaikan (+' + quest.xp + ' XP)' +
          '</button>' +
        '</div>';
    } else {
      // Checkpoint quest
      actionHtml = '' +
        '<div class="quest-item-actions">' +
          '<span class="quest-item-xp">+' + quest.xp + ' XP</span>' +
        '</div>';

      if (quest.quiz && Array.isArray(quest.quiz.options)) {
        const optionsHtml = quest.quiz.options
          .map((opt, idx) => `
            <label class="quiz-option-item" data-opt-idx="${idx}">
              <input type="radio" name="quiz-radio-${quest.id}" value="${idx}" />
              <span>${escapeHtml(opt)}</span>
            </label>
          `)
          .join('');

        quizHtml = '' +
          '<div class="quiz-box" id="quiz-box-' + quest.id + '">' +
            '<div class="quiz-question">' + escapeHtml(quest.quiz.question) + '</div>' +
            '<div class="quiz-options-list" role="radiogroup" aria-label="Pilihan kuis">' +
              optionsHtml +
            '</div>' +
            '<div class="quiz-error-msg" id="quiz-error-' + quest.id + '" style="display: none;"></div>' +
            '<div style="margin-top: 4px;">' +
              '<button type="button" class="btn-claim-quest btn-submit-quiz" data-quest-id="' + quest.id + '">' +
                'Kirim Jawaban' +
              '</button>' +
            '</div>' +
          '</div>';
      } else {
        // Checkpoint without quiz
        actionHtml = '' +
          '<div class="quest-item-actions">' +
            '<button type="button" class="btn-claim-quest btn-claim-checkpoint" data-quest-id="' + quest.id + '">' +
              'Selesaikan (+' + quest.xp + ' XP)' +
            '</button>' +
          '</div>';
      }
    }

    itemEl.innerHTML = '' +
      '<div class="quest-item-top">' +
        '<div class="quest-item-main">' +
          '<div class="quest-item-title">' + escapeHtml(quest.title) + '</div>' +
          '<div class="quest-item-desc">' + escapeHtml(quest.description) + '</div>' +
        '</div>' +
        actionHtml +
      '</div>' +
      quizHtml;

    listEl.appendChild(itemEl);

    // Wire events for this quest card
    wireQuestCardEvents(itemEl, quest);
  });
}

function wireQuestCardEvents(itemEl, quest) {
  // Option selection interaction
  const optionLabels = itemEl.querySelectorAll('.quiz-option-item');
  optionLabels.forEach((label) => {
    label.addEventListener('click', () => {
      optionLabels.forEach((l) => l.classList.remove('selected'));
      label.classList.add('selected');
      const radio = label.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;

      const errorMsg = itemEl.querySelector(`#quiz-error-${quest.id}`);
      if (errorMsg) errorMsg.style.display = 'none';
    });
  });

  // Daily claim button
  const dailyBtn = itemEl.querySelector('.btn-claim-daily');
  if (dailyBtn) {
    dailyBtn.addEventListener('click', (e) => {
      e.preventDefault();
      executeClaim(quest, dailyBtn, itemEl);
    });
  }

  // Checkpoint without quiz claim button
  const checkpointBtn = itemEl.querySelector('.btn-claim-checkpoint');
  if (checkpointBtn) {
    checkpointBtn.addEventListener('click', (e) => {
      e.preventDefault();
      executeClaim(quest, checkpointBtn, itemEl);
    });
  }

  // Checkpoint quiz submit button
  const quizSubmitBtn = itemEl.querySelector('.btn-submit-quiz');
  if (quizSubmitBtn) {
    quizSubmitBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const selectedRadio = itemEl.querySelector(`input[name="quiz-radio-${quest.id}"]:checked`);
      const errorMsg = itemEl.querySelector(`#quiz-error-${quest.id}`);

      if (!selectedRadio) {
        if (errorMsg) {
          errorMsg.textContent = 'Pilih salah satu jawaban terlebih dahulu.';
          errorMsg.style.display = 'block';
        }
        return;
      }

      const selectedIdx = parseInt(selectedRadio.value, 10);
      if (quest.quiz && typeof quest.quiz.correctIndex === 'number' && selectedIdx !== quest.quiz.correctIndex) {
        if (errorMsg) {
          errorMsg.textContent = 'Jawaban belum tepat, silakan coba lagi!';
          errorMsg.style.display = 'block';
        }
        return;
      }

      if (errorMsg) errorMsg.style.display = 'none';
      executeClaim(quest, quizSubmitBtn, itemEl);
    });
  }
}

async function executeClaim(quest, buttonEl, itemEl) {
  if (buttonEl.disabled) return;
  buttonEl.disabled = true;
  const originalText = buttonEl.textContent;
  buttonEl.textContent = 'Memproses...';

  try {
    const result = await claimQuest(quest);

    // Show toast for XP gained
    showToast(`+${result.xp} XP`);

    // Level-up announcement if player level increased
    if (result.levelUp) {
      setTimeout(() => {
        showToast(`Selamat! Kamu naik ke Level ${result.newLevel}! 🎉`, 3200);
      }, 1200);
    }

    // Update quest item UI
    itemEl.classList.add('is-completed');
    const quizBox = itemEl.querySelector('.quiz-box');
    if (quizBox) {
      quizBox.remove();
    }

    const actionArea = itemEl.querySelector('.quest-item-actions');
    if (actionArea) {
      actionArea.innerHTML = '' +
        '<span class="quest-completed-badge">&#10003; Selesai</span>' +
        '<span class="quest-item-xp">+' + quest.xp + ' XP</span>';
    }
  } catch (err) {
    console.error('Claim error:', err);
    showToast('Gagal klaim quest: ' + (err.message || 'Terjadi kesalahan'));
    buttonEl.disabled = false;
    buttonEl.textContent = originalText;
  }
}

export function openInfoPanel(buildingUnit) {
  if (isPanelOpen) return;
  isPanelOpen = true;
  currentUnitName = buildingUnit || 'Biro SDM';
  previousActiveElement = document.activeElement;

  const stage = document.getElementById('stage') || document.body;
  const existing = document.getElementById('info-panel-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.className = 'info-panel-backdrop';
  modal.id = 'info-panel-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'info-panel-title');

  const card = document.createElement('div');
  card.className = 'info-panel-card-white';
  card.id = 'info-panel-card';
  card.innerHTML = renderMainContentHtml(currentUnitName, cachedUnitData);
  modal.appendChild(card);
  stage.appendChild(modal);

  wireMainViewEvents(card, currentUnitName);

  // Asynchronously populate real unit details from Firestore if available
  fetchUnitData(currentUnitName).then((unitData) => {
    if (unitData) {
      cachedUnitData = unitData;
      if (isPanelOpen && document.getElementById('info-panel-modal')) {
        const titleEl = card.querySelector('#info-panel-title');
        const parentChip = card.querySelector('.info-parent-chip');
        const xpChip = card.querySelector('.info-building-xp-chip');
        const descEl = card.querySelector('.info-unit-desc');
        if (titleEl && unitData.name) titleEl.textContent = unitData.name;
        if (parentChip && unitData.parentUnit) parentChip.textContent = unitData.parentUnit;
        if (xpChip && unitData.level) xpChip.textContent = `Level ${unitData.level} · 350/600 XP`;
        if (descEl && unitData.description) descEl.textContent = unitData.description;
      }
    }
  }).catch((err) => {
    console.warn('Could not fetch unit details:', err);
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeInfoPanel();
    }
  });

  trapFocus(modal);

  if (typeof panelCallback === 'function') {
    try {
      panelCallback(true);
    } catch (err) {
      console.error('Panel callback error:', err);
    }
  }

  window.dispatchEvent(new CustomEvent('bps-panel-change', { detail: { open: true, unit: currentUnitName } }));
}

export function closeInfoPanel() {
  if (!isPanelOpen) return;
  isPanelOpen = false;

  untrapFocus();

  const modal = document.getElementById('info-panel-modal');
  if (modal) {
    modal.remove();
  }

  if (typeof panelCallback === 'function') {
    try {
      panelCallback(false);
    } catch (err) {
      console.error('Panel callback error:', err);
    }
  }

  window.dispatchEvent(new CustomEvent('bps-panel-change', { detail: { open: false } }));
}

export function setPanelCallback(fn) {
  panelCallback = fn;
}

export function isInfoPanelOpen() {
  return isPanelOpen;
}

if (typeof window !== 'undefined') {
  window.openInfoPanel = openInfoPanel;
  window.closeInfoPanel = closeInfoPanel;
}

