/** Most fixed steps one frame may run: the 0.25 s frame clamp at 3x speed is 45 steps. */
const MAX_STEPS = 48;
/** Simulation work one frame may spend catching up before the backlog is dropped. */
const STEP_BUDGET_MS = 40;

/** Main loop with smoothed delta time and game-speed scaling. */
export class GameLoop {
  private running = false;
  private rafId = 0;
  private lastTime = 0;
  private acc = 0;
  private lastFps = 0;
  private frames = 0;
  private fpsTimer = 0;
  private stepCount = 0;

  speed = 1;
  onUpdate: (dt: number, time: number) => void | boolean = () => {};
  onRender: (alpha: number) => void = () => {};

  getFps(): number {
    return this.lastFps;
  }

  start(): void {
    this.running = true;
    this.lastTime = performance.now();
    const loop = (now: number) => {
      if (!this.running) return;
      this.rafId = requestAnimationFrame(loop);
      let dt = (now - this.lastTime) / 1000;
      this.lastTime = now;
      dt = Math.min(dt, 0.25);
      this.acc += dt * this.speed;

      // FPS
      this.frames++;
      this.fpsTimer += dt;
      if (this.fpsTimer >= 0.5) {
        this.lastFps = Math.round(this.frames / this.fpsTimer);
        this.frames = 0;
        this.fpsTimer = 0;
      }

      // Fixed logical step at 60Hz for determinism. A slow frame catches up with as many steps as the
      // owed game time needs (up to MAX_STEPS, which covers the 0.25 s clamp at 3x), so 2x and 3x keep
      // their speed on a modest GPU. Catching up stops at STEP_BUDGET_MS of simulation work instead of a
      // fixed count: only when the simulation itself is too slow is the rest of the backlog dropped,
      // which keeps a heavy frame from spiralling.
      const step = 1 / 60;
      const started = performance.now();
      let iterations = 0;
      while (this.acc >= step && iterations < MAX_STEPS) {
        const stepped = this.onUpdate(step, this.stepCount * step);
        if (stepped !== false) this.stepCount++;
        this.acc -= step;
        iterations++;
        if (performance.now() - started > STEP_BUDGET_MS) break;
      }
      if (this.acc >= step) this.acc = 0;
      this.onRender(this.acc / step);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stop(): void {
    this.running = false;
    if (typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(this.rafId);
  }
}
