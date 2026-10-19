import type { Game } from './Game';
import type { GameSettings } from './Config';

type Quality = GameSettings['quality'];

const ORDER: Quality[] = ['low', 'medium', 'high'];

const WINDOW = 3; // seconds per evaluation window
const LOW_FPS = 45; // below this the preset steps down
const HIGH_FPS = 58; // above this it can step back up
const SEVERE_FPS = 25; // below this the render scale is dropped
const LOW_WINDOWS = 2; // consecutive low windows before stepping down
const HIGH_WINDOWS = 3; // consecutive high windows before stepping back up

/**
 * Adaptive post-processing quality. Only steps down from the quality the player
 * chose (never above it) and restores it when the frame rate recovers. It never
 * writes `settings.quality` (the player's choice), only the applied preset, so an
 * automatic downgrade is never persisted as the saved default. Purely visual: it
 * never touches the simulation or the RNG.
 */
export class QualityGovernor {
  private readonly game: Game;
  private base: Quality;
  private current: Quality;
  private elapsed = 0;
  private lowWindows = 0;
  private highWindows = 0;
  private droppedScale = false;
  private prevRatio: number | null = null;

  constructor(game: Game) {
    this.game = game;
    this.base = game.settings.quality;
    this.current = this.base;
  }

  /** Quality preset the governor last applied (for the debug overlay). */
  get applied(): Quality {
    return this.current;
  }

  /** A new player-chosen preset: it becomes the ceiling and is applied at once. */
  setUserQuality(q: Quality): void {
    this.base = q;
    this.current = q;
    this.lowWindows = 0;
    this.highWindows = 0;
    this.game.applyQualityPreset(q);
    this.restoreScale();
  }

  update(dt: number): void {
    this.elapsed += dt;
    if (this.elapsed < WINDOW) return;
    this.elapsed = 0;
    const fps = this.game.loop.getFps();
    if (fps <= 0) return;

    if (fps < LOW_FPS) {
      this.highWindows = 0;
      this.lowWindows++;
    } else if (fps >= HIGH_FPS) {
      this.lowWindows = 0;
      this.highWindows++;
    } else {
      this.lowWindows = 0;
      this.highWindows = 0;
      return;
    }

    if (this.lowWindows >= LOW_WINDOWS) {
      this.lowWindows = 0;
      this.step(-1);
    } else if (this.highWindows >= HIGH_WINDOWS) {
      this.highWindows = 0;
      this.step(1);
    }

    if (fps < SEVERE_FPS && this.current === 'low' && !this.droppedScale) {
      this.prevRatio = this.game.pixelRatioOverride;
      this.droppedScale = true;
      this.game.setPixelRatioOverride(1);
    }
  }

  private step(dir: -1 | 1): void {
    const cur = ORDER.indexOf(this.current);
    const ceiling = ORDER.indexOf(this.base);
    const next = ORDER[Math.max(0, Math.min(cur + dir, ceiling))];
    if (next === this.current) return;
    this.current = next;
    this.game.applyQualityPreset(next);
    if (next === this.base) this.restoreScale();
  }

  private restoreScale(): void {
    if (!this.droppedScale) return;
    this.droppedScale = false;
    this.game.setPixelRatioOverride(this.prevRatio);
  }
}
