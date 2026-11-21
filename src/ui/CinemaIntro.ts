import type { CinematicBeat, CinematicMotion } from '../campaign/defs/cinematics';
import { t } from '../i18n';
import { publicAsset } from '../util/publicAsset';
import { campaignMapSvg, fullView, paintCampaignMap, type CinemaMapTerrain } from './cinemaMap';

export interface CinemaIntroOptions {
  beats: CinematicBeat[];
  /** Small line above the first beat (the mission title). */
  series: string;
  /** Label of the button on the last beat. */
  finalLabel: string;
  /** Mission terrain, for map beats; without it a map beat falls back to its image. */
  terrain?: CinemaMapTerrain;
  onDone: () => void;
}

const STYLE_ID = 'ed-cine-style';
const DEFAULT_SECONDS = 8;
const MOTIONS: CinematicMotion[] = ['push', 'pan-right', 'pull', 'pan-left'];

const CSS = `
.ed-cine { display: block; background: #050403; backdrop-filter: none; overflow: hidden; color: #f1e6cc;
  font-family: inherit; cursor: pointer; user-select: none; }
.ed-cine-stage { position: absolute; inset: 0; }
.ed-cine-layer { position: absolute; inset: -4%; background-size: cover; background-position: center; opacity: 0;
  transition: opacity 1.2s ease; will-change: transform, opacity; }
.ed-cine-layer.on { opacity: 1; }
.ed-cine-layer.m-push { animation: cine-push var(--d) linear forwards; }
.ed-cine-layer.m-pull { animation: cine-pull var(--d) linear forwards; }
.ed-cine-layer.m-pan-left { animation: cine-pan-left var(--d) linear forwards; }
.ed-cine-layer.m-pan-right { animation: cine-pan-right var(--d) linear forwards; }
@keyframes cine-push { from { transform: scale(1.02); } to { transform: scale(1.14); } }
@keyframes cine-pull { from { transform: scale(1.15); } to { transform: scale(1.03); } }
@keyframes cine-pan-left { from { transform: scale(1.1) translateX(3%); } to { transform: scale(1.1) translateX(-3%); } }
@keyframes cine-pan-right { from { transform: scale(1.1) translateX(-3%); } to { transform: scale(1.1) translateX(3%); } }
.ed-cine-grade { position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(ellipse at 50% 45%, transparent 45%, rgba(5,4,3,.55) 100%),
    linear-gradient(180deg, rgba(5,4,3,.0) 55%, rgba(5,4,3,.78) 100%); }
.ed-cine-bar { position: absolute; left: 0; right: 0; height: 9vh; background: #050403; z-index: 3; }
.ed-cine-bar.top { top: 0; } .ed-cine-bar.bottom { bottom: 0; }
.ed-cine-head { position: absolute; z-index: 4; top: calc(9vh + 22px); left: clamp(20px, 5vw, 64px);
  text-shadow: 0 2px 12px rgba(0,0,0,.8); }
.ed-cine-series { font-size: 10px; letter-spacing: 4px; text-transform: uppercase; color: rgba(232,195,106,.7); }
.ed-cine-kicker { margin-top: 6px; font-size: 12px; letter-spacing: 3px; text-transform: uppercase; color: #e8c36a; }
.ed-cine-sub { position: absolute; z-index: 4; left: 50%; bottom: calc(9vh + 26px); transform: translateX(-50%);
  width: min(920px, 88vw); text-align: center; text-shadow: 0 2px 14px rgba(0,0,0,.9), 0 0 2px rgba(0,0,0,.9); }
.ed-cine-title { margin: 0 0 10px; font-family: Georgia, 'Times New Roman', serif; font-weight: 700;
  font-size: clamp(30px, 4.2vw, 56px); line-height: 1.05; color: #f6e8c4; letter-spacing: .5px; }
.ed-cine-text { margin: 0; font-size: clamp(16px, 1.55vw, 22px); line-height: 1.55; color: #efe6d2; }
.ed-cine.is-in .ed-cine-title { animation: cine-rise 1s ease both; }
.ed-cine.is-in .ed-cine-text { animation: cine-rise 1s ease .35s both; }
.ed-cine.is-in .ed-cine-kicker { animation: cine-fade 1s ease both; }
@keyframes cine-rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
@keyframes cine-fade { from { opacity: 0; } to { opacity: 1; } }
.ed-cine-foot { position: absolute; z-index: 5; left: clamp(20px, 5vw, 64px); right: clamp(20px, 5vw, 64px);
  bottom: 0; height: 9vh; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.ed-cine-progress { flex: 1; display: flex; gap: 6px; max-width: 360px; }
.ed-cine-progress span { flex: 1; height: 2px; background: rgba(232,195,106,.22); position: relative; overflow: hidden; }
.ed-cine-progress span.done::after, .ed-cine-progress span.active::after { content: ''; position: absolute; inset: 0;
  background: #e8c36a; transform-origin: left; }
.ed-cine-progress span.active::after { animation: cine-fill var(--d) linear forwards; }
@keyframes cine-fill { from { transform: scaleX(0); } to { transform: scaleX(1); } }
.ed-cine-actions { display: flex; gap: 8px; }
.ed-cine-actions button { cursor: pointer; font: inherit; font-size: 13px; letter-spacing: 1px; padding: 8px 16px;
  border-radius: 3px; border: 1px solid rgba(232,195,106,.4); background: rgba(10,8,6,.6); color: #e9dcc0; }
.ed-cine-actions button.primary { background: #e8c36a; color: #1b1308; border-color: #e8c36a; font-weight: 700; }
.ed-cine-map { position: absolute; inset: 0; opacity: 0; transition: opacity 1.2s ease; display: grid;
  place-items: center; background: radial-gradient(ellipse at center, #2a2015 0%, #0b0806 75%); }
.ed-cine-map.on { opacity: 1; }
.ed-cine-map-sheet { position: relative; width: min(58vh, 60vw); aspect-ratio: 1; margin-top: -17vh;
  box-shadow: 0 30px 80px rgba(0,0,0,.7), 0 0 0 1px rgba(80,58,30,.6); transform: rotate(-.6deg);
  animation: cine-push var(--d) linear forwards; }
.ed-cine-map-sheet canvas, .ed-cine-map-sheet svg { position: absolute; inset: 0; width: 100%; height: 100%; }
.ed-cine-map-sheet canvas { filter: sepia(.25) contrast(1.05); }
.ed-cine-map-sheet::after { content: ''; position: absolute; inset: 0; pointer-events: none;
  box-shadow: inset 0 0 70px rgba(90,60,25,.55); border: 6px double rgba(70,48,22,.55); }
.cine-map-svg text { font-family: Georgia, 'Times New Roman', serif; font-style: italic; font-weight: 700;
  paint-order: stroke; stroke: rgba(240,228,200,.9); stroke-width: .9px; }
.cine-map-mark, .cine-map-route-label, .cine-map-head { opacity: 0; animation: cine-fade .7s ease forwards; }
.cine-map-draw { stroke-dasharray: 1; stroke-dashoffset: 1; animation-name: cine-draw; animation-timing-function: ease-in-out;
  animation-fill-mode: forwards; }
@keyframes cine-draw { to { stroke-dashoffset: 0; } }
@media (prefers-reduced-motion: reduce) {
  .ed-cine-layer, .ed-cine-map-sheet { animation: none !important; }
  .cine-map-draw { animation-duration: .01s !important; }
}
@media (max-width: 720px) {
  .ed-cine-bar { height: 6vh; }
  .ed-cine-progress { display: none; }
  .ed-cine-map-sheet { width: 86vw; }
}
`;

