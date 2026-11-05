import { clearSkirmishSave } from './SaveGame';
import { clearReplay, loadReplay } from './replay';

/**
 * Campaign-only builds remove legacy skirmish saves/replays. Campaign saves and
 * any campaign replay are kept; skirmish data has no mission id.
 */
export function purgeSkirmishData(): void {
  clearSkirmishSave();
  const replay = loadReplay();
  if (!replay?.settings.missionId) clearReplay();
}
