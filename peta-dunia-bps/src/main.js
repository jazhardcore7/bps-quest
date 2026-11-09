// Main entrypoint for Vite application
import './styles/style.css';
import './firebase/client.js';
import { Router } from './router.js';
import { mountDevBar } from './ui/devbar.js';

// 1. Mount Dev Bar conditionally only in DEV mode
if (import.meta.env.DEV) {
  mountDevBar();
  import('./state/index.js').then(({ AppState }) => {
    window.AppState = AppState;
  });
}

// 2. Stage Scaler: Fit 960x560 canvas inside available area while preserving aspect ratio
const stage = document.getElementById('stage');
const viewport = document.getElementById('stage-viewport');

export function updateStageScale() {
  if (!stage || !viewport) return;
  const availWidth = viewport.clientWidth;
  const availHeight = viewport.clientHeight;
  if (availWidth === 0 || availHeight === 0) return;

  const scale = Math.min(availWidth / 960, availHeight / 560);
  stage.style.transform = `translate(-50%, -50%) scale(${scale})`;
}

window.addEventListener('resize', updateStageScale);
updateStageScale();

// 3. Initialize Router (boots default route #/world)
Router.init();

