// DEV ONLY: puts the screen preview into extra states for QA (sample data, open
// panel, quest sheet), then runs the audit. Usage in the preview page console:
//   const { runState } = await import('/dev/qa-states.js'); await runState('panel');
import { audit } from './qa-audit.js';

const SAMPLE_USERS = [
  { uid: 'a', displayName: 'Rina Kartika Sari', unit: 'biro-sdm', level: 6, xp: 2950 },
  { uid: 'b', displayName: 'Ahmad Fauzi', unit: 'biro-sdm', level: 5, xp: 2400 },
  { uid: 'c', displayName: 'Dewi Lestari', unit: 'biro-umum', level: 4, xp: 1810 },
  { uid: 'd', displayName: 'Budi Santoso Wijayakusuma', unit: 'biro-sdm', level: 3, xp: 1200 },
  { uid: 'e', displayName: 'Siti Nurhaliza', unit: 'biro-umum', level: 3, xp: 980 }
];

const SAMPLE_QUESTS = [
  { id: 'q1', type: 'daily', title: 'Baca pengumuman hari ini', description: 'Buka Papan Informasi Terkini.', xp: 20 },
  { id: 'q2', type: 'checkpoint', title: 'Kuis Struktur Organisasi', description: 'Jawab satu pertanyaan.', xp: 50,
    quiz: { question: 'Siapa yang memimpin Biro SDM?', options: ['Kepala Biro SDM', 'Sekretaris Utama', 'Kepala BPS'], correctIndex: 0 } },
  { id: 'q3', type: 'checkpoint', title: 'Kunjungi Ruang Kolaborasi', description: 'Temukan ruangnya.', xp: 30 }
];

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export async function runState(state) {
  const p = window.__preview;
  if (state === 'leaderboard') {
    const L = window.__screens.leaderboard;
    L.error = null;
    L.isLoading = false;
    L.users = SAMPLE_USERS;
    L.renderList();
  } else if (state === 'panel' || state === 'quests') {
    p.openInfoPanel('Biro SDM');
    await wait(350);
    if (state === 'quests') {
      document.getElementById('btn-open-quests').click();
      await wait(2500); // let the real (unauthenticated) fetch settle first
      p.renderQuestsList(document.getElementById('quest-sheet-list'), SAMPLE_QUESTS, [{ questId: 'q3', periodKey: 'once' }], 'Biro SDM');
    }
  }
  await wait(100);
  return { state, ...(await audit()) };
}

export default runState;
