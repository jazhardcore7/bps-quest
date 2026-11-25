// Main entrypoint for Vite application
import './styles/tokens.css';
import './styles/fonts.css';
import './styles/style.css';
import './styles/components.css';
import './styles/world.css';
import './styles/office.css';
import './styles/hud.css';
import './styles/panel.css';
import './styles/levelup.css';
import './firebase/client.js';
import { Router } from './router.js';
import { mountDevBar } from './ui/devbar.js';
import { updateStageScale } from './stage.js';
import { initLevelUp } from './ui/levelup.js';

// 1. Mount Dev Bar conditionally only in DEV mode
if (import.meta.env.DEV) {
  mountDevBar();
  import('./state/index.js').then(({ AppState }) => {
    window.AppState = AppState;
  });
}

// 2. Stage Scaler: fit the 960x560 stage (min scale + pan on narrow screens)
export { updateStageScale };

window.addEventListener('resize', updateStageScale);
updateStageScale();

// 3. Level-up moment (watches the level in AppState)
initLevelUp();

// 4. Initialize Router (boots default route #/world)
Router.init();

