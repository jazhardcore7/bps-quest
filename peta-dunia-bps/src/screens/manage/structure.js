// Management Tab 5: Struktur (super_admin only — edit unit metadata, archive, create unit)
import { auth } from '../../firebase/client.js';
import { BpsData } from '../../data/index.js';
import {
  VALID_UNIT_TYPES,
  updateUnitStructure,
  createNewUnit,
  mapFirestoreError
} from '../../firebase/manage.js';
import { showToast } from '../../ui/hud.js';
import { escapeHtml } from '../../ui/escape.js';

export function renderStructureTab(container, ctx) {
  let mode = 'edit'; // 'edit' | 'create'
  let editingUnitId = ctx.getUnits()[0] ? ctx.getUnits()[0].id : '';

  function renderShell() {
    const units = ctx.getUnits();
    const islandOptions = BpsData.islands.map((isl) => (
      '<option value="' + escapeHtml(isl.id) + '">' + escapeHtml(isl.label) + '</option>'
    )).join('');

    const parentOptions = units.filter((u) => u.archived !== true).map((u) => (
      '<option value="' + escapeHtml(u.id) + '">' + escapeHtml(u.name) + '</option>'
    )).join('');

    const typeOptions = VALID_UNIT_TYPES.filter((t) => t !== 'root').map((t) => (
      '<option value="' + escapeHtml(t) + '">' + escapeHtml(t) + '</option>'
    )).join('');

    container.innerHTML = '' +
      '<div class="manage-structure-wrap">' +
        '<div id="ms-error" class="manage-alert-error" role="alert" style="display:none;"></div>' +
        '<div class="manage-split">' +
          '<section class="manage-form-panel" aria-label="Formulir Struktur Unit">' +
            '<div class="manage-list-header">' +
              '<h3 class="manage-section-title" id="ms-form-title">' + (mode === 'create' ? 'Buat Unit Baru' : 'Ubah Struktur Unit') + '</h3>' +
              '<button type="button" id="ms-new-mode" class="manage-btn manage-btn-secondary manage-btn-sm">' +
                (mode === 'create' ? 'Kembali ke Ubah' : '+ Unit Baru') +
              '</button>' +
            '</div>' +
            '<form id="ms-form" class="manage-form" novalidate>' +
              '<div class="manage-field" id="ms-id-wrap" style="' + (mode === 'create' ? '' : 'display:none;') + '">' +
                '<label for="ms-id">ID Unit Baru (slug huruf kecil)</label>' +
                '<input id="ms-id" class="manage-input" type="text" placeholder="misal: dir-statistik-baru" />' +
              '</div>' +
              '<div class="manage-field" id="ms-parent-wrap" style="' + (mode === 'create' ? '' : 'display:none;') + '">' +
                '<label for="ms-parent">Unit Induk</label>' +
                '<select id="ms-parent" class="manage-input">' + parentOptions + '</select>' +
              '</div>' +
              '<div class="manage-field" id="ms-type-wrap" style="' + (mode === 'create' ? '' : 'display:none;') + '">' +
                '<label for="ms-type">Tipe Unit</label>' +
                '<select id="ms-type" class="manage-input">' + typeOptions + '</select>' +
              '</div>' +
              '<div class="manage-field">' +
                '<label for="ms-name">Nama Lengkap Unit</label>' +
                '<input id="ms-name" class="manage-input" type="text" required />' +
              '</div>' +
              '<div class="manage-row-2">' +
                '<div class="manage-field">' +
                  '<label for="ms-short">Nama Singkat (shortName)</label>' +
                  '<input id="ms-short" class="manage-input" type="text" required />' +
                '</div>' +
                '<div class="manage-field">' +
                  '<label for="ms-head">Sebutan Pimpinan (headTitle)</label>' +
                  '<input id="ms-head" class="manage-input" type="text" required />' +
                '</div>' +
              '</div>' +
              '<div class="manage-field">' +
                '<label for="ms-island">Pulau (Island)</label>' +
                '<select id="ms-island" class="manage-input">' + islandOptions + '</select>' +
              '</div>' +
              '<div class="manage-checkbox-row" id="ms-archived-wrap" style="' + (mode === 'create' ? 'display:none;' : '') + '">' +
                '<input id="ms-archived" type="checkbox" />' +
                '<label for="ms-archived">Arsipkan Unit (disembunyikan dari peta pulau, tidak dihapus permanen)</label>' +
              '</div>' +
              '<div class="manage-form-actions">' +
                '<button type="submit" id="ms-submit" class="manage-btn manage-btn-primary">' +
                  (mode === 'create' ? 'Buat Unit Baru' : 'Simpan Perubahan Unit') +
                '</button>' +
              '</div>' +
            '</form>' +
          '</section>' +
          '<section class="manage-list-panel" aria-label="Daftar Unit Organisasi">' +
            '<div class="manage-list-header">' +
              '<h3 class="manage-section-title">Semua Unit (' + units.length + ')</h3>' +
            '</div>' +
            '<div id="ms-list" class="manage-list-scroll"></div>' +
          '</section>' +
        '</div>' +
      '</div>';

    bindEvents();
    if (mode === 'edit') populateEditForm();
    renderUnitsList();
  }

  function showError(msg) {
    const errEl = container.querySelector('#ms-error');
    if (errEl) {
      errEl.textContent = msg;
      errEl.style.display = msg ? 'block' : 'none';
    }
  }

  function populateEditForm() {
    const unit = ctx.getUnits().find((u) => u.id === editingUnitId);
    if (!unit) return;
    container.querySelector('#ms-name').value = unit.name || '';
    container.querySelector('#ms-short').value = unit.shortName || '';
    container.querySelector('#ms-head').value = unit.headTitle || '';
    container.querySelector('#ms-island').value = unit.island || 'sestama';
    container.querySelector('#ms-archived').checked = unit.archived === true;
    showError('');
  }

  function renderUnitsList() {
    const listEl = container.querySelector('#ms-list');
    if (!listEl) return;
    const units = ctx.getUnits();

    listEl.innerHTML = units.map((u) => (
      '<div class="manage-item-card">' +
        '<div class="manage-item-info">' +
          '<div class="manage-item-title">' + escapeHtml(u.name) + '</div>' +
          '<div class="manage-item-meta">' +
            '<span class="manage-badge">' + escapeHtml(u.id) + '</span>' +
            '<span class="manage-badge">' + escapeHtml(u.island) + '</span>' +
            '<span class="manage-badge ' + (u.archived ? 'is-inactive' : 'is-active') + '">' +
              (u.archived ? 'Diarsipkan' : 'Aktif') +
            '</span>' +
          '</div>' +
        '</div>' +
        '<div class="manage-item-actions">' +
          '<button type="button" class="manage-btn manage-btn-secondary manage-btn-xs ms-edit" data-id="' + escapeHtml(u.id) + '">Ubah</button>' +
          (u.id !== 'bps-pusat'
            ? '<button type="button" class="manage-btn manage-btn-secondary manage-btn-xs ms-archive" data-id="' + escapeHtml(u.id) + '">' +
                (u.archived ? 'Pulihkan' : 'Arsipkan') +
              '</button>'
            : '') +
        '</div>' +
      '</div>'
    )).join('');

    listEl.querySelectorAll('.ms-edit').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        editingUnitId = e.currentTarget.getAttribute('data-id');
        mode = 'edit';
        renderShell();
      });
    });

    listEl.querySelectorAll('.ms-archive').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const unit = ctx.getUnits().find((u) => u.id === id);
        if (!unit) return;
        const nextArchived = !unit.archived;
        if (nextArchived) {
          const ok = await ctx.confirm(`Arsipkan unit "${unit.name}"? Unit akan disembunyikan dari peta pulau tanpa menghapus data historis.`, 'Arsipkan');
          if (!ok) return;
        }
        try {
          const uid = auth.currentUser ? auth.currentUser.uid : '';
          const updated = await updateUnitStructure(unit.id, {
            name: unit.name,
            shortName: unit.shortName,
            headTitle: unit.headTitle,
            island: unit.island,
            archived: nextArchived
          }, uid);
          ctx.setUnits(updated);
          showToast(nextArchived ? 'Unit diarsipkan.' : 'Unit dipulihkan.');
          renderShell();
        } catch (err) {
          showError(err && err.code ? mapFirestoreError(err) : (err.message || 'Gagal memperbarui status arsip unit.'));
        }
      });
    });
  }

  function bindEvents() {
    container.querySelector('#ms-new-mode').addEventListener('click', () => {
      mode = mode === 'create' ? 'edit' : 'create';
      renderShell();
    });

    container.querySelector('#ms-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      showError('');
      const submitBtn = container.querySelector('#ms-submit');
      submitBtn.disabled = true;

      try {
        const uid = auth.currentUser ? auth.currentUser.uid : '';
        if (mode === 'create') {
          const formInput = {
            id: container.querySelector('#ms-id').value,
            parentId: container.querySelector('#ms-parent').value,
            type: container.querySelector('#ms-type').value,
            name: container.querySelector('#ms-name').value,
            shortName: container.querySelector('#ms-short').value,
            headTitle: container.querySelector('#ms-head').value,
            island: container.querySelector('#ms-island').value,
            archived: false
          };
          const updated = await createNewUnit(formInput, ctx.getUnits(), uid);
          ctx.setUnits(updated);
          editingUnitId = formInput.id.trim().toLowerCase();
          mode = 'edit';
          showToast('Unit baru berhasil dibuat.');
          renderShell();
        } else {
          const formInput = {
            name: container.querySelector('#ms-name').value,
            shortName: container.querySelector('#ms-short').value,
            headTitle: container.querySelector('#ms-head').value,
            island: container.querySelector('#ms-island').value,
            archived: container.querySelector('#ms-archived').checked
          };
          const updated = await updateUnitStructure(editingUnitId, formInput, uid);
          ctx.setUnits(updated);
          showToast('Struktur unit berhasil diperbarui.');
          renderShell();
        }
      } catch (err) {
        showError(err && err.code ? mapFirestoreError(err) : (err.message || 'Gagal menyimpan struktur unit.'));
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  renderShell();
}
