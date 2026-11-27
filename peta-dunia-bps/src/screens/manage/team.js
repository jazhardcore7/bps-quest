// Management Tab 2: Tim Saya (scoped employee directory & XP summary)
import { AppState } from '../../state/index.js';
import { getRoleLabel, isSuperAdminRole } from '../../config.js';
import { fetchTeamMembers, mapFirestoreError } from '../../firebase/manage.js';
import { escapeHtml } from '../../ui/escape.js';

export function renderTeamTab(container, ctx) {
  const isSuper = isSuperAdminRole(AppState.player.role);
  let members = [];
  let searchText = '';
  let filterUnitId = '';

  function getScopedUnits() {
    return ctx.getUnits().filter((u) => u.archived !== true && AppState.canManageUnit(u.id, ctx.getUnits()));
  }

  function renderShell() {
    const unitOptions = getScopedUnits().map((u) => (
      '<option value="' + escapeHtml(u.id) + '">' + escapeHtml(u.name) + '</option>'
    )).join('');

    container.innerHTML = '' +
      '<div class="manage-team-wrap">' +
        '<div id="mt-error" class="manage-alert-error" role="alert" style="display:none;"></div>' +
        '<div class="manage-team-controls">' +
          '<div class="manage-summary-cards">' +
            '<div class="manage-stat-card">' +
              '<span class="manage-stat-label">Jumlah Pegawai</span>' +
              '<strong class="manage-stat-value" id="mt-count">0</strong>' +
            '</div>' +
            '<div class="manage-stat-card">' +
              '<span class="manage-stat-label">Total XP Minggu Ini</span>' +
              '<strong class="manage-stat-value" id="mt-week-xp">0</strong>' +
            '</div>' +
          '</div>' +
          '<div class="manage-filter-pair">' +
            '<div class="manage-field">' +
              '<label for="mt-search">Cari Nama Pegawai</label>' +
              '<input id="mt-search" class="manage-input" type="search" placeholder="Ketik nama..." />' +
            '</div>' +
            '<div class="manage-field">' +
              '<label for="mt-unit">Filter Unit</label>' +
              '<select id="mt-unit" class="manage-input">' +
                '<option value="">Semua Unit dalam Cakupan</option>' +
                unitOptions +
              '</select>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div id="mt-table-wrap" class="manage-table-scroll">' +
          '<div class="manage-empty">Memuat daftar pegawai...</div>' +
        '</div>' +
      '</div>';

    container.querySelector('#mt-search').addEventListener('input', (e) => {
      searchText = e.target.value.trim().toLowerCase();
      renderTable();
    });
    container.querySelector('#mt-unit').addEventListener('change', (e) => {
      filterUnitId = e.target.value;
      renderTable();
    });

    loadTeam();
  }

  async function loadTeam() {
    const errEl = container.querySelector('#mt-error');
    const wrap = container.querySelector('#mt-table-wrap');
    try {
      members = await fetchTeamMembers({
        role: AppState.player.role,
        unitId: AppState.player.unit
      });
      renderTable();
    } catch (err) {
      if (errEl) {
        errEl.textContent = mapFirestoreError(err);
        errEl.style.display = 'block';
      }
      if (wrap) wrap.innerHTML = '';
    }
  }

  function renderTable() {
    const wrap = container.querySelector('#mt-table-wrap');
    const countEl = container.querySelector('#mt-count');
    const weekXpEl = container.querySelector('#mt-week-xp');
    if (!wrap) return;

    const unitMap = new Map(ctx.getUnits().map((u) => [u.id, u]));

    const filtered = members.filter((m) => {
      if (filterUnitId && m.unit !== filterUnitId) return false;
      if (searchText && !String(m.displayName || '').toLowerCase().includes(searchText)) return false;
      return true;
    });

    const totalWeekXp = filtered.reduce((acc, m) => acc + (typeof m.xpWeek === 'number' ? m.xpWeek : 0), 0);
    if (countEl) countEl.textContent = String(filtered.length);
    if (weekXpEl) weekXpEl.textContent = String(totalWeekXp);

    if (filtered.length === 0) {
      wrap.innerHTML = '<div class="manage-empty">Tidak ada pegawai yang sesuai filter.</div>';
      return;
    }

    const emailHeader = isSuper ? '<th>Email</th>' : '';
    const rowsHtml = filtered.map((m) => {
      const unitObj = unitMap.get(m.unit);
      const unitLabel = unitObj ? (unitObj.shortName || unitObj.name) : (m.unit || '-');
      const emailCell = isSuper ? '<td>' + escapeHtml(m.email || '-') + '</td>' : '';
      return '' +
        '<tr>' +
          '<td>' + escapeHtml(m.displayName || '-') + (m.active === false ? ' <span class="manage-badge is-inactive">Nonaktif</span>' : '') + '</td>' +
          emailCell +
          '<td>' + escapeHtml(m.jabatan || '-') + '</td>' +
          '<td>' + escapeHtml(unitLabel) + '</td>' +
          '<td>' + escapeHtml(getRoleLabel(m.role)) + '</td>' +
          '<td>' + Number(m.level || 1) + '</td>' +
          '<td>' + Number(m.xp || 0) + '</td>' +
          '<td>' + Number(m.xpWeek || 0) + '</td>' +
          '<td>' + Number(m.xpMonth || 0) + '</td>' +
        '</tr>';
    }).join('');

    wrap.innerHTML = '' +
      '<table class="manage-table">' +
        '<thead>' +
          '<tr>' +
            '<th>Nama</th>' +
            emailHeader +
            '<th>Jabatan</th>' +
            '<th>Unit</th>' +
            '<th>Role</th>' +
            '<th>Level</th>' +
            '<th>Total XP</th>' +
            '<th>XP Minggu</th>' +
            '<th>XP Bulan</th>' +
          '</tr>' +
        '</thead>' +
        '<tbody>' + rowsHtml + '</tbody>' +
      '</table>';
  }

  renderShell();
}
