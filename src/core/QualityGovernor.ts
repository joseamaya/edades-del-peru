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
 * chose (never above it), and only drops the render scale in severe cases.
 * Purely visual: it never touches the simulation or the RNG.
 */
export class QualityGovernor {
  private readonly game: Game;
  private base: Quality | null = null;
  private current: Quality;
  private elapsed = 0;
  private lowWindows = 0;
  private highWindows = 0;
  private severe = false;

  constructor(game: Game) {
    this.game = game;
    this.current = game.settings.quality;
  }

  /** Quality preset the governor last applied (for the debug overlay). */
  get applied(): Quality {
    return this.current;
  }

  update(dt: number): void {
    // The base is the quality the player selected, resolved lazily so URL/debug
    // overrides applied right after construction are respected as the ceiling.
    if (!this.base) {
      this.base = this.game.settings.quality;
      this.current = this.base;
    }
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

    if (fps < SEVERE_FPS && this.current === 'low' && !this.severe) {
      this.severe = true;
      this.game.setPixelRatioOverride(1);
    }
  }

  private step(dir: -1 | 1): void {
    const cur = ORDER.indexOf(this.current);
    const ceiling = ORDER.indexOf(this.base ?? this.current);
    const next = ORDER[Math.max(0, Math.min(cur + dir, ceiling))];
    if (next === this.current) return;
    this.current = next;
    this.game.setQuality(next);
  }
}
