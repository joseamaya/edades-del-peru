import { loadFromStorage } from './SaveGame';

const SAVE_KEY = 'peru-save';
const REPLAY_KEY = 'peru-replay';

/**
 * Campaign-only builds remove legacy skirmish saves/replays. Campaign saves are
 * kept: they carry a mission id, while skirmish saves leave it undefined.
 */
export function purgeSkirmishData(): void {
  try {
    const save = loadFromStorage();
    if (save && !save.settings.missionId) localStorage.removeItem(SAVE_KEY);
  } catch {
    /* storage unavailable */
  }
  try {
    // Replays are recorded for skirmish only; campaign-only builds drop any legacy one.
    localStorage.removeItem(REPLAY_KEY);
  } catch {
    /* storage unavailable */
  }
}
