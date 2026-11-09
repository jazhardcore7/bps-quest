// DEV-only unit selector bar
import { AppState } from '../state/index.js';

export function mountDevBar() {
  if (document.getElementById('dev-bar')) return;

  const header = document.createElement('header');
  header.id = 'dev-bar';
  header.setAttribute('role', 'toolbar');
  header.setAttribute('aria-label', 'Bilah Simulasi Dev');

  header.innerHTML = `
    <span class="devbar-label">Simulasi pegawai dari:</span>
    <select id="dev-unit-select" class="devbar-select" aria-label="Pilih unit kerja simulasi">
      <option value="Biro SDM">Biro SDM</option>
      <option value="Biro Umum">Biro Umum</option>
    </select>
  `;

  document.body.classList.add('has-devbar');
  document.body.insertBefore(header, document.body.firstChild);

  const select = header.querySelector('#dev-unit-select');
  if (select) {
    select.value = AppState.currentUnit;

    select.addEventListener('change', () => {
      AppState.setCurrentUnit(select.value);
    });

    AppState.subscribe((state) => {
      if (select.value !== state.currentUnit) {
        select.value = state.currentUnit;
      }
    });
  }
}
