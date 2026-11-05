import { clearSkirmishSave } from './SaveGame';
import { clearSkirmishReplay } from './replay';

/** Campaign-only builds remove legacy skirmish saves/replays, keeping campaign data. */
export function purgeSkirmishData(): void {
  clearSkirmishSave();
  clearSkirmishReplay();
}
