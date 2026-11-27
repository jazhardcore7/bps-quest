// Interactive Info Board Panel with Role-Based Quest Button & Unit Profile Data
import { AppState } from '../state/index.js';
import { auth } from '../firebase/client.js';
import {
  fetchUnitQuests,
  fetchUserCompletions,
  claimQuest
} from '../firebase/quests.js';
import { loadUnits, getCachedUnits, getChildUnits } from '../firebase/units.js';
import { dailyPeriodKeyJakarta } from '../config.js';
import { showToast } from './hud.js';
import { escapeHtml } from './escape.js';
import { icon } from './icons.js';

let isPanelOpen = false;
let panelCallback = null;
let previousActiveElement = null;
let currentUnitId = 'biro-sdm';
let allUnits = [];
let currentUnitData = null;
let keydownHandler = null;
let unsubscribeQuestAccess = null;

const INFO_ROWS = [
  'Profil & Tugas Fungsi',
  'Struktur Organisasi',
  'Fasilitas & Layanan',
  'Papan Informasi Terkini'
];

// Presentation only: icon per access row (same order as INFO_ROWS).
const INFO_ROW_ICONS = ['fileText', 'users', 'house', 'calendar'];

function findUnit(units, unitId) {
  return (units || []).find((u) => u.id === unitId) || null;
}

function getParentName(units, unit) {
  if (!unit || !unit.parentId) return 'BPS Republik Indonesia';
  const parent = findUnit(units, unit.parentId);
  return parent ? parent.name : unit.parentId;
}

function renderMainContentHtml(unitId, unitData, unitsList) {
  const unit = unitData || findUnit(unitsList, unitId);
  const unitName = unit ? unit.name : unitId;
  const parentName = unit ? getParentName(unitsList, unit) : 'BPS Republik Indonesia';
  const summaryText = (unit && unit.summary)
    ? unit.summary
    : 'Profil unit kerja sedang disiapkan.';

  let rowsHtml = '';
  for (let i = 0; i < INFO_ROWS.length; i++) {
    const rowTitle = INFO_ROWS[i];
    rowsHtml += '' +
      '<button type="button" class="info-row-btn" data-row-title="' + escapeHtml(rowTitle) + '">' +
        '<span class="info-row-icon" aria-hidden="true">' + icon(INFO_ROW_ICONS[i] || 'info') + '</span>' +
        '<span class="info-row-label">' + escapeHtml(rowTitle) + '</span>' +
        '<span class="info-row-arrow" aria-hidden="true">' + icon('chevronRight') + '</span>' +
      '</button>';
  }

  // Footer decided strictly by ONE function: AppState.canStartQuest(unitId)
  const canStart = AppState.canStartQuest(unitId);

  let footerHtml = '';
  if (canStart) {
    footerHtml = '' +
      '<div class="info-panel-footer">' +
        '<button type="button" class="btn btn--primary btn--lg btn--block btn-start-quest" id="btn-open-quests">' +
          icon('flag') + 'Mulai Quest' +
        '</button>' +
      '</div>';
  } else {
    // Render NO button element at all in the DOM
    footerHtml = '' +
      '<div class="info-panel-footer">' +
        '<div class="info-gray-note">' +
          '<span class="info-gray-note-icon" aria-hidden="true">' + icon('lock') + '</span>' +
          '<span>Quest hanya tersedia untuk pegawai ' + escapeHtml(unitName) + '</span>' +
        '</div>' +
      '</div>';
  }

  return '' +
    '<div class="info-main-view">' +
      '<div class="info-card-header">' +
        '<h2 class="ribbon info-unit-title" id="info-panel-title">' + escapeHtml(unitName) + '</h2>' +
        '<div class="info-header-left">' +
          '<span class="pill info-parent-chip">' + escapeHtml(parentName) + '</span>' +
        '</div>' +
        '<button type="button" class="btn btn--secondary btn--icon info-card-close-btn" id="info-card-close" aria-label="Tutup panel">' + icon('close') + '</button>' +
      '</div>' +
      '<p class="info-unit-desc">' + escapeHtml(summaryText) + '</p>' +
      (unit && unit.verified === false
        ? '<p class="info-unverified-note">Profil sedang dilengkapi bersama unit terkait.</p>'
        : '') +
      '<div class="info-section-label">Akses Informasi</div>' +
      '<div class="info-rows-list">' +
        rowsHtml +
      '</div>' +
      footerHtml +
    '</div>';
}