function ensureStyle(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.appendChild(style);
}

/**
 * Letterboxed story intro, the way a campaign film opens: full-bleed art with a slow camera move,
 * centred subtitles, and campaign maps drawn from the mission terrain with arrows that march across it.
 * Click or Enter advances, Escape skips, every beat also advances on its own.
 */
export class CinemaIntro {
  private readonly options: CinemaIntroOptions;
  private readonly root: HTMLElement;
  private readonly stage: HTMLElement;
  private index = -1;
  private timer: number | null = null;
  private finished = false;

  constructor(parent: HTMLElement, options: CinemaIntroOptions) {
    ensureStyle();
    this.options = options;
    this.root = document.createElement('div');
    this.root.className = 'ed-overlay ed-cine';
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-modal', 'true');
    this.root.setAttribute('aria-label', options.series);
    this.root.innerHTML = `
      <div class="ed-cine-stage"></div>
      <div class="ed-cine-grade"></div>
      <div class="ed-cine-bar top"></div><div class="ed-cine-bar bottom"></div>
      <div class="ed-cine-head"><div class="ed-cine-series"></div><div class="ed-cine-kicker"></div></div>
      <div class="ed-cine-sub" aria-live="polite"><h2 class="ed-cine-title"></h2><p class="ed-cine-text"></p></div>
      <div class="ed-cine-foot">
        <div class="ed-cine-progress" aria-hidden="true">${options.beats.map(() => '<span></span>').join('')}</div>
        <div class="ed-cine-actions">
          <button type="button" class="skip">${t('hud.cinematic.skip')}</button>
          <button type="button" class="primary next">${t('hud.cinematic.next')}</button>
        </div>
      </div>`;
    this.root.querySelector('.ed-cine-series')!.textContent = options.series;
    this.stage = this.root.querySelector('.ed-cine-stage')!;
    this.root.querySelector('.skip')!.addEventListener('click', (e) => {
      e.stopPropagation();
      this.finish();
    });
    this.root.querySelector('.next')!.addEventListener('click', (e) => {
      e.stopPropagation();
      this.next();
    });
    this.root.addEventListener('click', () => this.next());
    parent.appendChild(this.root);
    window.addEventListener('keydown', this.onKeyDown);
    this.next();
    (this.root.querySelector('.next') as HTMLButtonElement).focus();
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    // The overlay can be removed from outside (the HUD clears every overlay when it leaves a match):
    // stop instead of opening the briefing over whatever replaced it.
    if (!this.root.isConnected) {
      this.dispose();
      return;
    }
    // A focused button activates itself (Space fires its click on key-up): handling the key here as
    // well would advance two beats.
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (target?.closest('button') && event.key !== 'Escape') return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.finish();
    } else if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowRight') {
      event.preventDefault();
      this.next();
    }
  };

  private next(): void {
    if (this.finished) return;
    this.index++;
    const beat = this.options.beats[this.index];
    if (!beat) {
      this.finish();
      return;
    }
    this.show(beat);
  }

  private show(beat: CinematicBeat): void {
    const seconds = beat.seconds ?? DEFAULT_SECONDS;
    const duration = `${seconds + 1.5}s`;
    const layer = beat.map && this.options.terrain ? this.mapLayer(beat, duration) : this.imageLayer(beat, duration);
    // Cross-fade: the new layer fades in over the old one, which leaves once the fade is done.
    const previous = [...this.stage.children];
    this.stage.appendChild(layer);
    requestAnimationFrame(() => layer.classList.add('on'));
    window.setTimeout(() => previous.forEach((el) => el.remove()), 1400);

    this.root.querySelector('.ed-cine-kicker')!.textContent = beat.kicker ?? '';
    this.root.querySelector('.ed-cine-title')!.textContent = beat.title;
    this.root.querySelector('.ed-cine-text')!.textContent = beat.text;
    this.root.classList.remove('is-in');
    void this.root.offsetWidth;
    this.root.classList.add('is-in');

    const bars = [...this.root.querySelectorAll<HTMLElement>('.ed-cine-progress span')];
    bars.forEach((bar, i) => {
      bar.className = i < this.index ? 'done' : i === this.index ? 'active' : '';
      bar.style.setProperty('--d', `${seconds}s`);
    });
    const last = this.index === this.options.beats.length - 1;
    this.root.querySelector('.next')!.textContent = last ? this.options.finalLabel : t('hud.cinematic.next');

    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => {
      if (this.root.isConnected) this.next();
      else this.dispose();
    }, seconds * 1000);
    this.preload(this.options.beats[this.index + 1]);
  }

  /** Start fetching the next still while this beat plays, so its fade does not open on black. */
  private preload(beat: CinematicBeat | undefined): void {
    if (!beat?.image || (beat.map && this.options.terrain)) return;
    const img = new Image();
    img.decoding = 'async';
    img.src = publicAsset(beat.image);
  }

  private imageLayer(beat: CinematicBeat, duration: string): HTMLElement {
    const layer = document.createElement('div');
    const motion = beat.motion ?? MOTIONS[this.index % MOTIONS.length]!;
    layer.className = `ed-cine-layer m-${motion}`;
    layer.style.setProperty('--d', duration);
    if (beat.image) layer.style.backgroundImage = `url("${publicAsset(beat.image)}")`;
    return layer;
  }

  private mapLayer(beat: CinematicBeat, duration: string): HTMLElement {
    const terrain = this.options.terrain!;
    const layer = document.createElement('div');
    layer.className = 'ed-cine-map';
    const sheet = document.createElement('div');
    sheet.className = 'ed-cine-map-sheet';
    sheet.style.setProperty('--d', duration);
    const canvas = document.createElement('canvas');
    const view = beat.map!.view ?? fullView(terrain.size);
    paintCampaignMap(canvas, terrain, view);
    sheet.appendChild(canvas);
    sheet.insertAdjacentHTML('beforeend', campaignMapSvg(beat.map!, view));
    layer.appendChild(sheet);
    return layer;
  }

  private finish(): void {
    if (this.finished) return;
    this.dispose();
    this.root.remove();
    this.options.onDone();
  }

  /** Drop the timer and the key listener without running `onDone`. */
  private dispose(): void {
    this.finished = true;
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = null;
    window.removeEventListener('keydown', this.onKeyDown);
  }
}
