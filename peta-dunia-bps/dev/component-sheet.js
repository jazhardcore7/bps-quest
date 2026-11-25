// DEV ONLY component sheet. Renders base components from the real styles and helpers.
import '../src/styles/tokens.css';
import '../src/styles/fonts.css';
import '../src/styles/components.css';
import { icon, ICON_NAMES } from '../src/ui/icons.js';
import { buildToastEl } from '../src/ui/toast.js';

const $ = (id) => document.getElementById(id);

// Palette swatches, values read from tokens (same path Canvas will use).
const css = getComputedStyle(document.documentElement);
const swatchTokens = [
  'ink', 'ink-soft', 'paper', 'sand', 'ocean-1', 'ocean-2', 'ocean-3', 'grass', 'grass-shade',
  'gold', 'gold-deep', 'success', 'danger', 'danger-strong', 'locked',
  'medal-silver', 'medal-bronze',
  'unit-kepala', 'unit-sestama', 'unit-metodologi', 'unit-sosial', 'unit-produksi',
  'unit-distribusi', 'unit-neraca', 'unit-itama'
];
$('swatches').innerHTML = swatchTokens.map((t) =>
  '<div class="swatch"><div class="swatch__chip" style="background: var(--' + t + ')"></div>' +
  '<div class="swatch__meta"><b>--' + t + '</b>' + css.getPropertyValue('--' + t).trim() + '</div></div>'
).join('');

// Buttons
$('buttons').innerHTML = [
  '<button type="button" class="btn btn--primary btn--lg">' + icon('flag') + 'Mulai Quest</button>',
  '<button type="button" class="btn btn--primary">Klaim XP</button>',
  '<button type="button" class="btn btn--navy">Masuk</button>',
  '<button type="button" class="btn btn--secondary">Kembali</button>',
  '<button type="button" class="btn btn--ghost">Lewati</button>'
].join('');
$('buttons-2').innerHTML = [
  '<button type="button" class="btn btn--danger">' + icon('logout') + 'Keluar</button>',
  '<button type="button" class="btn" disabled>Memproses…</button>',
  '<button type="button" class="btn btn--locked">' + icon('lock') + 'Terkunci</button>',
  '<button type="button" class="btn btn--secondary" aria-busy="true">' + icon('spinner') + 'Memuat</button>',
  '<button type="button" class="btn btn--secondary btn--icon" aria-label="Papan Peringkat">' + icon('trophy') + '</button>',
  '<button type="button" class="btn btn--secondary btn--icon" aria-label="Keluar dari akun">' + icon('logout') + '</button>',
  '<button type="button" class="btn btn--secondary btn--icon" aria-label="Tutup">' + icon('close') + '</button>'
].join('');

// Pills
const units = ['kepala', 'sestama', 'metodologi', 'sosial', 'produksi', 'distribusi', 'neraca', 'itama'];
const names = { kepala: 'Kepala BPS', sestama: 'Sestama', metodologi: 'Metodologi', sosial: 'Statistik Sosial',
  produksi: 'Produksi', distribusi: 'Distribusi', neraca: 'Neraca', itama: 'Itama' };
$('pills').innerHTML = units.map((u) => '<span class="pill" data-unit="' + u + '">' + names[u] + '</span>').join('') +
  '<span class="pill pill--locked">' + icon('lock', { size: 's' }) + 'Terkunci</span>' +
  '<span class="pill pill--gold">' + icon('starFilled', { size: 's' }) + 'Biro Anda</span>';

$('tags').innerHTML =
  '<span class="tag">Sestama</span>' +
  '<span class="tag">Level 2</span>' +
  '<span class="xp-badge">' + icon('coin') + '+50 XP</span>' +
  '<span class="tag" style="color: var(--success)">' + icon('checkCircle', { size: 's' }) + 'Selesai</span>' +
  '<span class="tag" style="color: var(--danger-strong)">' + icon('xCircle', { size: 's' }) + 'Jawaban salah</span>';

$('segmented').innerHTML =
  '<div class="segmented" role="tablist" aria-label="Periode">' +
  ['Sepanjang Waktu', 'Mingguan', 'Bulanan'].map((t, i) =>
    '<button type="button" role="tab" class="segmented__btn" aria-selected="' + (i === 0) + '">' + t + '</button>'
  ).join('') + '</div>';

$('chips').innerHTML = ['Semua', 'Sestama', 'Produksi', 'Distribusi'].map((t, i) =>
  '<button type="button" class="chip" aria-pressed="' + (i === 0) + '">' + icon('check', { size: 's' }) + t + '</button>'
).join('');

// Interactivity for the demo controls only
document.querySelector('.segmented').addEventListener('click', (e) => {
  const btn = e.target.closest('.segmented__btn');
  if (!btn) return;
  btn.parentElement.querySelectorAll('.segmented__btn').forEach((b) => b.setAttribute('aria-selected', String(b === btn)));
});
$('chips').addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (chip) chip.setAttribute('aria-pressed', String(chip.getAttribute('aria-pressed') !== 'true'));
});

// Toasts (static, visible)
[['toast-a', 'Pulau ini segera hadir'], ['toast-b', '+50 XP']].forEach(([id, msg]) => {
  const t = buildToastEl(msg);
  t.classList.add('visible');
  $(id).appendChild(t);
});

// Icons
$('icons').innerHTML = ICON_NAMES.map((n) =>
  '<figure>' + icon(n, { size: 'l' }) + '<figcaption>' + n + '</figcaption></figure>'
).join('');

// Font status (until woff2 files are supplied, fallbacks render)
document.fonts.ready.then(() => {
  const px = document.fonts.check('600 16px "Pixelify Sans"');
  const nu = document.fonts.check('400 16px "Nunito"');
  const loaded = [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family + ' ' + f.weight);
  $('font-status').textContent = 'Loaded font faces: ' + (loaded.length ? loaded.join(', ') : 'none (fallback stacks in use)') +
    '. Pixelify Sans: ' + (px ? 'ok' : 'fallback') + ', Nunito: ' + (nu ? 'ok' : 'fallback') + '.';
});