function renderSubViewBodyHtml(rowTitle, unit, unitsList) {
  if (!unit) {
    return '<p class="info-sub-empty">Data unit tidak tersedia.</p>';
  }

  if (rowTitle === 'Profil & Tugas Fungsi') {
    const tugas = Array.isArray(unit.tugas) ? unit.tugas : [];
    const listHtml = tugas.length > 0
      ? '<ul class="info-sub-list">' + tugas.map((t) => '<li>' + escapeHtml(t) + '</li>').join('') + '</ul>'
      : '<p class="info-sub-empty">Belum ada rincian tugas tercatat.</p>';
    const unverifiedNote = unit.verified === false
      ? '<p class="info-unverified-note">Profil sedang dilengkapi bersama unit terkait.</p>'
      : '';
    return '' +
      '<p class="info-sub-summary">' + escapeHtml(unit.summary || '') + '</p>' +
      unverifiedNote +
      '<div class="info-sub-label">Tugas dan Fungsi</div>' +
      listHtml;
  }

  if (rowTitle === 'Struktur Organisasi') {
    const children = getChildUnits(unitsList, unit.id);
    const headLine = '<p class="info-sub-summary"><strong>Pimpinan Unit:</strong> ' +
      escapeHtml(unit.headTitle || '-') + '</p>';
    const childHtml = children.length > 0
      ? '<div class="info-sub-label">Unit di Bawahnya (' + children.length + ')</div>' +
        '<ul class="info-sub-list">' + children.map((c) => '<li>' + escapeHtml(c.name) + '</li>').join('') + '</ul>'
      : '<p class="info-sub-empty">Tidak memiliki unit kerja bawahan langsung.</p>';
    return headLine + childHtml;
  }

  if (rowTitle === 'Fasilitas & Layanan') {
    const services = Array.isArray(unit.services) ? unit.services : [];
    if (services.length === 0) {
      return '<p class="info-sub-empty">Belum ada informasi layanan.</p>';
    }
    return '<ul class="info-sub-list">' + services.map((s) => '<li>' + escapeHtml(s) + '</li>').join('') + '</ul>';
  }

  if (rowTitle === 'Papan Informasi Terkini') {
    const rawAnnouncements = Array.isArray(unit.announcements) ? [...unit.announcements] : [];
    if (rawAnnouncements.length === 0) {
      return '<p class="info-sub-empty">Belum ada pengumuman.</p>';
    }
    rawAnnouncements.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    return '<ul class="info-ann-list">' + rawAnnouncements.map((ann) => '' +
      '<li class="info-ann-item">' +
        '<span class="info-ann-date">' + escapeHtml(String(ann.createdAt || '')) + '</span>' +
        '<span class="info-ann-text">' + escapeHtml(String(ann.text || '')) + '</span>' +
      '</li>'
    ).join('') + '</ul>';
  }

  return '<p class="info-sub-empty">Informasi belum tersedia.</p>';
}

