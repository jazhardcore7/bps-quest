// DEV ONLY QA audit for the UI revamp. Run in the browser console on any screen:
//   const { audit } = await import('/dev/qa-audit.js'); await audit();
// Reports: sideways page scroll, on-screen size of visible controls (>= 44px),
// a visible focus indicator for each control, and text contrast (>= 4.5:1,
// >= 3:1 for large text) against the nearest opaque background color.
// Text over gradients/images is listed as "unchecked" rather than guessed.

const CONTROL_SEL = 'button, a[href], input, select, textarea, [role="tab"], label.quiz-option-item';

function parseColor(str) {
  const m = str && str.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
  return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
}

function lum({ r, g, b }) {
  const f = (v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function ratio(a, b) {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

function blend(top, bottom) {
  const a = top.a;
  return { r: top.r * a + bottom.r * (1 - a), g: top.g * a + bottom.g * (1 - a), b: top.b * a + bottom.b * (1 - a), a: 1 };
}

// Nearest background: walks up until an opaque background color is found.
// Returns null if a background-image (gradient) is met first.
function backgroundOf(el) {
  let layers = [];
  for (let node = el; node && node.nodeType === 1; node = node.parentElement) {
    const cs = getComputedStyle(node);
    if (cs.backgroundImage && cs.backgroundImage !== 'none' && !cs.backgroundImage.startsWith('url("data:image/svg')) {
      const c = parseColor(cs.backgroundColor);
      if (!c || c.a < 1) return null;
    }
    const c = parseColor(cs.backgroundColor);
    if (c && c.a > 0) {
      layers.push(c);
      if (c.a >= 1) break;
    }
  }
  if (!layers.length) return null;
  let out = layers.pop();
  while (layers.length) out = blend(layers.pop(), out);
  return out;
}

function isVisible(el) {
  const r = el.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) return false;
  const cs = getComputedStyle(el);
  return cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0;
}

function label(el) {
  const t = (el.getAttribute('aria-label') || el.textContent || el.id || el.className || el.tagName).trim().replace(/\s+/g, ' ');
  return el.tagName.toLowerCase() + ' "' + t.slice(0, 40) + '"';
}

export async function audit() {
  const report = {
    viewport: innerWidth + 'x' + innerHeight,
    sidewaysPageScroll: document.documentElement.scrollWidth > innerWidth,
    smallTargets: [],
    noFocusIndicator: [],
    lowContrast: [],
    contrastChecked: 0,
    contrastUnchecked: 0
  };

  const controls = [...document.querySelectorAll(CONTROL_SEL)].filter((el) => {
    if (el.closest('#dev-bar')) return false; // DEV-only tooling
    if (el.matches('input[type="radio"]')) return false; // its label is the target
    return isVisible(el);
  });

  const prev = document.activeElement;
  for (const el of controls) {
    const r = el.getBoundingClientRect();
    const isInlineLink = el.classList.contains('login-toggle-btn');
    const min = isInlineLink ? 24 : 44; // WCAG 2.5.8 inline-target exception for the text link
    if (Math.min(r.width, r.height) < min - 0.5) {
      report.smallTargets.push(label(el) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
    }
    const target = el.matches('label') ? el.querySelector('input') : el;
    if (target && !target.disabled) {
      const host = el.matches('label') ? el : target;
      const snap = () => {
        const cs = getComputedStyle(host);
        return cs.boxShadow + '|' + cs.outlineStyle + '|' + cs.outlineWidth + '|' + cs.outlineColor;
      };
      // Chrome only treats script focus as :focus-visible when the previously
      // focused element was focus-visible, so focus is chained (no blur). Press
      // Tab once before running the audit to enter keyboard modality.
      const before = snap();
      target.focus({ focusVisible: true });
      const matched = target.matches(':focus-visible');
      const after = snap();
      if (!matched) report.focusVisibleNotTriggered = (report.focusVisibleNotTriggered || 0) + 1;
      else if (before === after) report.noFocusIndicator.push(label(el));
    }
  }
  if (prev && prev.focus) prev.focus();

  // Text contrast: elements with their own direct text
  const textEls = [...document.querySelectorAll('body *')].filter((el) => {
    if (el.closest('#dev-bar, svg, script, style')) return false;
    if (!isVisible(el)) return false;
    return [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
  });
  for (const el of textEls) {
    const cs = getComputedStyle(el);
    const fg = parseColor(cs.color);
    const bg = backgroundOf(el);
    if (!fg || !bg) { report.contrastUnchecked++; continue; }
    const size = parseFloat(cs.fontSize);
    const bold = Number(cs.fontWeight) >= 700;
    const large = size >= 24 || (bold && size >= 18.66);
    const need = large ? 3 : 4.5;
    const cr = ratio(fg.a < 1 ? blend(fg, bg) : fg, bg);
    report.contrastChecked++;
    if (cr < need) report.lowContrast.push(label(el) + ' ' + cr.toFixed(2) + ':1 (need ' + need + ')');
  }
  return report;
}

export default audit;
