import { t } from '../i18n';
import { backdrop } from './SeriesMenu';

/**
 * The mission briefing, staged like a campaign chapter page: the mission's art behind, the story on
 * the left and a sheet on the right with the key facts, the objectives and the call to action. The
 * primary action is focused so Enter starts the mission; the secondary one goes back to the campaigns.
 * HUD prepares the content (already escaped HTML) and owns the overlay lifecycle.
 */
export interface BriefingView {
  readonly kicker: string;
  readonly title: string;
  readonly subtitle: string;
  /** Full-screen backdrop image: the mission's own art only, never another mission's. */
  readonly backdrop: string | undefined;
  /** The campaign colour, lighting the backdrop when the mission has no art. */
  readonly accent: string;
  /** Optional illustration (an `ed-art` figure with its caption and disclaimer). */
  readonly art: string;
  /** Story paragraphs and the historical context. */
  readonly story: string;
  readonly didYouKnow: string;
  readonly commanders: string;
  readonly sources: string;
  readonly facts: readonly { readonly label: string; readonly value: string }[];
  readonly objectives: readonly { readonly title: string; readonly optional: boolean }[];
  onStart(): void;
  onBack(): void;
}

export function renderBriefing(overlay: HTMLElement, v: BriefingView): void {
  ensureStyles();
  overlay.classList.add('ed-briefing-screen');
  backdrop(overlay, v.backdrop ?? '');
  overlay.style.setProperty('--campaign-accent', v.accent);
  const page = document.createElement('article');
  page.className = 'ed-briefing';
  page.setAttribute('aria-labelledby', 'ed-briefing-title');
  const objectives = v.objectives
    .map(
      (o) =>
        `<li class="${o.optional ? 'optional' : ''}"><span class="mark" aria-hidden="true">${o.optional ? '◇' : '◆'}</span><span>${o.title}</span>${
          o.optional ? `<em>${t('hud.menu.briefing.optional')}</em>` : ''
        }</li>`,
    )
    .join('');
  page.innerHTML = `
    <header class="brief-head">
      <div class="ed-menu-kicker">${v.kicker}</div>
      <h2 id="ed-briefing-title">${v.title}</h2>
      <div class="brief-subtitle">${v.subtitle}</div>
      <div class="ed-epic-band" aria-hidden="true"></div>
    </header>
    <div class="brief-body">
      <section class="brief-story">
        ${v.art}
        ${v.story}
        ${v.didYouKnow}
        ${v.commanders}
        ${v.sources}
      </section>
      <aside class="brief-sheet">
        <dl class="brief-facts">${v.facts.map((f) => `<div><dt>${f.label}</dt><dd>${f.value}</dd></div>`).join('')}</dl>
        <h3>${t('hud.menu.briefing.objectives')}</h3>
        <ul class="brief-objectives">${objectives}</ul>
        <div class="brief-actions">
          <button class="ed-primary" type="button" data-action="start">${t('hud.menu.briefing.start')}</button>
          <button class="ed-ghostbtn" type="button" data-action="back">${t('hud.menu.briefing.back')}</button>
        </div>
      </aside>
    </div>
  `;
  overlay.appendChild(page);
  const start = page.querySelector('[data-action="start"]') as HTMLButtonElement;
  start.addEventListener('click', v.onStart);
  page.querySelector('[data-action="back"]')!.addEventListener('click', v.onBack);
  start.focus({ preventScroll: true });
}

let styled = false;

function ensureStyles(): void {
  if (styled) return;
  styled = true;
  const style = document.createElement('style');
  style.id = 'ed-briefing-css';
  style.textContent = CSS;
  document.head.appendChild(style);
}

