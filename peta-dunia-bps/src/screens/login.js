// Login and Registration Screen (#/login)
import { loginWithEmail, registerWithEmail, loginWithGoogle, mapAuthError } from '../firebase/auth.js';
import { icon } from '../ui/icons.js';
import { renderWorldAmbient, renderIslandSVG } from '../ui/island-art.js';

const LOGIN_DOCK_BELOW = 768; // px viewport width; matches the stage min-scale breakpoint

// Decorative islands framing the title screen (seeded by unit id, like the world map).
const TITLE_ISLANDS = [
  { id: 'sosial', rect: [24, 330, 210, 130], locked: false },
  { id: 'produksi', rect: [736, 350, 200, 120], locked: false },
  { id: 'neraca', rect: [770, 120, 150, 90], locked: false }
];

export const LoginScreen = {
  container: null,
  isRegisterMode: false,

  mount(stage) {
    this.container = stage;
    this.isRegisterMode = false;
    this.handleResize = () => this.placeLayout();
    window.addEventListener('resize', this.handleResize);
    this.render();
  },

  unmount() {
    if (this.handleResize) {
      window.removeEventListener('resize', this.handleResize);
      this.handleResize = null;
    }
    // On narrow screens the screen is docked on <body>; remove it explicitly.
    if (this.wrapEl) {
      this.wrapEl.remove();
      this.wrapEl = null;
    }
    this.container = null;
  },

  // Root element for queries: the screen may live in the stage or be docked on <body>.
  root() {
    return this.wrapEl || this.container;
  },

  // Below 768px the stage is held at 0.7 scale, which makes a form too small to
  // use. The login screen is a form, so it docks to the viewport at real size.
  placeLayout() {
    const wrap = this.wrapEl;
    if (!wrap || !this.container) return;
    const dock = window.innerWidth < LOGIN_DOCK_BELOW;
    if (dock && !wrap.classList.contains('is-docked')) {
      wrap.classList.add('is-docked');
      document.body.appendChild(wrap);
    } else if (!dock && wrap.classList.contains('is-docked')) {
      wrap.classList.remove('is-docked');
      this.container.appendChild(wrap);
    }
  },

  render() {
    if (!this.container) return;

    const cardTitle = this.isRegisterMode ? 'Buat Akun Pegawai' : 'Masuk';
    const subtitle = this.isRegisterMode
      ? 'Khusus pegawai yang telah terdaftar pada allowlist'
      : 'Masuk untuk menjelajahi unit kerja BPS';
    const submitText = this.isRegisterMode ? 'Daftar' : 'Masuk';
    const togglePrompt = this.isRegisterMode
      ? 'Sudah memiliki akun? <button type="button" class="login-toggle-btn" id="login-toggle">Masuk di sini</button>'
      : 'Belum memiliki akun? <button type="button" class="login-toggle-btn" id="login-toggle">Buat akun</button>';

    const islands = TITLE_ISLANDS.map((isl) =>
      '<div class="title-island" style="left:' + isl.rect[0] + 'px; top:' + isl.rect[1] + 'px; width:' + isl.rect[2] + 'px; height:' + isl.rect[3] + 'px;">' +
        renderIslandSVG(isl) +
      '</div>'
    ).join('');

    if (this.wrapEl) {
      this.wrapEl.remove();
      this.wrapEl = null;
    }

    this.container.innerHTML = `
      <div class="login-screen-wrap">
        ${renderWorldAmbient([])}
        <div class="title-islands" aria-hidden="true">${islands}</div>

        <div class="login-wordmark">
          <span class="login-logo-badge" aria-hidden="true">${icon('map', { size: 'l' })}</span>
          <h1 class="login-wordmark-text">Peta Dunia BPS</h1>
        </div>

        <div class="login-card" role="region" aria-labelledby="login-card-title">
          <h2 class="ribbon login-title" id="login-card-title">${cardTitle}</h2>
          <p class="login-subtitle">${subtitle}</p>

          <div id="login-error" class="login-error-alert" role="alert" style="display: none;"></div>

          <form id="login-form" class="login-form" novalidate>
            <div class="login-field">
              <label for="login-email" class="login-label">Email BPS</label>
              <input
                type="email"
                id="login-email"
                class="login-input"
                placeholder="nama@bps.go.id"
                required
                autocomplete="email"
              />
            </div>

            <div class="login-field">
              <label for="login-password" class="login-label">Kata Sandi</label>
              <input
                type="password"
                id="login-password"
                class="login-input"
                placeholder="Minimal 6 karakter"
                required
                autocomplete="${this.isRegisterMode ? 'new-password' : 'current-password'}"
              />
            </div>

            <button type="submit" id="login-submit-btn" class="btn btn--primary btn--block login-submit-btn">
              ${submitText}
            </button>
          </form>

          ${!this.isRegisterMode ? `
            <div class="login-divider" aria-hidden="true">
              <span>atau</span>
            </div>

            <button type="button" id="login-google-btn" class="btn btn--secondary btn--block login-google-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" class="google-icon" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              Masuk dengan Google
            </button>
          ` : ''}

          <div class="login-footer">
            ${togglePrompt}
          </div>
        </div>
      </div>
    `;

    this.wrapEl = this.container.querySelector('.login-screen-wrap');
    this.bindEvents();
    this.placeLayout();
  },

  showError(message) {
    const errorEl = this.root() ? this.root().querySelector('#login-error') : null;
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = 'block';
    }
  },

  clearError() {
    const errorEl = this.root() ? this.root().querySelector('#login-error') : null;
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.style.display = 'none';
    }
  },

  setLoading(isLoading) {
    const root = this.root();
    if (!root) return;
    const submitBtn = root.querySelector('#login-submit-btn');
    const googleBtn = root.querySelector('#login-google-btn');
    const toggleBtn = root.querySelector('#login-toggle');

    if (submitBtn) {
      submitBtn.disabled = isLoading;
      submitBtn.textContent = isLoading ? 'Memproses...' : (this.isRegisterMode ? 'Daftar' : 'Masuk');
    }
    if (googleBtn) {
      googleBtn.disabled = isLoading;
    }
    if (toggleBtn) {
      toggleBtn.disabled = isLoading;
    }
  },

  bindEvents() {
    const root = this.root();
    if (!root) return;

    const form = root.querySelector('#login-form');
    const toggleBtn = root.querySelector('#login-toggle');
    const googleBtn = root.querySelector('#login-google-btn');

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        this.isRegisterMode = !this.isRegisterMode;
        this.render();
      });
    }

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        this.clearError();

        const email = form.querySelector('#login-email').value.trim();
        const password = form.querySelector('#login-password').value;

        if (!email || !password) {
          this.showError('Silakan isi email dan kata sandi.');
          return;
        }

        this.setLoading(true);
        try {
          if (this.isRegisterMode) {
            await registerWithEmail(email, password);
          } else {
            await loginWithEmail(email, password);
          }
          // After successful login/registration, route to #/world
          window.location.hash = '#/world';
        } catch (err) {
          console.warn('Login/Register error:', err);
          this.showError(mapAuthError(err));
          this.setLoading(false);
        }
      });
    }

    if (googleBtn) {
      googleBtn.addEventListener('click', async () => {
        this.clearError();
        this.setLoading(true);
        try {
          await loginWithGoogle();
          window.location.hash = '#/world';
        } catch (err) {
          console.warn('Google login error:', err);
          this.showError(mapAuthError(err));
          this.setLoading(false);
        }
      });
    }
  }
};

export default LoginScreen;

