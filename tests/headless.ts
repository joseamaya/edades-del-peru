import { Game, setAutoStart } from '../src/core/Game';
import { DEFAULT_SETTINGS } from '../src/core/Config';

/** Headless mission boot shared by the force/battle tests. */
export function headlessMission(missionId: string): Game {
  setAutoStart(false);
  const game = new Game(
    {
      ...DEFAULT_SETTINGS,
      missionId,
      showHints: false,
      soundEnabled: false,
      musicEnabled: false,
      fogOfWar: false,
      cinematic: false,
    },
    null,
    null,
    false,
    true,
  );
  // The headless HUD/camera proxies return noop for every property, so the mission's cinematic guard
  // would otherwise hold the clock forever. These tests exercise the authored simulation.
  (game as unknown as { isCinematicActive: () => boolean }).isCinematicActive = () => false;
  return game;
}
