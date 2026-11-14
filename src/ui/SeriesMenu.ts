import { CAMPAIGNS, campaignNumber, campaignSteps, getReleasedMission } from '../campaign/defs/campaigns';
import type { CampaignDef, CampaignId } from '../campaign/defs/campaigns';
import {
  isCampaignUnlocked,
  isMissionCompleted,
  isMissionUnlocked,
  nextSeriesMission,
  seriesMissions,
  type CampaignProgress,
} from '../campaign/progress';
import { t } from '../i18n';
import { CAMPAIGN_ART, MENU_BACKDROP, MISSION_ART } from './menuArt';

/**
 * The series front door: the main menu and the campaign path ("La Senda del Sol"). The campaigns are
 * played in order; a campaign or mission opens once the one before it is completed (see
 * `isMissionUnlocked`). Rendering only: HUD owns the overlay lifecycle and the actions.
 */

export interface MainMenuActions {
  readonly progress: CampaignProgress;
  readonly hasSave: boolean;
  readonly hasReplay: boolean;
  readonly skirmish: boolean;
  onContinue(): void;
  onCampaigns(): void;
  onPlay(missionId: string): void;
  onSkirmish(): void;
  onCodex(): void;
  onControls(): void;
  onOptions(): void;
  onIntro(): void;
  onReplay(): void;
}

export interface CampaignPathActions {
  readonly progress: CampaignProgress;
  /** Debug: open every campaign and mission (`?unlock=all`). */
  readonly unlockAll: boolean;
  readonly selected?: CampaignId;
  onPlay(missionId: string): void;
  onPrologue(campaignId: CampaignId): void;
  onBack(): void;
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

function roman(campaign: CampaignDef): string {
  return ROMAN[campaignNumber(campaign.id) - 1] ?? String(campaignNumber(campaign.id));
}

/** First paragraph of a mission's history, trimmed to two sentences for a menu line. */
function missionBlurb(missionId: string): string {
  const history = getReleasedMission(missionId)?.history ?? '';
  const first = history.split('\n')[0] ?? '';
  // A sentence ends at . ! ? followed by a capital, so 'c. 3000 a.C.' is not cut.
  const sentences = first.split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ¿¡])/u);
  return sentences.slice(0, 2).join(' ').trim();
}

function missionTitle(missionId: string): string {
  return getReleasedMission(missionId)?.title ?? missionId;
}

function artStyle(url: string | undefined, accent: string): string {
  const image = url ? `, url("${url}")` : '';
  return `--campaign-accent:${accent};background-image:linear-gradient(180deg, rgba(6,8,11,.05), rgba(6,8,11,.82))${image}, radial-gradient(circle at 50% 30%, ${accent}55, transparent 70%)`;
}

/** The drifting, shaded full-screen backdrop shared by the menu screens and the mission briefing. */
export function backdrop(parent: HTMLElement, image = MENU_BACKDROP): void {
  ensureStyles();
  parent.classList.add('ed-epic');
  const bg = document.createElement('div');
  bg.className = 'ed-epic-bg';
  if (image) bg.style.backgroundImage = `url("${image}")`;
  const shade = document.createElement('div');
  shade.className = 'ed-epic-shade';
  parent.append(bg, shade);
}

/** Dress the first-launch title gate with the animated backdrop and the gold title. */
export function decorateTitleScreen(overlay: HTMLElement): void {
  backdrop(overlay);
  overlay.querySelector('h1')?.insertAdjacentHTML('afterend', '<div class="ed-epic-band" aria-hidden="true"></div>');
}

