/** Bucle principal con tiempo delta suavizado y escalado de velocidad de juego. */
export class GameLoop {
  private running = false;
  private rafId = 0;
  private lastTime = 0;
  private acc = 0;
  private lastFps = 0;
  private frames = 0;
  private fpsTimer = 0;

  speed = 1;
  onUpdate: (dt: number, time: number) => void = () => {};
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

      // Paso fijo lógico a 60Hz para determinismo
      const step = 1 / 60;
      let iterations = 0;
      while (this.acc >= step && iterations < 8) {
        this.onUpdate(step, now / 1000);
        this.acc -= step;
        iterations++;
      }
      if (this.acc >= step) this.acc = 0;
      this.onRender(this.acc / step);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }
}
