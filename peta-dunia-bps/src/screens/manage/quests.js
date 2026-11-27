// Management Tab 1: Quest creation, editing, deactivation, and super_admin delete
import { AppState } from '../../state/index.js';
import { auth } from '../../firebase/client.js';
import {
  QUEST_XP_MAX_HEAD,
  QUEST_XP_MAX_ADMIN,
  isSuperAdminRole
} from '../../config.js';
import {
  fetchAllQuests,
  saveQuest,
  setQuestActive,
  deleteQuestById,
  mapFirestoreError
} from '../../firebase/manage.js';
import { showToast } from '../../ui/hud.js';
import { escapeHtml } from '../../ui/escape.js';

export function renderQuestsTab(container, ctx) {
  const isSuper = isSuperAdminRole(AppState.player.role);
  const maxXp = isSuper ? QUEST_XP_MAX_ADMIN : QUEST_XP_MAX_HEAD;
  let allQuests = [];
  let editingId = null;
  let quizOptions = ['', ''];
  let correctIndex = 0;

  function getScopedUnits() {
    return ctx.getUnits().filter((u) => u.archived !== true && AppState.canManageUnit(u.id, ctx.getUnits()));
  }

  function renderShell() {
    const scopedUnits = getScopedUnits();
    const unitOptions = scopedUnits.map((u) => (
      '<option value="' + escapeHtml(u.id) + '">' + escapeHtml(u.name) + '</option>'
    )).join('');

    container.innerHTML = '' +
      '<div class="manage-split">' +
        '<section class="manage-form-panel" aria-label="Formulir Quest">' +
          '<h3 class="manage-section-title" id="mq-form-title">Buat Quest Baru</h3>' +
          '<div id="mq-error" class="manage-alert-error" role="alert" style="display:none;"></div>' +
          '<form id="mq-form" class="manage-form" novalidate>' +
            '<div class="manage-field">' +
              '<label for="mq-unit">Unit Kerja</label>' +
              '<select id="mq-unit" class="manage-input" required>' + unitOptions + '</select>' +
            '</div>' +
            '<div class="manage-field">' +
              '<label for="mq-title">Judul Quest (3–80 karakter)</label>' +
              '<input id="mq-title" class="manage-input" type="text" maxlength="80" required />' +
            '</div>' +
            '<div class="manage-field">' +
              '<label for="mq-desc">Deskripsi (maks 300 karakter)</label>' +
              '<textarea id="mq-desc" class="manage-input manage-textarea" rows="2" maxlength="300"></textarea>' +
            '</div>' +
            '<div class="manage-row-2">' +
              '<div class="manage-field">' +
                '<label for="mq-type">Tipe Quest</label>' +
                '<select id="mq-type" class="manage-input">' +
                  '<option value="daily">Harian (daily)</option>' +
                  '<option value="checkpoint">Checkpoint (Kuis)</option>' +
                '</select>' +
              '</div>' +
              '<div class="manage-field">' +
                '<label for="mq-xp">XP (1–' + maxXp + ')</label>' +
                '<input id="mq-xp" class="manage-input" type="number" min="1" max="' + maxXp + '" value="20" required />' +
                '<small class="manage-help">Maksimal ' + maxXp + ' XP untuk ' + (isSuper ? 'Super Admin' : 'Pimpinan') + '.</small>' +
              '</div>' +
            '</div>' +
            '<div class="manage-checkbox-row">' +
              '<input id="mq-active" type="checkbox" checked />' +
              '<label for="mq-active">Quest Aktif</label>' +
            '</div>' +
            '<div id="mq-quiz-section" class="manage-quiz-section" style="display:none;">' +
              '<div class="manage-field">' +
                '<label for="mq-quiz-q">Pertanyaan Kuis (3–200 karakter)</label>' +
                '<input id="mq-quiz-q" class="manage-input" type="text" maxlength="200" />' +
              '</div>' +
              '<div class="manage-field">' +
                '<span class="manage-sublabel">Opsi Jawaban (2–4 opsi, pilih 1 jawaban benar)</span>' +
                '<div id="mq-quiz-options" class="manage-quiz-options"></div>' +
                '<button type="button" id="mq-add-opt" class="manage-btn manage-btn-secondary manage-btn-sm">+ Tambah Opsi</button>' +
              '</div>' +
            '</div>' +
            '<div class="manage-form-actions">' +
              '<button type="submit" id="mq-submit" class="manage-btn manage-btn-primary">Simpan Quest</button>' +
              '<button type="button" id="mq-cancel" class="manage-btn manage-btn-secondary" style="display:none;">Batal Ubah</button>' +
            '</div>' +
          '</form>' +
        '</section>' +
        '<section class="manage-list-panel" aria-label="Daftar Quest">' +
          '<div class="manage-list-header">' +
            '<h3 class="manage-section-title">Quest dalam Cakupan</h3>' +
            '<button type="button" id="mq-refresh" class="manage-btn manage-btn-secondary manage-btn-sm">Muat Ulang</button>' +
          '</div>' +
          '<div id="mq-list" class="manage-list-scroll">' +
            '<div class="manage-empty">Memuat daftar quest...</div>' +
          '</div>' +
        '</section>' +
      '</div>';

    renderQuizOptions();
    bindFormEvents();
    loadQuestsList();
  }

  function renderQuizOptions() {
    const wrap = container.querySelector('#mq-quiz-options');
    const addBtn = container.querySelector('#mq-add-opt');
    if (!wrap) return;

    wrap.innerHTML = quizOptions.map((optVal, idx) => (
      '<div class="manage-quiz-opt-row">' +
        '<input type="radio" name="mq-correct" id="mq-correct-' + idx + '" value="' + idx + '"' +
          (correctIndex === idx ? ' checked' : '') + ' aria-label="Tandai opsi ' + (idx + 1) + ' benar" />' +
        '<label for="mq-opt-' + idx + '" class="sr-only">Opsi ' + (idx + 1) + '</label>' +
        '<input id="mq-opt-' + idx + '" class="manage-input mq-opt-input" data-idx="' + idx + '" type="text" maxlength="100" value="' + escapeHtml(optVal) + '" placeholder="Opsi ' + (idx + 1) + '" />' +
        (quizOptions.length > 2
          ? '<button type="button" class="manage-btn manage-btn-secondary manage-btn-xs mq-del-opt" data-idx="' + idx + '" aria-label="Hapus opsi ' + (idx + 1) + '">&times;</button>'
          : '') +
      '</div>'
    )).join('');

    if (addBtn) {
      addBtn.style.display = quizOptions.length >= 4 ? 'none' : 'inline-flex';
    }

    wrap.querySelectorAll('.mq-opt-input').forEach((inp) => {
      inp.addEventListener('input', (e) => {
        const idx = Number(e.target.getAttribute('data-idx'));
        quizOptions[idx] = e.target.value;
      });
    });

    wrap.querySelectorAll('input[name="mq-correct"]').forEach((radio) => {
      radio.addEventListener('change', (e) => {
        correctIndex = Number(e.target.value);
      });
    });

    wrap.querySelectorAll('.mq-del-opt').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const idx = Number(e.currentTarget.getAttribute('data-idx'));
        if (quizOptions.length <= 2) return;
        quizOptions.splice(idx, 1);
        if (correctIndex >= quizOptions.length) {
          correctIndex = 0;
        }
        renderQuizOptions();
      });
    });
  }

  function showError(msg) {
    const errEl = container.querySelector('#mq-error');
    if (errEl) {
      errEl.textContent = msg;
      errEl.style.display = msg ? 'block' : 'none';
    }
  }

  function resetForm() {
    editingId = null;
    quizOptions = ['', ''];
    correctIndex = 0;
    const form = container.querySelector('#mq-form');
    if (form) form.reset();
    const xpEl = container.querySelector('#mq-xp');
    if (xpEl) xpEl.value = '20';
    const activeEl = container.querySelector('#mq-active');
    if (activeEl) activeEl.checked = true;
    const titleHeader = container.querySelector('#mq-form-title');
    if (titleHeader) titleHeader.textContent = 'Buat Quest Baru';
    const submitBtn = container.querySelector('#mq-submit');
    if (submitBtn) submitBtn.textContent = 'Simpan Quest';
    const cancelBtn = container.querySelector('#mq-cancel');
    if (cancelBtn) cancelBtn.style.display = 'none';
    const quizSection = container.querySelector('#mq-quiz-section');
    if (quizSection) quizSection.style.display = 'none';
    showError('');
    renderQuizOptions();
  }

  function populateFormForEdit(quest) {
    editingId = quest.id;
    container.querySelector('#mq-unit').value = quest.unitId || '';
    container.querySelector('#mq-title').value = quest.title || '';
    container.querySelector('#mq-desc').value = quest.description || '';
    container.querySelector('#mq-type').value = quest.type || 'daily';
    container.querySelector('#mq-xp').value = String(quest.xp || 20);
    container.querySelector('#mq-active').checked = quest.active !== false;

    const quizSection = container.querySelector('#mq-quiz-section');
    if (quest.type === 'checkpoint') {
      quizSection.style.display = 'block';
      container.querySelector('#mq-quiz-q').value = (quest.quiz && quest.quiz.question) || '';
      quizOptions = (quest.quiz && Array.isArray(quest.quiz.options) && quest.quiz.options.length >= 2)
        ? [...quest.quiz.options]
        : ['', ''];
      correctIndex = (quest.quiz && typeof quest.quiz.correctIndex === 'number')
        ? quest.quiz.correctIndex
        : 0;
    } else {
      quizSection.style.display = 'none';
      container.querySelector('#mq-quiz-q').value = '';
      quizOptions = ['', ''];
      correctIndex = 0;
    }

    container.querySelector('#mq-form-title').textContent = 'Ubah Quest';
    container.querySelector('#mq-submit').textContent = 'Perbarui Quest';
    container.querySelector('#mq-cancel').style.display = 'inline-flex';
    showError('');
    renderQuizOptions();
  }

  function bindFormEvents() {
    const typeSelect = container.querySelector('#mq-type');
    const quizSection = container.querySelector('#mq-quiz-section');
    const addOptBtn = container.querySelector('#mq-add-opt');
    const cancelBtn = container.querySelector('#mq-cancel');
    const refreshBtn = container.querySelector('#mq-refresh');
    const form = container.querySelector('#mq-form');

    typeSelect.addEventListener('change', () => {
      quizSection.style.display = typeSelect.value === 'checkpoint' ? 'block' : 'none';
    });

    addOptBtn.addEventListener('click', () => {
      if (quizOptions.length < 4) {
        quizOptions.push('');
        renderQuizOptions();
      }
    });

    cancelBtn.addEventListener('click', () => resetForm());
    refreshBtn.addEventListener('click', () => loadQuestsList());

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      showError('');
      const uid = auth.currentUser ? auth.currentUser.uid : null;
      if (!uid) {
        showError('Sesi tidak ditemukan. Silakan masuk ulang.');
        return;
      }

      const submitBtn = container.querySelector('#mq-submit');
      submitBtn.disabled = true;

      try {
        const type = container.querySelector('#mq-type').value;
        const formInput = {
          unitId: container.querySelector('#mq-unit').value,
          title: container.querySelector('#mq-title').value,
          description: container.querySelector('#mq-desc').value,
          type,
          xp: Number(container.querySelector('#mq-xp').value),
          active: container.querySelector('#mq-active').checked
        };
        if (type === 'checkpoint') {
          formInput.quiz = {
            question: container.querySelector('#mq-quiz-q').value,
            options: [...quizOptions],
            correctIndex
          };
        }

        const wasEditing = Boolean(editingId);
        await saveQuest({ questId: editingId, formInput, uid, isSuperAdmin: isSuper });
        showToast(wasEditing ? 'Quest berhasil diperbarui.' : 'Quest baru berhasil dibuat.');
        resetForm();
        await loadQuestsList();
      } catch (err) {
        showError(err && err.code ? mapFirestoreError(err) : (err.message || 'Gagal menyimpan quest.'));
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  async function loadQuestsList() {
    const listEl = container.querySelector('#mq-list');
    if (!listEl) return;
    listEl.innerHTML = '<div class="manage-empty">Memuat daftar quest...</div>';

    try {
      const quests = await fetchAllQuests();
      allQuests = quests.filter((q) => AppState.canManageUnit(q.unitId, ctx.getUnits()));
      renderQuestsList();
    } catch (err) {
      listEl.innerHTML = '<div class="manage-alert-error" role="alert">' + escapeHtml(mapFirestoreError(err)) + '</div>';
    }
  }

  function renderQuestsList() {
    const listEl = container.querySelector('#mq-list');
    if (!listEl) return;

    if (allQuests.length === 0) {
      listEl.innerHTML = '<div class="manage-empty">Belum ada quest di unit dalam cakupan Anda.</div>';
      return;
    }

    const unitMap = new Map(ctx.getUnits().map((u) => [u.id, u]));
    const grouped = new Map();
    for (const q of allQuests) {
      const key = q.unitId || 'lainnya';
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(q);
    }

    let html = '';
    for (const [unitId, unitQuests] of grouped.entries()) {
      const unitObj = unitMap.get(unitId);
      const groupTitle = unitObj ? unitObj.name : unitId;
      html += '<div class="manage-group">';
      html += '<div class="manage-group-title">' + escapeHtml(groupTitle) + ' (' + unitQuests.length + ')</div>';
      for (const q of unitQuests) {
        const statusClass = q.active === false ? 'is-inactive' : 'is-active';
        const statusText = q.active === false ? 'Nonaktif' : 'Aktif';
        const typeText = q.type === 'checkpoint' ? 'Checkpoint' : 'Harian';
        html += '' +
          '<div class="manage-item-card" data-quest-id="' + escapeHtml(q.id) + '">' +
            '<div class="manage-item-info">' +
              '<div class="manage-item-title">' + escapeHtml(q.title) + '</div>' +
              '<div class="manage-item-meta">' +
                '<span class="manage-badge">' + escapeHtml(typeText) + '</span>' +
                '<span class="manage-badge manage-badge-xp">+' + Number(q.xp || 0) + ' XP</span>' +
                '<span class="manage-badge ' + statusClass + '">' + statusText + '</span>' +
              '</div>' +
            '</div>' +
            '<div class="manage-item-actions">' +
              '<button type="button" class="manage-btn manage-btn-secondary manage-btn-xs mq-edit" data-id="' + escapeHtml(q.id) + '">Ubah</button>' +
              '<button type="button" class="manage-btn manage-btn-secondary manage-btn-xs mq-toggle" data-id="' + escapeHtml(q.id) + '">' +
                (q.active === false ? 'Aktifkan' : 'Nonaktifkan') +
              '</button>' +
              (isSuper
                ? '<button type="button" class="manage-btn manage-btn-danger manage-btn-xs mq-delete" data-id="' + escapeHtml(q.id) + '">Hapus</button>'
                : '') +
            '</div>' +
          '</div>';
      }
      html += '</div>';
    }

    listEl.innerHTML = html;

    listEl.querySelectorAll('.mq-edit').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const quest = allQuests.find((item) => item.id === id);
        if (quest) populateFormForEdit(quest);
      });
    });

    listEl.querySelectorAll('.mq-toggle').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const quest = allQuests.find((item) => item.id === id);
        if (!quest) return;
        const nextActive = quest.active === false;
        if (!nextActive) {
          const ok = await ctx.confirm(`Nonaktifkan quest "${quest.title}"? Pegawai tidak dapat mengklaimnya lagi.`, 'Nonaktifkan');
          if (!ok) return;
        }
        try {
          const uid = auth.currentUser ? auth.currentUser.uid : '';
          await setQuestActive(quest.id, nextActive, uid);
          showToast(nextActive ? 'Quest diaktifkan.' : 'Quest dinonaktifkan.');
          await loadQuestsList();
        } catch (err) {
          showError(mapFirestoreError(err));
        }
      });
    });

    listEl.querySelectorAll('.mq-delete').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const quest = allQuests.find((item) => item.id === id);
        if (!quest) return;
        const ok = await ctx.confirm(`Hapus permanen quest "${quest.title}"? Tindakan ini tidak dapat dibatalkan.`, 'Hapus Permanen');
        if (!ok) return;
        try {
          await deleteQuestById(quest.id);
          showToast('Quest dihapus permanen.');
          if (editingId === quest.id) resetForm();
          await loadQuestsList();
        } catch (err) {
          showError(mapFirestoreError(err));
        }
      });
    });
  }

  renderShell();
}