/** Fill the main-menu overlay. */
export function renderMainMenu(overlay: HTMLElement, a: MainMenuActions): void {
  ensureStyles();
  overlay.classList.add('ed-epic');
  backdrop(overlay);
  const path = seriesMissions();
  const next = nextSeriesMission(a.progress);
  const done = path.filter((m) => isMissionCompleted(a.progress, m.missionId)).length;
  const campaign =
    CAMPAIGNS.find((c) => c.id === (next?.campaignId ?? path[path.length - 1]?.campaignId)) ?? CAMPAIGNS[0]!;

  const shell = document.createElement('div');
  shell.className = 'ed-menu-shell';
  shell.innerHTML = `
    <header class="ed-epic-head">
      <div class="ed-menu-kicker">${t('hud.menu.main.kicker')}</div>
      <h1 class="ed-menu-title"><span>${t('hud.menu.main.titleTop')}</span> <span>${t('hud.menu.main.titleBottom')}</span></h1>
      <div class="ed-epic-band" aria-hidden="true"></div>
      <p class="ed-menu-sub">${t('hud.menu.main.sub')}</p>
    </header>
    <nav class="ed-menu-actions"></nav>
    <footer class="ed-menu-footer">
      <span>${t('app.version')}</span>
      <button type="button" data-action="intro">${t('hud.menu.main.intro')}</button>
    </footer>
  `;
  overlay.appendChild(shell);
  const actions = shell.querySelector('.ed-menu-actions') as HTMLElement;
  const add = (icon: string, label: string, hint: string, onClick: () => void, primary = false): void => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `ed-menu-btn${primary ? ' primary' : ''}`;
    btn.innerHTML = `<span class="ic">${icon}</span><span>${label}<small>${hint}</small></span>`;
    btn.addEventListener('click', onClick);
    actions.appendChild(btn);
  };
  if (a.hasSave) add('▶', t('hud.menu.main.continue'), t('hud.menu.main.continueHint'), a.onContinue, true);
  add('☀', t('hud.menu.main.campaigns'), t('hud.menu.main.campaignsHint'), a.onCampaigns, !a.hasSave);
  if (a.skirmish) add('⚔', t('hud.menu.main.skirmish'), t('hud.menu.main.skirmishHint'), a.onSkirmish);
  add('📖', t('hud.menu.main.codex'), t('hud.menu.main.codexHint'), a.onCodex);
  add('?', t('hud.menu.main.controls'), t('hud.menu.main.controlsHint'), a.onControls);
  add('⚙', t('hud.menu.main.options'), t('hud.menu.main.optionsHint'), a.onOptions);
  shell.querySelector('[data-action="intro"]')!.addEventListener('click', a.onIntro);
  if (a.hasReplay) {
    const replay = document.createElement('button');
    replay.type = 'button';
    replay.textContent = t('hud.menu.main.replay');
    replay.addEventListener('click', a.onReplay);
    shell.querySelector('.ed-menu-footer')!.appendChild(replay);
  }

  const card = document.createElement('aside');
  card.className = 'ed-senda-card';
  const nextId = next?.missionId;
  const chapters = CAMPAIGNS.map((c) => {
    const state = isCampaignUnlocked(a.progress, c.id) ? (c.id === campaign.id ? 'current' : 'open') : 'locked';
    return `<span class="chapter ${state}" title="${esc(c.title)}">${roman(c)}</span>`;
  }).join('<i></i>');
  card.innerHTML = `
    <div class="art" style='${artStyle(nextId ? MISSION_ART[nextId] : CAMPAIGN_ART[campaign.id], campaign.accent)}'>
      <span class="numeral">${roman(campaign)}</span>
    </div>
    <div class="body">
      <div class="side-kicker">${t('hud.menu.senda.kicker', { n: roman(campaign), total: ROMAN[CAMPAIGNS.length - 1] })}</div>
      <h3>${esc(campaign.title)}</h3>
      ${
        nextId
          ? `<div class="next"><span>${t('hud.menu.senda.next')}</span><b>${esc(missionTitle(nextId))}</b><em>${esc(getReleasedMission(nextId)?.subtitle ?? '')}</em></div>`
          : `<div class="next"><b>${t('hud.menu.senda.allDone')}</b></div>`
      }
      <div class="progress"><i style="width:${path.length ? (done / path.length) * 100 : 0}%"></i></div>
      <div class="side-meta">${t('hud.menu.senda.progress', { done, total: path.length })}</div>
      <div class="chapters">${chapters}</div>
    </div>
  `;
  const play = document.createElement('button');
  play.type = 'button';
  play.className = 'ed-primary';
  play.textContent = nextId ? t('hud.menu.senda.play', { title: missionTitle(nextId) }) : t('hud.menu.senda.view');
  play.addEventListener('click', () => (nextId ? a.onPlay(nextId) : a.onCampaigns()));
  card.querySelector('.body')!.appendChild(play);
  overlay.appendChild(card);
}

