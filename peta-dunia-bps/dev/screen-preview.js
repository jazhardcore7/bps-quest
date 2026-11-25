// DEV ONLY screen preview: same styles, dev bar and stage scaler as the app,
// but mounts one screen directly (no router, no sign-in). Presentation review only.
import '../src/styles/tokens.css';
import '../src/styles/fonts.css';
import '../src/styles/style.css';
import '../src/styles/components.css';
import '../src/styles/world.css';
import '../src/styles/office.css';
import '../src/styles/hud.css';
import '../src/styles/panel.css';
import '../src/styles/levelup.css';
import { updateStageScale } from '../src/stage.js';
import { mountDevBar } from '../src/ui/devbar.js';
import { AppState } from '../src/state/index.js';
import WorldScreen from '../src/screens/world.js';
import IslandScreen from '../src/screens/island.js';
import OfficeScreen from '../src/screens/office.js';
import { showLevelUp, initLevelUp } from '../src/ui/levelup.js';
import { openInfoPanel, closeInfoPanel, renderQuestsList } from '../src/ui/panel.js';

const SCREENS = { world: WorldScreen, island: IslandScreen, office: OfficeScreen };
window.__screens = SCREENS; // lets the loop-cleanup check remount screens
const params = new URLSearchParams(location.search);
const name = params.get('screen') in SCREENS ? params.get('screen') : 'world';

AppState.currentUnit = params.get('unit') || 'Biro SDM';
window.AppState = AppState;
window.__preview = { showLevelUp, openInfoPanel, closeInfoPanel, renderQuestsList };

mountDevBar();
initLevelUp();
window.addEventListener('resize', updateStageScale);
updateStageScale();

SCREENS[name].mount(document.getElementById('stage'));
