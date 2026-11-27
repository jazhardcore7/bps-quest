// Management Tab 3: Konten Unit (summary, tugas, services, announcements)
import { AppState } from '../../state/index.js';
import { auth } from '../../firebase/client.js';
import {
  saveUnitContent,
  createAnnouncementItem,
  mapFirestoreError
} from '../../firebase/manage.js';
import { showToast } from '../../ui/hud.js';
import { escapeHtml } from '../../ui/escape.js';

export function renderContentTab(container, ctx) {
  const scopedUnits = ctx.getUnits().filter(
    (u) => u.archived !== true && AppState.canManageUnit(u.id, ctx.getUnits())
  );

  let selectedUnitId = scopedUnits[0] ? scopedUnits[0].id : '';
  let announcements = [];

  function getSelectedUnit() {
    return ctx.getUnits().find((u) => u.id === selectedUnitId) || null;
  }

  function renderShell() {
    if (scopedUnits.length === 0) {
      container.innerHTML = '<div class="manage-empty">Tidak ada unit aktif dalam cakupan Anda.</div>';
      return;
    }

    const unitOptions = scopedUnits.map((u) => (
      '<option value="' + escapeHtml(u.id) + '"' + (u.id === selectedUnitId ? ' selected' : '') + '>' +
        escapeHtml(u.name) +
      '</option>'
    )).join('');

    container.innerHTML = '' +
      '<div class="manage-content-wrap">' +
        '<div id="mc-error" class="manage-alert-error" role="alert" style="display:none;"></div>' +
        '<form id="mc-form" class="manage-form" novalidate>' +
          '<div class="manage-field">' +
            '<label for="mc-unit">Pilih Unit Kerja</label>' +
            '<select id="mc-unit" class="manage-input">' + unitOptions + '</select>' +
          '</div>' +
          '<div class="manage-split">' +
            '<div class="manage-form-panel">' +
              '<div class="manage-field">' +
                '<label for="mc-summary">Ringkasan Unit (<span id="mc-summary-count">0</span>/400 karakter)</label>' +
                '<textarea id="mc-summary" class="manage-input manage-textarea" rows="3" maxlength="400"></textarea>' +
              '</div>' +
              '<div class="manage-field">' +
                '<label for="mc-tugas">Tugas dan Fungsi — satu butir per baris (<span id="mc-tugas-count">0</span>/6 baris, maks 200 karakter/baris)</label>' +
                '<textarea id="mc-tugas" class="manage-input manage-textarea" rows="4"></textarea>' +
              '</div>' +
              '<div class="manage-field">' +
                '<label for="mc-services">Fasilitas dan Layanan — satu layanan per baris (<span id="mc-services-count">0</span>/8 baris, maks 120 karakter/baris)</label>' +
                '<textarea id="mc-services" class="manage-input manage-textarea" rows="3"></textarea>' +
              '</div>' +
            '</div>' +
            '<div class="manage-list-panel">' +
              '<h3 class="manage-section-title">Papan Pengumuman (<span id="mc-ann-count">0</span>/5)</h3>' +
              '<div class="manage-field">' +
                '<label for="mc-ann-text">Tambah Pengumuman Baru (<span id="mc-ann-chars">0</span>/240 karakter)</label>' +
                '<div class="manage-inline-add">' +
                  '<input id="mc-ann-text" class="manage-input" type="text" maxlength="240" placeholder="Tulis pengumuman singkat..." />' +
                  '<button type="button" id="mc-ann-add" class="manage-btn manage-btn-secondary manage-btn-sm">Tambah</button>' +
                '</div>' +
              '</div>' +
              '<div id="mc-ann-list" class="manage-ann-list"></div>' +
              '<div class="manage-form-actions" style="margin-top:auto;">' +
                '<button type="submit" id="mc-submit" class="manage-btn manage-btn-primary">Simpan Konten Unit</button>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</form>' +
      '</div>';

    bindEvents();
    loadSelectedUnitIntoForm();
  }

  function showError(msg) {
    const errEl = container.querySelector('#mc-error');
    if (errEl) {
      errEl.textContent = msg;
      errEl.style.display = msg ? 'block' : 'none';
    }
  }

  function updateCounters() {
    const summaryEl = container.querySelector('#mc-summary');
    const tugasEl = container.querySelector('#mc-tugas');
    const servicesEl = container.querySelector('#mc-services');
    const annTextEl = container.querySelector('#mc-ann-text');

    if (summaryEl) {
      container.querySelector('#mc-summary-count').textContent = String(summaryEl.value.length);
    }
    if (tugasEl) {
      const lines = tugasEl.value.split('\n').map((s) => s.trim()).filter(Boolean);
      container.querySelector('#mc-tugas-count').textContent = String(lines.length);
    }
    if (servicesEl) {
      const lines = servicesEl.value.split('\n').map((s) => s.trim()).filter(Boolean);
      container.querySelector('#mc-services-count').textContent = String(lines.length);
    }
    if (annTextEl) {
      container.querySelector('#mc-ann-chars').textContent = String(annTextEl.value.length);
    }
    const annCountEl = container.querySelector('#mc-ann-count');
    if (annCountEl) annCountEl.textContent = String(announcements.length);
    const addBtn = container.querySelector('#mc-ann-add');
    if (addBtn) addBtn.disabled = announcements.length >= 5;
  }

  function renderAnnouncementsList() {
    const listEl = container.querySelector('#mc-ann-list');
    if (!listEl) return;
    if (announcements.length === 0) {
      listEl.innerHTML = '<div class="manage-empty">Belum ada pengumuman.</div>';
      updateCounters();
      return;
    }

    listEl.innerHTML = announcements.map((ann, idx) => (
      '<div class="manage-ann-item">' +
        '<div class="manage-ann-body">' +
          '<span class="manage-ann-date">' + escapeHtml(String(ann.createdAt || '')) + '</span>' +
          '<span class="manage-ann-text">' + escapeHtml(String(ann.text || '')) + '</span>' +
        '</div>' +
        '<button type="button" class="manage-btn manage-btn-secondary manage-btn-xs mc-ann-del" data-idx="' + idx + '" aria-label="Hapus pengumuman">Hapus</button>' +
      '</div>'
    )).join('');

    listEl.querySelectorAll('.mc-ann-del').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const idx = Number(e.currentTarget.getAttribute('data-idx'));
        announcements.splice(idx, 1);
        renderAnnouncementsList();
      });
    });

    updateCounters();
  }

  function loadSelectedUnitIntoForm() {
    const unit = getSelectedUnit();
    showError('');
    if (!unit) return;
    container.querySelector('#mc-summary').value = unit.summary || '';
    container.querySelector('#mc-tugas').value = (Array.isArray(unit.tugas) ? unit.tugas : []).join('\n');
    container.querySelector('#mc-services').value = (Array.isArray(unit.services) ? unit.services : []).join('\n');
    announcements = Array.isArray(unit.announcements) ? unit.announcements.map((a) => ({ ...a })) : [];
    renderAnnouncementsList();
    updateCounters();
  }

  function bindEvents() {
    container.querySelector('#mc-unit').addEventListener('change', (e) => {
      selectedUnitId = e.target.value;
      loadSelectedUnitIntoForm();
    });

    ['#mc-summary', '#mc-tugas', '#mc-services', '#mc-ann-text'].forEach((sel) => {
      container.querySelector(sel).addEventListener('input', updateCounters);
    });

    container.querySelector('#mc-ann-add').addEventListener('click', () => {
      showError('');
      if (announcements.length >= 5) {
        showError('Pengumuman maksimal 5 item.');
        return;
      }
      const textInput = container.querySelector('#mc-ann-text');
      const text = textInput.value.trim();
      if (!text) {
        showError('Tulis teks pengumuman terlebih dahulu.');
        return;
      }
      const uid = auth.currentUser ? auth.currentUser.uid : 'admin';
      announcements.unshift(createAnnouncementItem(text, uid));
      textInput.value = '';
      renderAnnouncementsList();
    });

    container.querySelector('#mc-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      showError('');
      const submitBtn = container.querySelector('#mc-submit');
      submitBtn.disabled = true;

      try {
        const uid = auth.currentUser ? auth.currentUser.uid : '';
        const formInput = {
          summary: container.querySelector('#mc-summary').value,
          tugas: container.querySelector('#mc-tugas').value.split('\n'),
          services: container.querySelector('#mc-services').value.split('\n'),
          announcements
        };
        const updatedUnits = await saveUnitContent(selectedUnitId, formInput, uid);
        ctx.setUnits(updatedUnits);
        showToast('Konten unit berhasil disimpan.');
      } catch (err) {
        showError(err && err.code ? mapFirestoreError(err) : (err.message || 'Gagal menyimpan konten unit.'));
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  renderShell();
}