/** Fill the campaign-path overlay: four chapters in a row, the selected one's missions below. */
export function renderCampaignPath(overlay: HTMLElement, a: CampaignPathActions): void {
  ensureStyles();
  overlay.classList.add('ed-epic');
  backdrop(overlay);
  const unlocked = (id: CampaignId): boolean => a.unlockAll || isCampaignUnlocked(a.progress, id);
  const missionOpen = (id: string): boolean => a.unlockAll || isMissionUnlocked(a.progress, id);
  const next = nextSeriesMission(a.progress);
  let selected =
    a.selected && unlocked(a.selected)
      ? a.selected
      : (next?.campaignId ?? [...CAMPAIGNS].reverse().find((c) => unlocked(c.id))?.id ?? CAMPAIGNS[0]!.id);

  const panel = document.createElement('div');
  panel.className = 'ed-campaign-panel';
  panel.innerHTML = `
    <header class="ed-campaign-head">
      <div>
        <div class="ed-menu-kicker">${t('app.series')}</div>
        <h2>${t('hud.menu.campaignHub.title')}</h2>
        <div class="sub">${t('hud.menu.campaignHub.subtitle')}</div>
      </div>
      <button class="ed-ghostbtn" type="button" data-action="back">${t('hud.menu.campaignHub.back')}</button>
    </header>
    <div class="ed-senda-track" role="tablist"></div>
    <section class="ed-senda-detail"></section>
  `;
  overlay.appendChild(panel);
  panel.querySelector('[data-action="back"]')!.addEventListener('click', a.onBack);
  const track = panel.querySelector('.ed-senda-track') as HTMLElement;
  const detail = panel.querySelector('.ed-senda-detail') as HTMLElement;

  const cards = new Map<CampaignId, HTMLButtonElement>();
  CAMPAIGNS.forEach((campaign, i) => {
    const open = unlocked(campaign.id);
    // Completion is looked up across the whole save: a mission keeps its progress if it moves chapter.
    const done = campaign.releasedMissionIds.filter((id) => isMissionCompleted(a.progress, id)).length;
    const total = campaign.releasedMissionIds.length;
    const planned = campaign.path.length - total;
    const state = !open ? 'locked' : done >= total ? 'done' : done > 0 ? 'progress' : 'open';
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `ed-campaign-card ${state}`;
    card.setAttribute('role', 'tab');
    card.style.setProperty('--campaign-accent', campaign.accent);
    card.dataset.campaign = campaign.id;
    card.disabled = !open;
    const previous = CAMPAIGNS[i - 1];
    card.innerHTML = `
      <div class="art" style='${artStyle(CAMPAIGN_ART[campaign.id], campaign.accent)}'>
        <span class="numeral">${roman(campaign)}</span>
        <span class="badge">${state === 'locked' ? '🔒 ' : state === 'done' ? '✓ ' : ''}${t(`hud.menu.campaignHub.state.${state}`)}</span>
      </div>
      <div class="era">${t('hud.menu.campaignHub.campaignNumber', { n: campaignNumber(campaign.id), total: CAMPAIGNS.length })} · ${esc(campaign.era)}</div>
      <h3>${esc(campaign.title)}</h3>
      <p>${esc(campaign.subtitle)}</p>
      <div class="card-meta">${
        open
          ? t('hud.menu.campaignHub.completed', { done, total })
          : t('hud.menu.campaignHub.lockedHint', { campaign: previous?.title ?? '' })
      }${planned > 0 ? ` · ${t('hud.menu.campaignHub.plannedCount', { n: planned })}` : ''}</div>
    `;
    card.addEventListener('click', () => select(campaign.id));
    track.appendChild(card);
    cards.set(campaign.id, card);
  });

  function select(id: CampaignId): void {
    selected = id;
    for (const [cid, card] of cards) {
      card.classList.toggle('selected', cid === id);
      card.setAttribute('aria-selected', String(cid === id));
    }
    const campaign = CAMPAIGNS.find((c) => c.id === id)!;
    detail.style.setProperty('--campaign-accent', campaign.accent);
    detail.innerHTML = `
      <div class="story">
        <div class="era">${esc(campaign.era)}</div>
        <h3>${esc(campaign.title)}</h3>
        <p>${esc(campaign.summary)}</p>
        <button class="ed-ghostbtn" type="button" data-action="prologue">${t('hud.menu.campaignHub.intro', { campaign: esc(campaign.title) })}</button>
      </div>
      <ol class="ed-senda-missions"></ol>
    `;
    detail.querySelector('[data-action="prologue"]')!.addEventListener('click', () => a.onPrologue(campaign.id));
    const list = detail.querySelector('.ed-senda-missions') as HTMLElement;
    const path = seriesMissions();
    campaignSteps(campaign).forEach((step, n) => {
      if (step.kind === 'planned') {
        // Announced, not built: its place in the chapter, no play button and no lock to clear.
        const p = step.planned;
        const row = document.createElement('li');
        row.className = 'ed-senda-mission planned';
        row.dataset.planned = p.id;
        row.innerHTML = `
          <span class="node">${n + 1}</span>
          <div class="info">
            <div class="label">${t('hud.menu.campaignHub.missionNumber', { n: n + 1 })} · ${esc(p.subtitle)}${p.label ? ` · <em>${esc(p.label)}</em>` : ''}</div>
            <b>${esc(p.title)}</b>
            <p>${esc(p.summary)}</p>
          </div>
          <span class="planned-tag">${t('hud.menu.campaignHub.planned')}</span>
        `;
        list.appendChild(row);
        return;
      }
      const missionId = step.id;
      const completed = isMissionCompleted(a.progress, missionId);
      const open = missionOpen(missionId);
      const state = completed ? 'done' : open ? 'open' : 'locked';
      const title = missionTitle(missionId);
      const before = path[path.findIndex((m) => m.missionId === missionId) - 1];
      const row = document.createElement('li');
      row.className = `ed-senda-mission ${state}`;
      row.innerHTML = `
        <span class="node">${completed ? '✓' : open ? n + 1 : '🔒'}</span>
        <div class="info">
          <div class="label">${t('hud.menu.campaignHub.missionNumber', { n: n + 1 })} · ${esc(getReleasedMission(missionId)?.subtitle ?? '')}</div>
          <b>${esc(title)}</b>
          <p>${esc(open ? missionBlurb(missionId) : t('hud.menu.campaignHub.missionLocked', { title: before ? missionTitle(before.missionId) : '' }))}</p>
        </div>
      `;
      if (open) {
        const play = document.createElement('button');
        play.type = 'button';
        play.className = completed ? 'ed-ghostbtn' : 'ed-primary';
        play.textContent = completed ? t('hud.menu.campaignHub.replay') : t('hud.menu.campaignHub.playShort');
        play.setAttribute(
          'aria-label',
          completed ? t('hud.menu.campaignHub.replayAria', { title }) : t('hud.menu.campaignHub.play', { title }),
        );
        play.addEventListener('click', () => a.onPlay(missionId));
        row.appendChild(play);
      }
      list.appendChild(row);
    });
  }
  select(selected);
}

