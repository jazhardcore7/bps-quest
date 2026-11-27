// Quick emulator-only demo account switcher (never included in production build)
import { loginWithEmail, logout } from '../firebase/auth.js';
import { showToast } from './hud.js';

const DEMO_PASSWORD = 'DemoPassword123!';

const DEMO_ACCOUNTS = [
  { label: 'Pegawai SDM 1', email: 'pegawai.sdm1@demo.bps.local' },
  { label: 'Pegawai SDM 2', email: 'pegawai.sdm2@demo.bps.local' },
  { label: 'Pegawai SDM 3', email: 'pegawai.sdm3@demo.bps.local' },
  { label: 'Pegawai Umum', email: 'pegawai.umum@demo.bps.local' },
  { label: 'Pegawai Harga', email: 'pegawai.harga@demo.bps.local' },
  { label: 'Kabiro SDM (E2)', email: 'kabiro.sdm@demo.bps.local' },
  { label: 'Dir. Harga (E2)', email: 'direktur.harga@demo.bps.local' },
  { label: 'Sestama (E1)', email: 'sestama@demo.bps.local' },
  { label: 'Deputi Sosial (E1)', email: 'deputi.sosial@demo.bps.local' },
  { label: 'Kepala BPS (Top)', email: 'kepala@demo.bps.local' },
  { label: 'Super Admin', email: 'superadmin@demo.bps.local' }
];

export function mountDemoLogin() {
  if (!(import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true')) {
    return;
  }
  if (document.getElementById('emu-switcher-panel')) return;

  const panel = document.createElement('aside');
  panel.id = 'emu-switcher-panel';
  panel.className = 'emu-switcher-panel';
  panel.setAttribute('aria-label', 'Pengalih Akun Demo Emulator');

  const buttonsHtml = DEMO_ACCOUNTS.map((acc) => (
    `<button type="button" class="emu-switcher-btn" data-email="${acc.email}">${acc.label}</button>`
  )).join('');

  panel.innerHTML = `
    <div class="emu-switcher-header">
      <span class="emu-switcher-title">Akun Demo (Emulator)</span>
      <button type="button" id="emu-switcher-toggle" class="emu-switcher-toggle" aria-expanded="true">Tutup</button>
    </div>
    <div class="emu-switcher-list" id="emu-switcher-list">${buttonsHtml}</div>
  `;

  document.body.appendChild(panel);

  const toggleBtn = panel.querySelector('#emu-switcher-toggle');
  const listEl = panel.querySelector('#emu-switcher-list');
  if (toggleBtn && listEl) {
    toggleBtn.addEventListener('click', () => {
      const isOpen = listEl.style.display !== 'none';
      listEl.style.display = isOpen ? 'none' : 'flex';
      toggleBtn.textContent = isOpen ? 'Buka' : 'Tutup';
      toggleBtn.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
    });
  }

  panel.querySelectorAll('.emu-switcher-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const email = btn.getAttribute('data-email');
      if (!email) return;
      btn.disabled = true;
      try {
        await logout().catch(() => {});
        await loginWithEmail(email, DEMO_PASSWORD);
        window.location.hash = '#/world';
        showToast(`Masuk sebagai ${btn.textContent}`, 2000);
      } catch (err) {
        console.error('Demo login switch failed:', err);
        showToast('Gagal masuk akun demo. Pastikan emulator & demo:reset berjalan.', 3000);
      } finally {
        btn.disabled = false;
      }
    });
  });
}