function renderSubViewHtml(rowTitle, unit, unitsList) {
  return '' +
    '<div class="info-sub-view" data-active-row="' + escapeHtml(rowTitle) + '">' +
      '<div class="info-sub-header">' +
        '<button type="button" class="btn btn--secondary info-sub-back-btn" id="info-sub-back" aria-label="Kembali ke menu utama">' +
          icon('arrowLeft') + 'Kembali' +
        '</button>' +
        '<button type="button" class="btn btn--secondary btn--icon info-card-close-btn" id="info-sub-close" aria-label="Tutup panel">' + icon('close') + '</button>' +
      '</div>' +
      '<h3 class="info-sub-title">' + escapeHtml(rowTitle) + '</h3>' +
      '<div class="info-sub-body">' +
        renderSubViewBodyHtml(rowTitle, unit, unitsList) +
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

function wireMainViewEvents(card, unitId) {
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
      showSubView(card, rowTitle, unitId);
    });
  }

  const questBtn = card.querySelector('#btn-open-quests');
  if (questBtn) {
    questBtn.addEventListener('click', (e) => {
      e.preventDefault();
      showQuestSheet(card, unitId);
    });
  }
}

function showSubView(card, rowTitle, unitId) {
  const unit = currentUnitData || findUnit(allUnits, unitId);
  card.innerHTML = renderSubViewHtml(rowTitle, unit, allUnits);

  const backBtn = card.querySelector('#info-sub-back');
  if (backBtn) {
    backBtn.addEventListener('click', (e) => {
      e.preventDefault();
      card.innerHTML = renderMainContentHtml(unitId, currentUnitData, allUnits);
      wireMainViewEvents(card, unitId);
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

async function showQuestSheet(card, unitId) {
  card.innerHTML = '' +
    '<div class="quest-sheet-container">' +
      '<div class="quest-sheet-header">' +
        '<div class="quest-sheet-title-wrap">' +
          '<button type="button" class="btn btn--secondary btn--icon quest-sheet-back-btn" id="quest-sheet-back" aria-label="Kembali ke panel">' + icon('arrowLeft') + '</button>' +
          '<h3 class="quest-sheet-title">Quest tersedia</h3>' +
        '</div>' +
        '<button type="button" class="btn btn--secondary btn--icon info-card-close-btn" id="quest-sheet-close" aria-label="Tutup panel">' + icon('close') + '</button>' +
      '</div>' +
      '<div class="quest-sheet-list" id="quest-sheet-list" aria-live="polite">' +
        '<div class="quest-loading-text">' + icon('spinner', { className: 'spin' }) + 'Memuat quest...</div>' +
      '</div>' +
    '</div>';

  const backBtn = card.querySelector('#quest-sheet-back');
  if (backBtn) {
    backBtn.addEventListener('click', (e) => {
      e.preventDefault();
      card.innerHTML = renderMainContentHtml(unitId, currentUnitData, allUnits);
      wireMainViewEvents(card, unitId);
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
      fetchUnitQuests(unitId),
      fetchUserCompletions(uid, unitId)
    ]);

    if (!listEl || !isPanelOpen) return;

    if (!quests || quests.length === 0) {
      listEl.innerHTML = '<div class="quest-empty-text">' + icon('flag', { size: 'l' }) + 'Belum ada quest aktif untuk unit ini.</div>';
      return;
    }

    renderQuestsList(listEl, quests, completions);
  } catch (err) {
    console.error('Failed to load quests:', err);
    if (listEl) {
      listEl.innerHTML = '<div class="quest-empty-text is-error">' + icon('alert', { size: 'l' }) + 'Gagal memuat quest. Silakan coba lagi.</div>';
    }
  }
}

function renderQuestsList(listEl, quests, completions) {
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
          '<span class="quest-completed-badge">' + icon('checkCircle', { size: 's' }) + 'Selesai</span>' +
        '</div>';
    } else if (quest.type === 'daily') {
      actionHtml = '' +
        '<div class="quest-item-actions">' +
          '<button type="button" class="btn btn--primary btn-claim-quest btn-claim-daily" data-quest-id="' + escapeHtml(quest.id) + '">' +
            'Selesaikan (+' + quest.xp + ' XP)' +
          '</button>' +
        '</div>';
    } else {
      actionHtml = '' +
        '<div class="quest-item-actions"></div>';

      if (quest.quiz && Array.isArray(quest.quiz.options)) {
        const optionsHtml = quest.quiz.options
          .map((opt, idx) => `
            <label class="quiz-option-item" data-opt-idx="${idx}">
              <input type="radio" name="quiz-radio-${escapeHtml(quest.id)}" value="${idx}" />
              <span class="quiz-option-mark" aria-hidden="true"></span>
              <span class="quiz-option-text">${escapeHtml(opt)}</span>
            </label>
          `)
          .join('');

        quizHtml = '' +
          '<div class="quiz-box" id="quiz-box-' + escapeHtml(quest.id) + '">' +
            '<div class="quiz-question">' + escapeHtml(quest.quiz.question) + '</div>' +
            '<div class="quiz-options-list" role="radiogroup" aria-label="Pilihan kuis">' +
              optionsHtml +
            '</div>' +
            '<div class="quiz-error-msg" id="quiz-error-' + escapeHtml(quest.id) + '" role="alert" style="display: none;"></div>' +
            '<div class="quiz-submit-row">' +
              '<button type="button" class="btn btn--primary btn-claim-quest btn-submit-quiz" data-quest-id="' + escapeHtml(quest.id) + '">' +
                'Kirim Jawaban' +
              '</button>' +
            '</div>' +
          '</div>';
      } else {
        actionHtml = '' +
          '<div class="quest-item-actions">' +
            '<button type="button" class="btn btn--primary btn-claim-quest btn-claim-checkpoint" data-quest-id="' + escapeHtml(quest.id) + '">' +
              'Selesaikan (+' + quest.xp + ' XP)' +
            '</button>' +
          '</div>';
      }
    }

    const typeLabel = quest.type === 'daily' ? 'Harian' : 'Checkpoint';
    const stateHtml = isCompleted
      ? ''
      : '<span class="quest-state-tag">' + icon('star', { size: 's' }) + 'Tersedia</span>';
    const xpValue = escapeHtml(String(quest.xp));

    itemEl.innerHTML = '' +
      '<div class="quest-item-badges">' +
        '<span class="quest-type-badge is-' + (quest.type === 'daily' ? 'daily' : 'checkpoint') + '">' +
          icon(quest.type === 'daily' ? 'calendar' : 'flag', { size: 's' }) + typeLabel +
        '</span>' +
        '<span class="xp-badge quest-item-xp">' + icon('coin') + '+' + xpValue + ' XP</span>' +
        stateHtml +
      '</div>' +
      '<div class="quest-item-top">' +
        '<div class="quest-item-main">' +
          '<div class="quest-item-title">' + escapeHtml(quest.title) + '</div>' +
          '<div class="quest-item-desc">' + escapeHtml(quest.description || '') + '</div>' +
        '</div>' +
        actionHtml +
      '</div>' +
      quizHtml;

    listEl.appendChild(itemEl);
    wireQuestCardEvents(itemEl, quest);
  });
}

function wireQuestCardEvents(itemEl, quest) {
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

  const dailyBtn = itemEl.querySelector('.btn-claim-daily');
  if (dailyBtn) {
    dailyBtn.addEventListener('click', (e) => {
      e.preventDefault();
      executeClaim(quest, dailyBtn, itemEl);
    });
  }

  const checkpointBtn = itemEl.querySelector('.btn-claim-checkpoint');
  if (checkpointBtn) {
    checkpointBtn.addEventListener('click', (e) => {
      e.preventDefault();
      executeClaim(quest, checkpointBtn, itemEl);
    });
  }

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

// Friendly claim error text; raw Firestore messages are never shown.
function claimErrorMessage(err) {
  const code = (err && err.code) || '';
  if (code === 'permission-denied') {
    return 'Klaim ditolak. Quest ini mungkin sudah kamu selesaikan atau belum tersedia untuk unitmu.';
  }
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
  if (code === 'unavailable' || code === 'deadline-exceeded' || code === 'auth/network-request-failed' || offline) {
    return 'Koneksi bermasalah. Coba lagi sebentar lagi.';
  }
  return 'Klaim gagal. Coba lagi nanti.';
}

async function executeClaim(quest, buttonEl, itemEl) {
  if (buttonEl.disabled) return;
  buttonEl.disabled = true;
  const originalText = buttonEl.textContent;
  buttonEl.textContent = 'Memproses...';

  try {
    const result = await claimQuest(quest);

    showToast(`+${result.xp} XP`);

    // Level-up is celebrated by src/ui/levelup.js, which watches the level in
    // AppState (updated by the user-profile snapshot after this claim).

    itemEl.classList.add('is-completed');
    const quizBox = itemEl.querySelector('.quiz-box');
    if (quizBox) {
      quizBox.remove();
    }

    const actionArea = itemEl.querySelector('.quest-item-actions');
    if (actionArea) {
      actionArea.innerHTML = '' +
        '<span class="quest-completed-badge">' + icon('checkCircle', { size: 's' }) + 'Selesai</span>';
      const stateTag = itemEl.querySelector('.quest-state-tag');
      if (stateTag) stateTag.remove();
    }
  } catch (err) {
    console.error('Claim error:', err);
    showToast(claimErrorMessage(err));
    buttonEl.disabled = false;
    buttonEl.textContent = originalText;
  }
}

export function openInfoPanel(unitId) {
  if (isPanelOpen) return;
  isPanelOpen = true;
  currentUnitId = unitId || 'biro-sdm';
  allUnits = getCachedUnits();
  currentUnitData = findUnit(allUnits, currentUnitId);
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
  card.innerHTML = renderMainContentHtml(currentUnitId, currentUnitData, allUnits);
  modal.appendChild(card);
  stage.appendChild(modal);

  wireMainViewEvents(card, currentUnitId);

  let canStart = AppState.canStartQuest(currentUnitId);
  unsubscribeQuestAccess = AppState.subscribe(() => {
    const now = AppState.canStartQuest(currentUnitId);
    if (now === canStart) return;
    canStart = now;
    if (card.querySelector('.info-main-view')) {
      const hadFocus = card.contains(document.activeElement);
      card.innerHTML = renderMainContentHtml(currentUnitId, currentUnitData, allUnits);
      wireMainViewEvents(card, currentUnitId);
      const closeBtn = card.querySelector('#info-card-close');
      if (hadFocus && closeBtn) closeBtn.focus();
    }
  });

  // Load fresh cached/Firestore units and refresh open view if unit data arrived
  loadUnits().then((units) => {
    if (!isPanelOpen || !document.getElementById('info-panel-modal')) return;
    allUnits = units;
    currentUnitData = findUnit(allUnits, currentUnitId);
    if (card.querySelector('.info-main-view')) {
      const hadFocus = card.contains(document.activeElement);
      card.innerHTML = renderMainContentHtml(currentUnitId, currentUnitData, allUnits);
      wireMainViewEvents(card, currentUnitId);
      const closeBtn = card.querySelector('#info-card-close');
      if (hadFocus && closeBtn) closeBtn.focus();
    } else {
      const subView = card.querySelector('.info-sub-view');
      if (subView) {
        const activeRow = subView.getAttribute('data-active-row');
        if (activeRow) showSubView(card, activeRow, currentUnitId);
      }
    }
  }).catch((err) => {
    console.warn('Could not load unit details:', err);
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

  window.dispatchEvent(new CustomEvent('bps-panel-change', { detail: { open: true, unit: currentUnitId } }));
}

export function closeInfoPanel() {
  if (!isPanelOpen) return;
  isPanelOpen = false;

  if (unsubscribeQuestAccess) {
    unsubscribeQuestAccess();
    unsubscribeQuestAccess = null;
  }

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