let styled = false;

function ensureStyles(): void {
  if (styled) return;
  styled = true;
  const style = document.createElement('style');
  style.id = 'ed-series-menu-css';
  style.textContent = CSS;
  document.head.appendChild(style);
}

/** A stepped Andean fret, repeated as the gold band under the title. */
const BAND = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='12' viewBox='0 0 36 12'%3E%3Cpath d='M0 11h6V7h6V3h6v4h-3v4h9V7h-3V3h6v4h6v4h3' fill='none' stroke='%23e8c36a' stroke-width='1.4'/%3E%3C/svg%3E")`;

const CSS = /* css */ `
  .ed-epic { overflow: hidden; background: #05070a; }
  .ed-epic-bg { position: absolute; inset: -4%; background-size: cover; background-position: 60% 45%; animation: ed-epic-drift 48s ease-in-out infinite alternate; filter: saturate(1.08) contrast(1.05); }
  .ed-epic-shade { position: absolute; inset: 0; pointer-events: none; background:
    radial-gradient(ellipse at 70% 40%, transparent 0%, rgba(4,6,9,.18) 45%, rgba(4,6,9,.72) 100%),
    linear-gradient(90deg, rgba(4,6,9,.94) 0%, rgba(4,6,9,.7) 30%, rgba(4,6,9,0) 62%),
    linear-gradient(0deg, rgba(4,6,9,.9) 0%, rgba(4,6,9,0) 42%); }
  @keyframes ed-epic-drift { from { transform: scale(1.02) translate(0, 0); } to { transform: scale(1.1) translate(-2%, -1.5%); } }
  @keyframes ed-epic-rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
  @media (prefers-reduced-motion: reduce) { .ed-epic-bg, .ed-epic .ed-menu-shell > *, .ed-senda-card { animation: none !important; } }

  .ed-epic.ed-title-screen .ed-epic-shade { background: radial-gradient(ellipse at 50% 52%, rgba(4,6,9,.78) 0%, rgba(4,6,9,.55) 40%, rgba(4,6,9,.9) 100%); }
  .ed-epic .ed-title-card { z-index: 2; animation: ed-epic-rise 1.1s ease-out both; }
  .ed-epic .ed-title-card h1 { background: linear-gradient(180deg, #fff3cf 0%, #f0d48a 45%, #b9873a 100%); -webkit-background-clip: text; background-clip: text; color: transparent; filter: drop-shadow(0 6px 26px rgba(0,0,0,.85)); letter-spacing: 5px; }
  .ed-epic .ed-title-card .kicker { color: var(--gold); opacity: .85; letter-spacing: 7px; }
  .ed-epic .ed-title-card .sub { color: #d8d0bd; font-size: 15px; }
  .ed-epic .ed-title-card .ed-epic-band { margin: 6px auto 18px; -webkit-mask: linear-gradient(90deg, transparent, #000 25%, #000 75%, transparent); mask: linear-gradient(90deg, transparent, #000 25%, #000 75%, transparent); }
  .ed-epic.ed-menu-screen { align-items: stretch; justify-content: flex-start; }
  .ed-epic .ed-menu-shell { position: relative; z-index: 1; display: flex; flex-direction: column; justify-content: space-between; gap: 22px; width: min(640px, 56vw); padding: clamp(30px, 6vh, 72px) clamp(24px, 5vw, 76px) 26px; }
  .ed-epic .ed-menu-shell > * { animation: ed-epic-rise .9s ease-out both; }
  .ed-epic .ed-menu-shell > nav { animation-delay: .25s; }
  .ed-epic .ed-menu-shell > footer { animation-delay: .5s; }
  .ed-epic .ed-menu-kicker { color: var(--gold); opacity: .8; font-size: 11px; letter-spacing: 6px; }
  .ed-epic .ed-menu-title { display: flex; flex-direction: column; width: max-content; padding-right: .1em; margin: 6px 0 0; font-size: clamp(54px, 7.6vw, 112px); line-height: .86; letter-spacing: 4px;
    background: linear-gradient(180deg, #fff3cf 0%, #f0d48a 45%, #b9873a 100%); -webkit-background-clip: text; background-clip: text; color: transparent;
    filter: drop-shadow(0 6px 26px rgba(0,0,0,.85)) drop-shadow(0 0 30px rgba(232,195,106,.18)); }
  .ed-epic .ed-menu-title span { white-space: nowrap; }
  .ed-epic .ed-menu-title span:last-child { font-size: .62em; letter-spacing: .3em; margin-top: .16em; }
  .ed-epic-band { height: 12px; width: min(420px, 100%); margin: 18px 0 2px; background: ${BAND} repeat-x left center / 36px 12px; opacity: .75; -webkit-mask: linear-gradient(90deg, #000 60%, transparent); mask: linear-gradient(90deg, #000 60%, transparent); }
  .ed-epic .ed-menu-sub { max-width: 440px; margin: 12px 0 0; color: #d8d0bd; font-size: 14px; line-height: 1.65; text-shadow: 0 2px 10px rgba(0,0,0,.8); }
  .ed-epic .ed-menu-actions { max-width: 380px; gap: 4px; }
  .ed-epic .ed-menu-btn { padding: 13px 18px; font-size: 17px; background: linear-gradient(90deg, rgba(10,13,17,.78), rgba(10,13,17,.12)); }
  .ed-epic .ed-menu-btn.primary { background: linear-gradient(90deg, rgba(232,195,106,.3), rgba(232,195,106,.04)); box-shadow: inset 0 0 0 1px rgba(232,195,106,.25); }
  .ed-epic .ed-menu-footer { margin-top: 0; }

  .ed-senda-card { position: absolute; z-index: 1; right: clamp(20px, 4vw, 64px); bottom: clamp(26px, 6vh, 64px); width: min(360px, 32vw); border: 1px solid rgba(232,195,106,.34); border-radius: 8px; overflow: hidden;
    background: linear-gradient(180deg, rgba(10,13,17,.9), rgba(8,10,14,.82)); backdrop-filter: blur(6px); box-shadow: 0 24px 70px rgba(0,0,0,.6); animation: ed-epic-rise 1s .4s ease-out both; }
  .ed-senda-card .art, .ed-campaign-card .art { position: relative; background-size: cover; background-position: center; }
  .ed-senda-card .art { height: 140px; border-bottom: 1px solid rgba(232,195,106,.24); }
  .numeral { position: absolute; left: 16px; bottom: 6px; font-family: Georgia, serif; font-size: 44px; font-weight: 700; color: #f6e3ae; text-shadow: 0 3px 16px rgba(0,0,0,.9); letter-spacing: 2px; }
  .ed-senda-card .body { padding: 14px 18px 18px; }
  .ed-senda-card .side-kicker { color: var(--gold-dim); font-size: 10px; letter-spacing: 2.6px; text-transform: uppercase; }
  .ed-senda-card h3 { margin: 4px 0 8px; color: var(--gold); font-size: 21px; }
  .ed-senda-card .next { display: flex; flex-direction: column; gap: 2px; margin-bottom: 10px; }
  .ed-senda-card .next span { color: var(--text-dim); font-size: 10px; letter-spacing: 1.6px; text-transform: uppercase; }
  .ed-senda-card .next b { color: #f3e5bb; font-size: 16px; }
  .ed-senda-card .next em { color: var(--text-dim); font-size: 11px; font-style: normal; }
  .ed-senda-card .progress { height: 4px; border-radius: 2px; background: rgba(232,195,106,.16); overflow: hidden; margin: 8px 0 6px; }
  .ed-senda-card .progress i { display: block; height: 100%; background: linear-gradient(90deg, #b9873a, var(--gold)); }
  .ed-senda-card .side-meta { color: var(--text-dim); font-size: 10px; letter-spacing: .4px; }
  .ed-senda-card .chapters { display: flex; align-items: center; margin: 12px 0 14px; }
  .ed-senda-card .chapters i { flex: 1; height: 1px; background: rgba(232,195,106,.28); }
  .ed-senda-card .chapter { width: 30px; height: 30px; display: grid; place-items: center; border-radius: 50%; font-family: Georgia, serif; font-size: 11px; font-weight: 700; border: 1px solid rgba(232,195,106,.3); color: var(--gold-dim); background: rgba(10,13,17,.9); }
  .ed-senda-card .chapter.current { border-color: var(--gold); color: #14161a; background: var(--gold); box-shadow: 0 0 16px rgba(232,195,106,.45); }
  .ed-senda-card .chapter.open { border-color: var(--gold); color: var(--gold); }
  .ed-senda-card .chapter.locked { opacity: .45; }
  .ed-senda-card .ed-primary { width: 100%; padding: 12px 16px; }

  .ed-epic.ed-campaign-hub { align-items: stretch; justify-content: center; }
  .ed-epic .ed-campaign-panel { box-sizing: border-box; position: relative; z-index: 1; width: min(1240px, 96vw); max-height: none; height: 100%; overflow: auto; background: none; border: 0; box-shadow: none; display: flex; flex-direction: column; gap: 14px; padding: clamp(18px, 3vh, 40px) clamp(16px, 3vw, 40px); }
  .ed-epic.ed-campaign-hub .ed-epic-shade { background: radial-gradient(ellipse at 50% 30%, rgba(4,6,9,.45), rgba(4,6,9,.9) 75%), linear-gradient(0deg, rgba(4,6,9,.85), rgba(4,6,9,.35)); }
  .ed-epic .ed-campaign-head { align-items: flex-end; margin: 0; }
  .ed-epic .ed-campaign-head .ed-ghostbtn { border: 1px solid rgba(232,195,106,.45); color: var(--gold); padding: 9px 18px; background: rgba(8,10,14,.6); }
  .ed-epic .ed-campaign-head h2 { font-size: clamp(34px, 4.4vw, 56px); color: #f3e5bb; text-shadow: 0 4px 24px rgba(0,0,0,.8); margin: 4px 0; }
  .ed-epic .ed-campaign-head .sub { color: #d0c8b5; font-size: 13px; }
  .ed-senda-track { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; }
  .ed-epic .ed-campaign-card { position: relative; display: flex; flex-direction: column; overflow: hidden; pointer-events: auto; cursor: pointer; text-align: left; font: inherit; color: inherit; min-height: 0; padding: 0 0 14px; border: 1px solid rgba(232,195,106,.22); border-radius: 8px; background: linear-gradient(180deg, rgba(14,17,22,.92), rgba(8,10,14,.9)); transition: transform .2s, border-color .2s, box-shadow .2s; }
  .ed-epic .ed-campaign-card:hover:not([disabled]) { transform: translateY(-3px); border-color: rgba(232,195,106,.6); }
  .ed-epic .ed-campaign-card.selected { border-color: var(--campaign-accent, var(--gold)); box-shadow: 0 0 0 1px var(--campaign-accent, var(--gold)), 0 18px 50px rgba(0,0,0,.55), 0 0 30px rgba(232,195,106,.16); }
  .ed-epic .ed-campaign-card .art { height: clamp(88px, 14vh, 150px); margin-bottom: 10px; }
  .ed-epic .ed-campaign-card .badge { position: absolute; right: 10px; top: 10px; padding: 3px 8px; border-radius: 10px; font-size: 10px; letter-spacing: .8px; text-transform: uppercase; background: rgba(6,8,11,.78); color: var(--gold); border: 1px solid rgba(232,195,106,.35); }
  .ed-epic .ed-campaign-card .era, .ed-epic .ed-campaign-card h3, .ed-epic .ed-campaign-card p, .ed-epic .ed-campaign-card .card-meta { padding: 0 16px; }
  .ed-epic .ed-campaign-card h3 { font-size: clamp(17px, 1.6vw, 22px); margin: 6px 0 4px; }
  .ed-epic .ed-campaign-card p { margin: 0 0 8px; }
  .ed-epic .ed-campaign-card .card-meta { display: block; margin-top: auto; color: var(--gold-dim); }
  .ed-epic .ed-campaign-card.locked { cursor: not-allowed; }
  .ed-epic .ed-campaign-card.locked .art { filter: grayscale(1) brightness(.45); }
  .ed-epic .ed-campaign-card.locked h3, .ed-epic .ed-campaign-card.locked p, .ed-epic .ed-campaign-card.locked .era, .ed-epic .ed-campaign-card.locked .numeral { opacity: .5; }
  .ed-epic .ed-campaign-card.locked .badge { color: var(--text-dim); border-color: rgba(255,255,255,.15); }
  .ed-epic .ed-campaign-card.done .badge { background: var(--gold); color: #14161a; }
  .ed-epic .ed-campaign-card::after { content: ''; position: absolute; inset: auto 0 0; height: 3px; background: var(--campaign-accent, var(--gold)); opacity: .9; }
  .ed-epic .ed-campaign-card .era { color: var(--campaign-accent, var(--gold-dim)); font-size: 10px; letter-spacing: 2px; text-transform: uppercase; }
  .ed-epic .ed-campaign-card h3 { color: #f0dfb7; }
  .ed-epic .ed-campaign-card p { color: var(--text-dim); font-size: 12px; line-height: 1.5; }
  .ed-epic .ed-campaign-card .card-meta { font-size: 10.5px; letter-spacing: .3px; line-height: 1.45; }

  .ed-senda-detail { display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); gap: clamp(16px, 2.4vw, 34px); padding: clamp(16px, 2.4vw, 28px); border: 1px solid rgba(232,195,106,.24); border-top: 3px solid var(--campaign-accent, var(--gold)); border-radius: 8px; background: linear-gradient(180deg, rgba(12,15,20,.92), rgba(8,10,14,.88)); backdrop-filter: blur(6px); animation: ed-epic-rise .5s ease-out both; }
  .ed-senda-detail .era { color: var(--campaign-accent, var(--gold)); font-size: 11px; letter-spacing: 2.4px; text-transform: uppercase; }
  .ed-senda-detail h3 { margin: 6px 0 10px; color: #f3e5bb; font-size: clamp(24px, 2.4vw, 32px); }
  .ed-senda-detail .story p { margin: 0 0 16px; color: #d4ccb9; font-size: 13.5px; line-height: 1.7; }
  .ed-senda-missions { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; position: relative; }
  .ed-senda-mission { display: grid; grid-template-columns: 34px minmax(0, 1fr) auto; align-items: center; gap: 14px; padding: 10px 12px; border-radius: 6px; background: rgba(232,195,106,.04); border: 1px solid rgba(232,195,106,.12); }
  .ed-senda-mission .node { width: 34px; height: 34px; display: grid; place-items: center; border-radius: 50%; font-family: Georgia, serif; font-weight: 700; border: 1px solid var(--gold); color: var(--gold); font-size: 14px; }
  .ed-senda-mission.done .node { background: var(--gold); color: #14161a; }
  .ed-senda-mission.locked { opacity: .55; }
  .ed-senda-mission.locked .node { border-color: rgba(255,255,255,.2); font-size: 12px; }
  .ed-senda-mission .label { color: var(--gold-dim); font-size: 10px; letter-spacing: 1.4px; text-transform: uppercase; }
  .ed-senda-mission b { display: block; color: #f0dfb7; font-family: Georgia, serif; font-size: 16px; margin: 2px 0; }
  .ed-senda-mission p { margin: 0; color: var(--text-dim); font-size: 12px; line-height: 1.5; }
  .ed-senda-mission.planned { background: transparent; border-style: dashed; border-color: rgba(232,195,106,.18); }
  .ed-senda-mission.planned .node { border-style: dashed; border-color: rgba(232,195,106,.35); color: var(--gold-dim); }
  .ed-senda-mission.planned b { color: #cfc2a3; }
  .ed-senda-mission.planned em { font-style: normal; color: var(--gold); }
  .ed-senda-mission .planned-tag { white-space: nowrap; padding: 4px 10px; border-radius: 999px; border: 1px dashed rgba(232,195,106,.35); color: var(--gold-dim); font-size: 10px; letter-spacing: 1.2px; text-transform: uppercase; }
  .ed-senda-mission .ed-primary, .ed-senda-mission .ed-ghostbtn { white-space: nowrap; padding: 8px 16px; font-size: 13px; }
  @media (max-width: 900px) {
    .ed-senda-track { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .ed-senda-detail { grid-template-columns: 1fr; }
    .ed-senda-card { position: relative; right: auto; bottom: auto; width: auto; margin: 0 24px 24px; }
    .ed-epic .ed-menu-shell { width: auto; }
    .ed-epic.ed-menu-screen { flex-direction: column; overflow: auto; }
  }
`;
