import type { CinematicBeat } from '../campaign/defs/cinematics';

export interface CinematicOptions {
  beats: CinematicBeat[];
  background: string;
  kicker?: string;
  title?: string;
  finalLabel?: string;
  onDone: () => void;
  onAdvance?: () => void;
}

/** Full-screen, skippable story sequence used by the title and campaign prologues. */
export class CinematicPlayer {
  private readonly options: CinematicOptions;
  private readonly overlay: HTMLElement;
  private index = 0;
  private timer: number | null = null;
  private finished = false;

  constructor(root: HTMLElement, options: CinematicOptions) {
    this.options = options;
    this.overlay = document.createElement('div');
    this.overlay.className = 'ed-overlay ed-cinematic';
    this.overlay.setAttribute('role', 'dialog');
    this.overlay.setAttribute('aria-modal', 'true');
    this.overlay.style.backgroundImage = `linear-gradient(90deg, rgba(4,7,10,.94), rgba(4,7,10,.52) 56%, rgba(4,7,10,.72)), url("${options.background}")`;
    this.overlay.innerHTML = `
      <div class="ed-cinematic-copy">
        <div class="ed-cinematic-series">${escapeHtml(options.kicker ?? 'LA SENDA DEL SOL')}</div>
        <div class="ed-cinematic-kicker"></div>
        <h2 class="ed-cinematic-title"></h2>
        <p class="ed-cinematic-text"></p>
      </div>
      <div class="ed-cinematic-footer">
        <div class="ed-cinematic-progress" aria-hidden="true"></div>
        <div class="ed-cinematic-actions">
          <button class="ed-cinematic-skip ed-ghostbtn" type="button">Saltar</button>
          <button class="ed-cinematic-next ed-primary" type="button">Continuar</button>
        </div>
      </div>
    `;
    this.overlay.querySelector('.ed-cinematic-next')!.addEventListener('click', () => this.next());
    this.overlay.querySelector('.ed-cinematic-skip')!.addEventListener('click', () => this.finish());
    root.appendChild(this.overlay);
    this.showBeat();
    window.addEventListener('keydown', this.onKeyDown);
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (target?.closest('button') && event.key !== 'Escape') return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.finish();
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.next();
    }
  };

  private showBeat(): void {
    const beat = this.options.beats[this.index];
    if (!beat) {
      this.finish();
      return;
    }
    this.overlay.querySelector('.ed-cinematic-kicker')!.textContent = beat.kicker ?? '';
    this.overlay.querySelector('.ed-cinematic-title')!.textContent = beat.title;
    this.overlay.querySelector('.ed-cinematic-text')!.textContent = beat.text;
    const progress = this.overlay.querySelector('.ed-cinematic-progress')!;
    progress.innerHTML = this.options.beats
      .map((_, i) => `<span class="${i === this.index ? 'active' : ''}"></span>`)
      .join('');
    const next = this.overlay.querySelector('.ed-cinematic-next') as HTMLButtonElement;
    next.textContent =
      this.index === this.options.beats.length - 1 ? (this.options.finalLabel ?? 'Continuar') : 'Siguiente';
    this.overlay.classList.remove('is-active');
    void this.overlay.offsetWidth;
    this.overlay.classList.add('is-active');
    this.options.onAdvance?.();
    if (this.timer !== null) window.clearTimeout(this.timer);
    const seconds = beat.seconds ?? 6;
    this.timer = window.setTimeout(() => this.next(), seconds * 1000);
  }

  private next(): void {
    if (this.finished) return;
    this.index++;
    if (this.index >= this.options.beats.length) {
      this.finish();
      return;
    }
    this.showBeat();
  }

  private finish(): void {
    if (this.finished) return;
    this.finished = true;
    if (this.timer !== null) window.clearTimeout(this.timer);
    window.removeEventListener('keydown', this.onKeyDown);
    this.overlay.remove();
    this.options.onDone();
  }
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