const CSS = /* css */ `
  .ed-epic.ed-briefing-screen { align-items: stretch; justify-content: center; background: radial-gradient(ellipse at 72% 30%, color-mix(in srgb, var(--campaign-accent, #c99a55) 32%, transparent), transparent 60%), #05070a; }
  .ed-briefing-screen .ed-epic-shade { background: linear-gradient(90deg, rgba(4,6,9,.94) 0%, rgba(4,6,9,.82) 48%, rgba(4,6,9,.6) 100%), linear-gradient(0deg, rgba(4,6,9,.9), rgba(4,6,9,.2) 60%); }
  .ed-briefing-screen .ed-briefing { box-sizing: border-box; position: relative; z-index: 1; width: min(1240px, 96vw); height: 100%; overflow: auto; display: flex; flex-direction: column; justify-content: safe center; gap: 18px; padding: clamp(20px, 4vh, 48px) clamp(16px, 3vw, 40px); text-align: left; background: none; border: 0; }
  .ed-briefing > * { animation: ed-epic-rise .7s ease-out both; }
  .ed-briefing > .brief-body { animation-delay: .12s; }
  .ed-briefing .brief-head h2 { margin: 6px 0 4px; font-size: clamp(36px, 4.6vw, 60px); line-height: 1; letter-spacing: 2px; text-align: left;
    background: linear-gradient(180deg, #fff3cf 0%, #f0d48a 45%, #b9873a 100%); -webkit-background-clip: text; background-clip: text; color: transparent; filter: drop-shadow(0 4px 20px rgba(0,0,0,.8)); }
  .ed-briefing .ed-menu-kicker { color: var(--gold); opacity: .85; letter-spacing: 4px; margin: 0; }
  .ed-briefing .brief-subtitle { color: #d8d0bd; font-size: 14px; letter-spacing: .5px; }
  .ed-briefing .ed-epic-band { margin: 14px 0 0; }
  .ed-briefing .brief-body { display: grid; grid-template-columns: minmax(0, 7fr) minmax(300px, 4fr); gap: clamp(18px, 3vw, 40px); align-items: start; }
  .ed-briefing .brief-story { max-width: 70ch; }
  .ed-briefing .brief-story .ed-art { margin: 0 0 16px; }
  .ed-briefing .brief-story .ed-art img { aspect-ratio: 16 / 9; max-height: min(300px, 32vh); border-color: rgba(232,195,106,.3); box-shadow: 0 14px 40px rgba(0,0,0,.5); }
  .ed-briefing .brief-story .ed-hist { margin: 0 0 14px; color: #e4ddcb; font-size: 15px; line-height: 1.75; white-space: pre-line; }
  .ed-briefing .brief-story .ed-hist b { color: var(--gold); }
  .ed-briefing .ed-sabias { margin: 4px 0 16px; padding: 12px 16px; font-size: 13px; line-height: 1.6; background: rgba(232,195,106,.08); border-left: 3px solid var(--gold); border-radius: 0 6px 6px 0; }
  .ed-briefing .ed-commanders { justify-content: flex-start; }
  .ed-briefing .ed-fuentes { margin: 8px 0 0; }
  .ed-briefing .brief-sheet { position: sticky; top: 0; display: flex; flex-direction: column; gap: 14px; padding: 20px 22px; border: 1px solid rgba(232,195,106,.28); border-top: 3px solid var(--gold); border-radius: 8px; background: linear-gradient(180deg, rgba(14,17,22,.94), rgba(8,10,14,.9)); backdrop-filter: blur(6px); box-shadow: 0 20px 60px rgba(0,0,0,.5); }
  .ed-briefing .brief-facts { display: grid; gap: 10px; margin: 0; }
  .ed-briefing .brief-facts div { display: grid; grid-template-columns: 88px minmax(0, 1fr); gap: 10px; align-items: baseline; }
  .ed-briefing .brief-facts dt { color: var(--gold-dim); font-size: 10px; letter-spacing: 1.6px; text-transform: uppercase; }
  .ed-briefing .brief-facts dd { margin: 0; color: #ece4d0; font-size: 13px; line-height: 1.45; }
  .ed-briefing .brief-sheet h3 { margin: 4px 0 0; padding-top: 14px; border-top: 1px solid rgba(232,195,106,.18); color: var(--gold); font-family: inherit; font-size: 11px; letter-spacing: 2.4px; }
  .ed-briefing .brief-objectives { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
  .ed-briefing .brief-objectives li { display: grid; grid-template-columns: 16px minmax(0, 1fr) auto; gap: 10px; align-items: baseline; color: #ece4d0; font-size: 13.5px; line-height: 1.45; }
  .ed-briefing .brief-objectives .mark { color: var(--gold); font-size: 11px; }
  .ed-briefing .brief-objectives li.optional { color: var(--text-dim); }
  .ed-briefing .brief-objectives em { font-style: normal; font-size: 9.5px; letter-spacing: 1px; text-transform: uppercase; color: var(--gold-dim); border: 1px solid rgba(232,195,106,.3); border-radius: 9px; padding: 1px 7px; }
  .ed-briefing .brief-actions { display: flex; flex-direction: column; gap: 8px; margin-top: 6px; }
  .ed-briefing .brief-actions .ed-primary { width: 100%; padding: 14px 18px; font-size: 16px; letter-spacing: 2px; box-shadow: 0 10px 30px rgba(232,195,106,.18); }
  .ed-briefing .brief-actions .ed-primary:focus-visible { outline: 2px solid #fff3cf; outline-offset: 3px; }
  .ed-briefing .brief-actions .ed-ghostbtn { width: 100%; }
  @media (prefers-reduced-motion: reduce) { .ed-briefing > * { animation: none; } }
  @media (max-width: 900px) {
    .ed-briefing .brief-body { grid-template-columns: 1fr; }
    .ed-briefing .brief-sheet { position: static; order: -1; }
  }
`;
