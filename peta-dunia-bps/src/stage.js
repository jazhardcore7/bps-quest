// Stage scaler: fits the 960x560 design stage into #stage-viewport.
// On narrow screens it holds a minimum scale and lets the viewport pan natively.

// Below this viewport width the stage never shrinks under --stage-min-scale;
// if it then overflows, the viewport scrolls natively (touch drag-pan).
const NARROW_BREAKPOINT = 768;
const STAGE_W = 960;
const STAGE_H = 560;

function readMinScale() {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--stage-min-scale');
  const value = parseFloat(raw);
  return Number.isFinite(value) && value > 0 ? value : 0.7;
}

let stageSpacer = null;
let wasPannable = false;

export function updateStageScale() {
  const stage = document.getElementById('stage');
  const viewport = document.getElementById('stage-viewport');
  if (!stage || !viewport) return;
  // Measure without a previous spacer/scroll state influencing the size.
  const availWidth = viewport.clientWidth;
  const availHeight = viewport.clientHeight;
  if (availWidth === 0 || availHeight === 0) return;

  const fit = Math.min(availWidth / STAGE_W, availHeight / STAGE_H);
  const narrow = window.innerWidth < NARROW_BREAKPOINT;
  const scale = narrow ? Math.max(fit, readMinScale()) : fit;
  const scaledW = STAGE_W * scale;
  const scaledH = STAGE_H * scale;
  const pannable = scaledW > availWidth + 0.5 || scaledH > availHeight + 0.5;

  viewport.classList.toggle('is-pannable', pannable);

  if (pannable) {
    if (!stageSpacer) {
      stageSpacer = document.createElement('div');
      stageSpacer.id = 'stage-spacer';
      stageSpacer.setAttribute('aria-hidden', 'true');
      viewport.appendChild(stageSpacer);
    }
    const offsetX = Math.max(0, (availWidth - scaledW) / 2);
    const offsetY = Math.max(0, (availHeight - scaledH) / 2);
    stageSpacer.style.width = `${scaledW + offsetX}px`;
    stageSpacer.style.height = `${scaledH + offsetY}px`;
    stage.style.left = `${offsetX}px`;
    stage.style.top = `${offsetY}px`;
    stage.style.transformOrigin = '0 0';
    stage.style.transform = `scale(${scale})`;
    if (!wasPannable) {
      // Start centered on the scene.
      viewport.scrollLeft = Math.max(0, (scaledW - availWidth) / 2);
      viewport.scrollTop = Math.max(0, (scaledH - availHeight) / 2);
    }
  } else {
    if (stageSpacer) {
      stageSpacer.remove();
      stageSpacer = null;
    }
    stage.style.left = '';
    stage.style.top = '';
    stage.style.transformOrigin = '';
    stage.style.transform = `translate(-50%, -50%) scale(${scale})`;
  }
  wasPannable = pannable;
}

