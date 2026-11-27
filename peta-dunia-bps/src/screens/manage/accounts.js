// Management Tab 4: Akun (super_admin only — allowlist + user profile updates)
import { AppState } from '../../state/index.js';
import { auth } from '../../firebase/client.js';
import { getRoleLabel, ROLE_LABELS } from '../../config.js';
import {
  fetchAccountsAndAllowlist,
  saveAccountEntry,
  toggleAccountActive,
  mapFirestoreError
} from '../../firebase/manage.js';
import { showToast } from '../../ui/hud.js';
import { escapeHtml } from '../../ui/escape.js';

const ASSIGNABLE_ROLES = ['employee', 'head_e2', 'head_e1', 'head_top', 'super_admin'];

export function renderAccountsTab(container, ctx) {
  let entries = [];
  let editingEmail = null;

  function renderShell() {
    const units = ctx.getUnits().filter((u) => u.archived !== true);
    const unitOptions = units.map((u) => (
      '<option value="' + escapeHtml(u.id) + '">' + escapeHtml(u.name) + '</option>'
    )).join('');

    const roleOptions = ASSIGNABLE_ROLES.map((r) => (
      '<option value="' + r + '">' + escapeHtml(ROLE_LABELS[r]) + '</option>'
    )).join('');

    container.innerHTML = '' +
      '<div class="manage-accounts-wrap">' +
        '<div class="manage-info-banner">Akun login dibuat pegawai sendiri lewat Buat Akun. Dari sini kamu mengatur izin, role, unit dan status aktif.</div>' +
        '<div id="ma-error" class="manage-alert-error" role="alert" style="display:none;"></div>' +
        '<div class="manage-split">' +
          '<section class="manage-form-panel" aria-label="Formulir Akun">' +
            '<h3 class="manage-section-title" id="ma-form-title">Tambah / Perbarui Allowlist</h3>' +
            '<form id="ma-form" class="manage-form" novalidate>' +
              '<div class="manage-field">' +
                '<label for="ma-email">Email BPS</label>' +
                '<input id="ma-email" class="manage-input" type="email" placeholder="pegawai@bps.go.id" required />' +
              '</div>' +
              '<div class="manage-field">' +
                '<label for="ma-name">Nama Lengkap (1–60 karakter)</label>' +
                '<input id="ma-name" class="manage-input" type="text" maxlength="60" required />' +
              '</div>' +
              '<div class="manage-field">' +
                '<label for="ma-unit">Unit Kerja</label>' +
                '<select id="ma-unit" class="manage-input">' + unitOptions + '</select>' +
              '</div>' +
              '<div class="manage-row-2">' +
                '<div class="manage-field">' +
                  '<label for="ma-role">Role</label>' +
                  '<select id="ma-role" class="manage-input">' + roleOptions + '</select>' +
                '</div>' +
                '<div class="manage-field">' +
                  '<label for="ma-jabatan">Jabatan (opsional)</label>' +
                  '<input id="ma-jabatan" class="manage-input" type="text" maxlength="80" />' +
                '</div>' +
              '</div>' +
              '<div class="manage-checkbox-row">' +
                '<input id="ma-active" type="checkbox" checked />' +
                '<label for="ma-active">Akun Aktif</label>' +
              '</div>' +
              '<small id="ma-self-note" class="manage-help" style="display:none;">Role dan status aktif akun Anda sendiri tidak dapat diubah.</small>' +
              '<div class="manage-form-actions">' +
                '<button type="submit" id="ma-submit" class="manage-btn manage-btn-primary">Simpan Akun</button>' +
                '<button type="button" id="ma-cancel" class="manage-btn manage-btn-secondary" style="display:none;">Batal Ubah</button>' +
              '</div>' +
            '</form>' +
          '</section>' +
          '<section class="manage-list-panel" aria-label="Daftar Akun">' +
            '<div class="manage-list-header">' +
              '<h3 class="manage-section-title">Daftar Allowlist &amp; Profil</h3>' +
              '<button type="button" id="ma-refresh" class="manage-btn manage-btn-secondary manage-btn-sm">Muat Ulang</button>' +
            '</div>' +
            '<div id="ma-list" class="manage-list-scroll">' +
              '<div class="manage-empty">Memuat daftar akun...</div>' +
            '</div>' +
          '</section>' +
        '</div>' +
      '</div>';

    bindEvents();
    loadAccounts();
  }

  function showError(msg) {
    const errEl = container.querySelector('#ma-error');
    if (errEl) {
      errEl.textContent = msg;
      errEl.style.display = msg ? 'block' : 'none';
    }
  }

  function isSelfEntry(entry) {
    const myEmail = String(AppState.player.email || '').toLowerCase();
    const myUid = auth.currentUser ? auth.currentUser.uid : null;
    if (myUid && entry.profile && entry.profile.uid === myUid) return true;
    return Boolean(myEmail && entry.email === myEmail);
  }

  function resetForm() {
    editingEmail = null;
    container.querySelector('#ma-form').reset();
    const emailEl = container.querySelector('#ma-email');
    emailEl.readOnly = false;
    const roleEl = container.querySelector('#ma-role');
    roleEl.disabled = false;
    const activeEl = container.querySelector('#ma-active');
    activeEl.disabled = false;
    activeEl.checked = true;
    container.querySelector('#ma-self-note').style.display = 'none';
    container.querySelector('#ma-form-title').textContent = 'Tambah / Perbarui Allowlist';
    container.querySelector('#ma-submit').textContent = 'Simpan Akun';
    container.querySelector('#ma-cancel').style.display = 'none';
    showError('');
  }

  function populateEdit(entry) {
    editingEmail = entry.email;
    const source = entry.profile || entry.allowlist;
    const emailEl = container.querySelector('#ma-email');
    emailEl.value = entry.email;
    emailEl.readOnly = true;
    container.querySelector('#ma-name').value = source.displayName || entry.allowlist.displayName || '';
    container.querySelector('#ma-unit').value = source.unit || entry.allowlist.unit || '';
    const roleVal = source.role === 'admin' ? 'super_admin' : (source.role || 'employee');
    container.querySelector('#ma-role').value = roleVal;
    container.querySelector('#ma-jabatan').value = source.jabatan || entry.allowlist.jabatan || '';
    const isActive = source.active !== false && entry.allowlist.active !== false;
    container.querySelector('#ma-active').checked = isActive;

    const self = isSelfEntry(entry);
    container.querySelector('#ma-role').disabled = self;
    container.querySelector('#ma-active').disabled = self;
    container.querySelector('#ma-self-note').style.display = self ? 'block' : 'none';

    container.querySelector('#ma-form-title').textContent = 'Ubah Akun';
    container.querySelector('#ma-submit').textContent = 'Perbarui Akun';
    container.querySelector('#ma-cancel').style.display = 'inline-flex';
    showError('');
  }

  function bindEvents() {
    container.querySelector('#ma-cancel').addEventListener('click', resetForm);
    container.querySelector('#ma-refresh').addEventListener('click', loadAccounts);

    container.querySelector('#ma-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      showError('');
      const submitBtn = container.querySelector('#ma-submit');
      submitBtn.disabled = true;

      try {
        const emailVal = container.querySelector('#ma-email').value.trim().toLowerCase();
        const existingEntry = entries.find((item) => item.email === emailVal) || null;
        const myUid = auth.currentUser ? auth.currentUser.uid : null;
        const self = existingEntry ? isSelfEntry(existingEntry) : (emailVal === String(AppState.player.email || '').toLowerCase());

        if (self && existingEntry) {
          const origRole = existingEntry.profile ? existingEntry.profile.role : existingEntry.allowlist.role;
          const reqRole = container.querySelector('#ma-role').value;
          const origActive = existingEntry.allowlist.active;
          const reqActive = container.querySelector('#ma-active').checked;
          if (reqRole !== (origRole === 'admin' ? 'super_admin' : origRole) || reqActive !== origActive) {
            throw new Error('Tidak dapat mengubah role atau status aktif akun sendiri.');
          }
        }

        const formInput = {
          email: emailVal,
          displayName: container.querySelector('#ma-name').value,
          unit: container.querySelector('#ma-unit').value,
          role: container.querySelector('#ma-role').value,
          jabatan: container.querySelector('#ma-jabatan').value,
          active: container.querySelector('#ma-active').checked
        };

        await saveAccountEntry({
          formInput,
          units: ctx.getUnits(),
          existingProfile: existingEntry ? existingEntry.profile : null,
          currentUid: myUid
        });
        showToast(editingEmail ? 'Data akun berhasil diperbarui.' : 'Akun ditambahkan ke allowlist.');
        resetForm();
        await loadAccounts();
      } catch (err) {
        showError(err && err.code ? mapFirestoreError(err) : (err.message || 'Gagal menyimpan akun.'));
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  async function loadAccounts() {
    const listEl = container.querySelector('#ma-list');
    if (!listEl) return;
    listEl.innerHTML = '<div class="manage-empty">Memuat daftar akun...</div>';
    try {
      entries = await fetchAccountsAndAllowlist();
      renderList();
    } catch (err) {
      listEl.innerHTML = '<div class="manage-alert-error" role="alert">' + escapeHtml(mapFirestoreError(err)) + '</div>';
    }
  }

  function renderList() {
    const listEl = container.querySelector('#ma-list');
    if (!listEl) return;
    if (entries.length === 0) {
      listEl.innerHTML = '<div class="manage-empty">Belum ada entri allowlist.</div>';
      return;
    }

    const unitMap = new Map(ctx.getUnits().map((u) => [u.id, u]));

    listEl.innerHTML = entries.map((entry) => {
      const merged = entry.profile || entry.allowlist;
      const unitObj = unitMap.get(merged.unit);
      const unitLabel = unitObj ? (unitObj.shortName || unitObj.name) : (merged.unit || '-');
      const isActive = entry.allowlist.active !== false && (!entry.profile || entry.profile.active !== false);
      const self = isSelfEntry(entry);

      return '' +
        '<div class="manage-item-card">' +
          '<div class="manage-item-info">' +
            '<div class="manage-item-title">' + escapeHtml(merged.displayName || entry.email) + '</div>' +
            '<div class="manage-item-sub">' + escapeHtml(entry.email) + ' · ' + escapeHtml(unitLabel) + '</div>' +
            '<div class="manage-item-meta">' +
              '<span class="manage-badge">' + escapeHtml(getRoleLabel(merged.role)) + '</span>' +
              (merged.jabatan ? '<span class="manage-badge">' + escapeHtml(merged.jabatan) + '</span>' : '') +
              '<span class="manage-badge ' + (isActive ? 'is-active' : 'is-inactive') + '">' + (isActive ? 'Aktif' : 'Nonaktif') + '</span>' +
              '<span class="manage-badge">' + (entry.profile ? 'Sudah login' : 'Belum login') + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="manage-item-actions">' +
            '<button type="button" class="manage-btn manage-btn-secondary manage-btn-xs ma-edit" data-email="' + escapeHtml(entry.email) + '">Ubah</button>' +
            (!self
              ? '<button type="button" class="manage-btn manage-btn-secondary manage-btn-xs ma-toggle" data-email="' + escapeHtml(entry.email) + '">' +
                  (isActive ? 'Nonaktifkan' : 'Aktifkan') +
                '</button>'
              : '') +
          '</div>' +
        '</div>';
    }).join('');

    listEl.querySelectorAll('.ma-edit').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const email = e.currentTarget.getAttribute('data-email');
        const entry = entries.find((item) => item.email === email);
        if (entry) populateEdit(entry);
      });
    });

    listEl.querySelectorAll('.ma-toggle').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const email = e.currentTarget.getAttribute('data-email');
        const entry = entries.find((item) => item.email === email);
        if (!entry) return;
        const currentlyActive = entry.allowlist.active !== false;
        if (currentlyActive) {
          const ok = await ctx.confirm(`Nonaktifkan akun "${entry.email}"? Pengguna tidak dapat masuk atau mengklaim quest.`, 'Nonaktifkan');
          if (!ok) return;
        }
        try {
          const myUid = auth.currentUser ? auth.currentUser.uid : null;
          const next = await toggleAccountActive({ entry, units: ctx.getUnits(), currentUid: myUid });
          showToast(next ? 'Akun diaktifkan kembali.' : 'Akun dinonaktifkan.');
          await loadAccounts();
        } catch (err) {
          showError(err && err.code ? mapFirestoreError(err) : (err.message || 'Gagal mengubah status akun.'));
        }
      });
    });
  }

  renderShell();
}
