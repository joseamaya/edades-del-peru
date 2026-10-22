import type { Game } from '../core/Game';
import type { Unit } from '../entities/Unit';
import type { Building } from '../entities/Building';
import {
  Era,
  BuildingKind,
  UnitKind,
  OrderKind,
  RESOURCE_KEYS,
  Resources,
  ERA_COLORS,
  HistoricalPeriod,
} from '../core/types';
import { BUILDING_DEFS, BUILDING_INFO, getBuildingStats } from '../model/defs/buildings';
import { UNIT_ARCHETYPES, getUnitStats, UNIT_INFO, unitDisplayName, unitMinPeriod } from '../model/defs/units';
import { TECHS, techAvailable } from '../model/defs/techs';
import { ERA_DEFS } from '../model/defs/eras';
import { PERIODS, getPeriod } from '../model/defs/periods';
import { civsForPeriod, getCiv } from '../model/defs/civs';
import { RESOURCE_INFO, MAP_LABEL, GameSettings, CAMERA_SPEED_SCALE } from '../core/Config';
import { formatNumber, formatStat } from '../util/math';
import { MISSIONS, CAMPAIGN_TITLE, CAMPAIGN_SUBTITLE } from '../campaign/defs/campaign';
import { PROLOGUE, getEducational } from '../campaign/defs/educational';
import type { MissionDef } from '../campaign/types';
import { COMMANDERS, type PortraitId } from '../model/defs/commanders';
import { portraitSvg } from './Portrait';
import { DamageNumbers } from './DamageNumbers';
import { openCodex } from './Codex';
import { bus } from '../core/EventBus';
import { hasSave } from '../game/SaveGame';
import { hasReplay } from '../game/replay';

function escapeHtml(s: string): string {
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return s.replace(/[&<>"']/g, (c) => map[c]);
}

/** Player-buildable buildings (single list for all panels). */
const BUILDABLE_KINDS: BuildingKind[] = [
  BuildingKind.HOUSE,
  BuildingKind.FARM,
  BuildingKind.MILL,
  BuildingKind.MARKET,
  BuildingKind.BARRACKS,
  BuildingKind.ARSENAL,
  BuildingKind.STABLE,
  BuildingKind.FACTORY,
  BuildingKind.SAWMILL,
  BuildingKind.SMELTER,
  BuildingKind.REFINERY,
  BuildingKind.FORTRESS,
  BuildingKind.INSTITUTE,
  BuildingKind.WONDER,
];

const CSS = /* css */ `
  :root {
    --gold: #e8c36a;
    --gold-dim: #a8883f;
    --panel: rgba(20, 22, 26, 0.92);
    --panel-2: rgba(30, 33, 40, 0.9);
    --line: rgba(232, 195, 106, 0.28);
    --text: #e8e6e1;
    --text-dim: #a8a49a;
    --green: #5fd08a;
    --red: #e05a5a;
    --blue: #5aa8e8;
    /* Woven diamond band (inline SVG) used by the HUD textiles. */
    --weave: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='8' viewBox='0 0 16 8'%3E%3Cpath d='M0 8L8 0l8 8' fill='none' stroke='%23e8c36a' stroke-opacity='0.18'/%3E%3C/svg%3E");
  }
  #ui-root { position: fixed; inset: 0; pointer-events: none; z-index: 20; font-family: "Bahnschrift", "Arial Narrow", "Segoe UI", sans-serif; color: var(--text); user-select: none; }
  #ui-root h1, #ui-root h2, #ui-root h3, .ed-logo { font-family: Georgia, "Times New Roman", serif; letter-spacing: 1px; }
  #ui-root * { box-sizing: border-box; }
  .ed-btn { pointer-events: auto; }
  .ed-topbar { position: absolute; top: 0; left: 0; right: 0; height: 46px; display: flex; align-items: center; gap: 8px; padding: 6px 12px; background: linear-gradient(180deg, rgba(12,14,18,0.96), rgba(12,14,18,0.82)); border-bottom: 1px solid var(--line); overflow: hidden; }
  .ed-logo { font-weight: 700; font-size: 15px; letter-spacing: 2px; color: var(--gold); text-transform: uppercase; display: flex; align-items: center; gap: 8px; white-space: nowrap; flex-shrink: 0; }
  .ed-logo svg { width: 22px; height: 22px; }
  .ed-res { display: flex; align-items: center; gap: 5px; background: var(--panel-2); border: 1px solid var(--line); border-radius: 4px; padding: 3px 10px; font-size: 13px; font-weight: 600; min-width: 86px; flex-shrink: 0; }
  .ed-res .res-icon { font-size: 14px; }
  .ed-res .res-val { color: var(--text); }
  .ed-res.res-low .res-val { color: var(--red); }
  #ed-pop { display: flex; align-items: center; gap: 5px; font-size: 13px; white-space: nowrap; flex-shrink: 0; }
  #ed-era { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--gold); font-weight: 600; letter-spacing: 0.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 210px; flex-shrink: 1; }
  #ed-era .era-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .ed-spacer { flex: 1 1 auto; min-width: 0; }
  .ed-topbtn { pointer-events: auto; background: var(--panel-2); border: 1px solid var(--line); color: var(--text); border-radius: 4px; padding: 5px 10px; font-size: 12px; cursor: pointer; font-weight: 600; }
  .ed-topbtn:hover { border-color: var(--gold); color: var(--gold); }
  .ed-topbtn.active { border-color: var(--gold); color: var(--gold); background: rgba(232,195,106,0.12); }
  #ed-speed { display: flex; align-items: center; gap: 2px; }
  .speed-btn { pointer-events: auto; width: 26px; height: 26px; border-radius: 4px; border: 1px solid var(--line); background: var(--panel-2); color: var(--text); cursor: pointer; font-size: 12px; font-weight: 700; }
  .speed-btn.active { background: var(--gold); color: #14161a; border-color: var(--gold); }

  /* Minimapa */
  #ed-minimap-wrap { position: absolute; left: 12px; bottom: 12px; width: 210px; height: 210px; border: 1px solid var(--line); border-radius: 4px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.5); }
  #ed-minimap { width: 100%; height: 100%; display: block; cursor: crosshair; pointer-events: auto; }
  #ed-compass { position: absolute; inset: 0; pointer-events: none; font-size: 10px; font-weight: 700; letter-spacing: 0.5px; color: rgba(255,255,255,0.9); text-shadow: 0 1px 2px rgba(0,0,0,0.9); }
  #ed-compass span { position: absolute; padding: 1px 3px; border-radius: 2px; background: rgba(6,8,12,0.55); }
  #ed-compass .n { top: 3px; left: 50%; transform: translateX(-50%); color: var(--gold); }
  #ed-compass .e { top: 50%; right: 3px; transform: translateY(-50%); }
  #ed-compass .s { bottom: 3px; left: 50%; transform: translateX(-50%); }
  #ed-compass .w { top: 50%; left: 3px; transform: translateY(-50%); }

  /* Panel inferior */
  #ed-bottom { position: absolute; left: 50%; transform: translateX(-50%); bottom: 12px; width: min(720px, 92vw); min-height: 150px; background: var(--panel); border: 1px solid var(--line); border-radius: 6px; pointer-events: auto; display: flex; flex-direction: column; box-shadow: 0 6px 30px rgba(0,0,0,0.55); overflow: hidden; }
  #ed-bottom-header { padding: 6px 12px; font-size: 13px; font-weight: 700; border-bottom: 1px solid var(--line); display: flex; align-items: center; gap: 8px; background: rgba(232,195,106,0.06); background-image: var(--weave); background-repeat: repeat-x; background-position: bottom; }
  #ed-bottom-body { padding: 8px; display: flex; gap: 8px; min-height: 100px; }
  #ed-desc { flex: 1; font-size: 12px; color: var(--text-dim); line-height: 1.4; padding-right: 8px; }
  #ed-desc h3 { margin: 0 0 4px; font-size: 15px; color: var(--text); }
  .ed-grid { display: flex; flex-wrap: wrap; gap: 6px; max-width: 430px; }
  .ed-card { pointer-events: auto; width: 66px; height: 66px; border-radius: 4px; border: 1px solid var(--line); background: var(--panel-2); display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; font-size: 10px; text-align: center; position: relative; transition: border-color 0.12s, transform 0.06s; }
  .ed-card:hover { border-color: var(--gold); transform: translateY(-1px); }
  .ed-card .ic { font-size: 24px; line-height: 1; }
  .ed-card .nm { color: var(--text); margin-top: 3px; font-weight: 600; }
  .ed-card .cost { color: var(--text-dim); font-size: 9px; }
  .ed-card.disabled { opacity: 0.35; cursor: not-allowed; }
  .ed-card.afford { border-color: rgba(95,208,138,0.5); }
  .ed-card.cat-econ { border-left: 3px solid #6aa85a; }
  .ed-card.cat-mil { border-left: 3px solid #a85a5a; }
  .ed-card.cat-avance { border-left: 3px solid var(--gold); }
  .ed-card.cat-sel { border-left: 3px solid #5a9ad0; }
  .ed-card.progress { border-color: var(--gold); }
  .ed-card .progbar { position: absolute; bottom: 0; left: 0; height: 3px; background: var(--gold); width: 0%; }

  .ed-group { display: flex; gap: 6px; margin-top: 6px; }
  .ed-command { pointer-events: auto; border: 1px solid var(--line); background: var(--panel-2); color: var(--text); border-radius: 4px; padding: 5px 9px; font-size: 11px; cursor: pointer; font-weight: 600; }
  .ed-command:hover { border-color: var(--gold); color: var(--gold); }

  /* Toast */
  #ed-toasts { position: absolute; top: 56px; left: 50%; transform: translateX(-50%); display: flex; flex-direction: column; gap: 6px; align-items: center; }
  .ed-toast { padding: 8px 18px; border-radius: 4px; font-size: 13px; font-weight: 600; border: 1px solid; animation: toast-in 0.25s ease; box-shadow: 0 4px 18px rgba(0,0,0,0.4); }
  .ed-toast.info { background: rgba(20,30,60,0.95); border-color: var(--blue); color: var(--text); }
  .ed-toast.success { background: rgba(16,44,28,0.95); border-color: var(--green); color: var(--green); }
  .ed-toast.warning { background: rgba(60,44,10,0.95); border-color: var(--gold); color: var(--gold); }
  .ed-toast.error { background: rgba(60,16,16,0.95); border-color: var(--red); color: #ff9a9a; }
  .ed-toast.danger { background: rgba(60,10,10,0.97); border-color: var(--red); color: #ffb0b0; }
  @keyframes toast-in { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }

  /* Era banner */
  #ed-era-banner { position: absolute; top: 38%; left: 50%; transform: translate(-50%,-50%); text-align: center; opacity: 0; pointer-events: none; }
  #ed-era-banner.show { animation: banner 3.2s ease; }
  #ed-era-banner .years { font-size: 15px; letter-spacing: 4px; color: var(--gold-dim); text-transform: uppercase; }
  #ed-era-banner .name { font-size: 42px; font-weight: 800; color: var(--gold); text-shadow: 0 2px 20px rgba(232,195,106,0.5); letter-spacing: 2px; }
  @keyframes banner { 0% { opacity: 0; transform: translate(-50%,-50%) scale(1.08); } 12% { opacity: 1; transform: translate(-50%,-50%) scale(1); } 80% { opacity: 1; } 100% { opacity: 0; transform: translate(-50%,-50%) scale(0.98); } }

  /* Overlays */
  .ed-overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(6,8,12,0.82); backdrop-filter: blur(3px); pointer-events: auto; }
  .ed-overlay.hidden { display: none; }
  .ed-panel { width: min(520px, 92vw); background: linear-gradient(180deg, #16181d, #101216); border: 1px solid var(--line); border-radius: 8px; padding: 26px; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.7); }
  .ed-panel h2 { color: var(--gold); font-size: 26px; margin: 0 0 6px; letter-spacing: 1px; }
  .ed-panel .sub { color: var(--text-dim); font-size: 13px; margin-bottom: 18px; }
  .ed-panel .row { display: flex; gap: 10px; justify-content: center; margin: 8px 0; flex-wrap: wrap; }
  /* Andean identity: chakana divider and stepped-fret edge (inline SVG, no assets) */
  .ed-panel { position: relative; }
  .ed-panel::before { content: ''; display: block; width: 46px; height: 20px; margin: -6px auto 10px; background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M10 1h4v5h5v4h4v4h-4v4h-5v5h-4v-5H5v-4H1v-4h4V6h5z' fill='%23e8c36a' fill-opacity='0.55'/%3E%3C/svg%3E") center/contain no-repeat; }
  .ed-panel::after { content: ''; display: block; height: 6px; margin-top: 14px; background: var(--weave) repeat-x center; opacity: 0.8; }
  .ed-topbar::after { content: ''; position: absolute; left: 0; right: 0; bottom: -1px; height: 5px; pointer-events: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='6' viewBox='0 0 24 6'%3E%3Cpath d='M0 5h4V3h4v2h4V1h4v4h4V3h4' fill='none' stroke='%23e8c36a' stroke-opacity='0.28'/%3E%3C/svg%3E"); background-repeat: repeat-x; }
  .ed-commanders { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin: 4px 0 12px; }
  .ed-cmd-card { display: flex; align-items: center; gap: 8px; text-align: left; background: rgba(232,195,106,0.06); border: 1px solid var(--line); border-radius: 6px; padding: 7px 10px; min-width: 190px; max-width: 240px; }
  .ed-cmd-card .ed-portrait { flex: none; filter: drop-shadow(0 2px 6px rgba(0,0,0,0.5)); }
  .ed-cmd-info b { display: block; color: var(--gold); font-size: 13px; }
  .ed-cmd-info span { display: block; color: var(--text-dim); font-size: 11px; }
  .ed-cmd-info em { display: block; color: var(--gold-dim); font-size: 9px; font-style: normal; letter-spacing: .4px; margin-top: 2px; }
  .ed-field { display: flex; flex-direction: column; align-items: flex-start; font-size: 12px; color: var(--text-dim); gap: 3px; }
  .ed-field select, .ed-field input { pointer-events: auto; background: #0a0c10; border: 1px solid var(--line); color: var(--text); padding: 6px 8px; border-radius: 4px; font-size: 13px; min-width: 150px; }
  .ed-primary { pointer-events: auto; background: var(--gold); color: #14161a; border: none; padding: 10px 28px; font-size: 15px; font-weight: 800; border-radius: 4px; cursor: pointer; letter-spacing: 1px; }
  .ed-primary:hover { filter: brightness(1.1); }
  .ed-ghostbtn { pointer-events: auto; background: transparent; border: 1px solid var(--line); color: var(--text); padding: 8px 18px; border-radius: 4px; cursor: pointer; font-size: 13px; margin: 4px; }
  .ed-ghostbtn:hover { border-color: var(--gold); color: var(--gold); }

  /* Briefing / historical content */
  .ed-panel .ed-hist { text-align: left; font-size: 13px; line-height: 1.55; color: var(--text); white-space: pre-line; margin: 8px 0 10px; }
  .ed-meta { display: flex; flex-wrap: wrap; gap: 4px 16px; justify-content: center; margin: 6px 0 10px; font-size: 11px; color: var(--text-dim); }
  .ed-meta b { color: var(--gold); }
  .ed-sabias { text-align: left; font-size: 12px; line-height: 1.5; background: rgba(232,195,106,0.08); border-left: 3px solid var(--gold); padding: 8px 12px; border-radius: 4px; margin: 10px 0; }
  .ed-fuentes { text-align: left; margin: 10px 0 4px; }
  .ed-fuentes summary { cursor: pointer; color: var(--gold-dim); font-size: 12px; letter-spacing: 1px; text-transform: uppercase; }
  .ed-fuentes ul { margin: 8px 0 0; padding-left: 18px; }
  .ed-fuentes li { font-size: 12px; color: var(--text-dim); line-height: 1.5; margin: 3px 0; }
  .ed-fuentes a { color: var(--blue); }

  /* Codex */
  #ed-codex .ed-panel { width: min(780px, 94vw); max-height: 88vh; display: flex; flex-direction: column; }
  .ed-codex-tabs { display: flex; gap: 6px; justify-content: center; margin: 2px 0 12px; flex-wrap: wrap; }
  .ed-codex-tabs button { background: transparent; border: 1px solid var(--line); color: var(--text-dim); padding: 5px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; }
  .ed-codex-tabs button.active { color: #14161a; background: var(--gold); border-color: var(--gold); font-weight: 700; }
  .ed-codex-body { display: flex; gap: 14px; text-align: left; min-height: 300px; flex: 1; overflow: hidden; }
  .ed-codex-nav { width: 190px; flex-shrink: 0; overflow-y: auto; border-right: 1px solid var(--line); padding-right: 10px; }
  .ed-codex-nav button { display: block; width: 100%; text-align: left; background: transparent; border: none; color: var(--text-dim); padding: 6px 8px; border-radius: 4px; cursor: pointer; font-size: 12px; }
  .ed-codex-nav button:hover { color: var(--gold); background: rgba(232,195,106,0.07); }
  .ed-codex-nav button.active { color: var(--gold); background: rgba(232,195,106,0.12); }
  .ed-codex-content { flex: 1; overflow-y: auto; padding-right: 4px; font-size: 13px; line-height: 1.6; color: var(--text); }
  .ed-codex-content h3 { color: var(--gold); font-size: 17px; margin: 0 0 4px; }
  .ed-codex-content h4 { color: var(--gold-dim); font-size: 13px; margin: 14px 0 4px; }
  .ed-codex-content p { margin: 6px 0; }
  .ed-codex-content ul { margin: 6px 0; padding-left: 18px; }
  .ed-codex-content a { color: var(--blue); }
  .ed-codex-content .md-h1 { font-size: 16px; color: var(--gold); margin: 10px 0 6px; }
  .ed-codex-content .md-h2 { font-size: 14px; color: var(--gold-dim); margin: 12px 0 4px; }
  .ed-codex-content .md-h3 { font-size: 13px; color: var(--text); margin: 10px 0 3px; }

  /* Tutorial */
  #ed-tutorial { position: absolute; top: 92px; left: 50%; transform: translateX(-50%); width: min(440px, 82vw); background: rgba(12,16,24,0.95); border: 1px solid var(--gold); border-radius: 6px; padding: 12px 16px; box-shadow: 0 8px 30px rgba(0,0,0,0.6); display: none; pointer-events: auto; z-index: 5; }
  #ed-tutorial.show { display: block; animation: toast-in 0.3s ease; }
  #ed-tutorial .tut-head { display: flex; justify-content: space-between; align-items: center; font-size: 11px; letter-spacing: 2px; color: var(--gold-dim); text-transform: uppercase; }
  #ed-tutorial .tut-step { font-size: 14px; color: var(--text); line-height: 1.5; margin: 8px 0 6px; }
  #ed-tutorial .tut-actions { text-align: right; }
  .ed-hint-pulse { animation: hint-pulse 1.1s ease-in-out infinite; outline: 2px solid var(--gold) !important; outline-offset: 2px; border-radius: 4px; }
  @keyframes hint-pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(232,195,106,0.55); } 50% { box-shadow: 0 0 0 9px rgba(232,195,106,0); } }

  #ed-help { position: absolute; right: 12px; bottom: 12px; font-size: 11px; color: var(--text-dim); background: rgba(10,12,16,0.7); padding: 8px 12px; border-radius: 4px; border: 1px solid rgba(232,195,106,0.15); max-width: 220px; line-height: 1.5; }
  #ed-cursor { position: absolute; width: 20px; height: 20px; pointer-events: none; }
  .ed-error { color: var(--red); font-size: 12px; margin-top: 8px; min-height: 16px; }
  #ed-fps { position: absolute; top: 52px; right: 12px; font-size: 11px; color: var(--text-dim); background: rgba(0,0,0,0.4); padding: 2px 8px; border-radius: 3px; }
  /* Hide the in-game HUD while a modal menu is open */
  #ui-root.menu-open .ed-topbar,
  #ui-root.menu-open #ed-bottom,
  #ui-root.menu-open #ed-minimap-wrap,
  #ui-root.menu-open #ed-help,
  #ui-root.menu-open #ed-objectives,
  #ui-root.menu-open #ed-fps { display: none; }
  .ed-keys { display: grid; grid-template-columns: auto 1fr; gap: 4px 16px; font-size: 13px; color: var(--text-dim); text-align: left; }
  .ed-keys b { color: var(--gold); font-weight: 700; }

  /* Objectives panel (campaign) */
  #ed-objectives { position: absolute; top: 56px; right: 12px; width: 240px; background: var(--panel); border: 1px solid var(--line); border-radius: 6px; padding: 10px 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.5); }
  #ed-objectives h4 { margin: 0 0 8px; font-size: 12px; letter-spacing: 2px; color: var(--gold); text-transform: uppercase; }
  #ed-objectives .obj { display: flex; gap: 8px; align-items: flex-start; font-size: 12px; color: var(--text-dim); padding: 3px 0; line-height: 1.35; }
  #ed-objectives .obj .mark { min-width: 16px; text-align: center; color: var(--text-dim); }
  #ed-objectives .obj.done { color: var(--green); }
  #ed-objectives .obj.done .mark { color: var(--green); }
  #ed-objectives .obj.failed { color: var(--red); }
  #ed-objectives .obj.failed .mark { color: var(--red); }

  /* Commander dialogue box */
  #ed-dialogue { position: absolute; left: 50%; bottom: 190px; transform: translateX(-50%); width: min(560px, 86vw); background: rgba(12,14,18,0.92); border: 1px solid var(--line); border-left: 3px solid var(--gold); border-radius: 4px; padding: 10px 14px; opacity: 0; pointer-events: none; transition: opacity 0.25s ease; background-image: var(--weave); background-repeat: repeat-x; background-position: top; }
  #ed-dialogue.show { opacity: 1; }
  #ed-dialogue .who { font-size: 11px; letter-spacing: 1px; color: var(--gold); font-weight: 700; margin-bottom: 3px; }
  #ed-dialogue .txt { font-size: 13px; color: var(--text); line-height: 1.4; }
  #ed-dialogue { display: flex; align-items: center; gap: 10px; }
  #ed-dialogue .body { min-width: 0; }
  #ed-dialogue .pic:empty { display: none; }

  /* Hover tooltip and selection rectangle */
  #ed-hover { position: absolute; pointer-events: none; z-index: 60; background: rgba(10,12,16,0.94); border: 1px solid var(--line); border-left: 3px solid var(--gold); border-radius: 4px; padding: 6px 9px; font-size: 12px; color: var(--text); display: none; max-width: 240px; box-shadow: 0 4px 16px rgba(0,0,0,0.5); }
  #ed-hover .h-title { font-weight: 700; color: var(--gold); }
  #ed-hover .h-sub { color: var(--text-dim); margin-top: 2px; }
  #ed-selbox { position: absolute; pointer-events: none; z-index: 55; border: 1px solid rgba(106,208,106,0.9); background: rgba(106,208,106,0.12); display: none; }

  /* Damage numbers, contextual cursor and alerts */
  #ed-dmg-layer { position: absolute; inset: 0; pointer-events: none; z-index: 58; overflow: hidden; }
  .ed-dmg { position: absolute; left: 0; top: 0; font-weight: 800; text-shadow: 0 1px 3px rgba(0,0,0,0.95); pointer-events: none; white-space: nowrap; will-change: transform, opacity; }
  #ed-cursor { position: absolute; pointer-events: none; z-index: 62; display: none; font-size: 22px; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.85)); }
  #ed-alerts { position: absolute; top: 96px; right: 12px; width: 244px; display: flex; flex-direction: column; gap: 6px; z-index: 57; pointer-events: none; }
  .ed-alert { pointer-events: auto; cursor: pointer; background: rgba(12,14,18,0.92); border: 1px solid var(--line); border-left: 3px solid var(--gold); border-radius: 4px; padding: 6px 9px; font-size: 12px; color: var(--text); box-shadow: 0 4px 16px rgba(0,0,0,0.5); animation: alert-in 0.2s ease; }
  .ed-alert.warn { border-left-color: var(--red); }
  @keyframes alert-in { from { opacity: 0; transform: translateX(12px); } to { opacity: 1; transform: none; } }
`;

export class HUD {
  game: Game;
  private root: HTMLDivElement;
  private resEls: Record<string, HTMLElement> = {} as any;
  private popEl!: HTMLElement;
  private eraEl!: HTMLElement;
  private eraDot!: HTMLElement;
  private bottomEl!: HTMLElement;
  private bottomHeader!: HTMLElement;
  private descEl!: HTMLElement;
  private gridEl!: HTMLElement;
  private commandsEl!: HTMLElement;
  private toastsEl!: HTMLElement;
  private minimapCanvas!: HTMLCanvasElement;
  private minimapCtx!: CanvasRenderingContext2D;
  private bannerEl!: HTMLElement;
  private updateAcc = 0;
  private bottomKey = '';
  private objPanelEl!: HTMLElement;
  private objListEl!: HTMLElement;
  private dialogueEl!: HTMLElement;
  private dialogueTimer = 0;
  private hoverEl!: HTMLElement;
  private selBoxEl!: HTMLElement;
  private damage!: DamageNumbers;
  private cursorEl!: HTMLElement;
  private alertsEl!: HTMLElement;
  private alertPings: { x: number; z: number; until: number }[] = [];
  private tutorialEl!: HTMLElement;
  private tutorialStepEl!: HTMLElement;
  private tutorialCountEl!: HTMLElement;

  constructor(game: Game) {
    this.game = game;
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
    this.root = document.getElementById('ui-root') as HTMLDivElement;
    this.root.innerHTML = '';
    this.buildTopBar();
    this.buildBottom();
    this.buildMinimap();
    this.buildToasts();
    this.buildEraBanner();
    this.buildHelp();
    this.buildFps();
    this.buildObjectivesPanel();
    this.buildDialogue();
    this.buildTutorial();
    this.buildHover();
    this.buildDamageCursor();
    this.buildAlerts();
    bus.on('alert', (info) => this.pushAlert(info));
  }

  private buildHover(): void {
    this.selBoxEl = document.createElement('div');
    this.selBoxEl.id = 'ed-selbox';
    this.root.appendChild(this.selBoxEl);
    this.hoverEl = document.createElement('div');
    this.hoverEl.id = 'ed-hover';
    this.root.appendChild(this.hoverEl);
  }

  private buildDamageCursor(): void {
    const layer = document.createElement('div');
    layer.id = 'ed-dmg-layer';
    this.root.appendChild(layer);
    this.damage = new DamageNumbers(layer);
    this.cursorEl = document.createElement('div');
    this.cursorEl.id = 'ed-cursor';
    this.root.appendChild(this.cursorEl);
  }

  private buildAlerts(): void {
    this.alertsEl = document.createElement('div');
    this.alertsEl.id = 'ed-alerts';
    this.root.appendChild(this.alertsEl);
  }

  /** Floating damage/heal number at a world point. */
  addDamageNumber(x: number, y: number, z: number, amount: number, kind: 'normal' | 'big' | 'heal' = 'normal'): void {
    this.damage.spawn(x, y, z, amount, kind);
  }

  /** Contextual cursor: icon next to the mouse (null = normal cursor). */
  setCursor(icon: string | null, x: number, y: number): void {
    if (!icon) {
      this.cursorEl.style.display = 'none';
      return;
    }
    this.cursorEl.style.display = 'block';
    this.cursorEl.textContent = icon;
    this.cursorEl.style.left = x + 12 + 'px';
    this.cursorEl.style.top = y + 10 + 'px';
  }

  /** Clickable alert that centers the camera; blinks on the minimap. */
  pushAlert(info: { icon: string; text: string; x: number; z: number; warn?: boolean }): void {
    const el = document.createElement('div');
    el.className = 'ed-alert' + (info.warn ? ' warn' : '');
    el.innerHTML = `${info.icon} ${info.text}`;
    el.addEventListener('click', () => {
      this.game.camera.focusOn(info.x, info.z);
      el.remove();
    });
    this.alertsEl.prepend(el);
    while (this.alertsEl.children.length > 5) this.alertsEl.lastChild?.remove();
    this.alertPings.push({ x: info.x, z: info.z, until: performance.now() + 6000 });
    setTimeout(() => el.remove(), 9000);
  }

  /** Show/hide the tooltip of the entity or resource under the cursor. */
  setHover(info: { icon: string; title: string; detalle: string } | null, x: number, y: number): void {
    if (!info) {
      this.hoverEl.style.display = 'none';
      return;
    }
    this.hoverEl.style.display = 'block';
    this.hoverEl.innerHTML = `<div class="h-title">${info.icon} ${info.title}</div><div class="h-sub">${info.detalle}</div>`;
    const off = 16;
    this.hoverEl.style.left = Math.min(x + off, window.innerWidth - 250) + 'px';
    this.hoverEl.style.top = Math.min(y + off, window.innerHeight - 74) + 'px';
  }

  showSelectionBox(x1: number, y1: number, x2: number, y2: number): void {
    this.selBoxEl.style.display = 'block';
    this.selBoxEl.style.left = Math.min(x1, x2) + 'px';
    this.selBoxEl.style.top = Math.min(y1, y2) + 'px';
    this.selBoxEl.style.width = Math.abs(x2 - x1) + 'px';
    this.selBoxEl.style.height = Math.abs(y2 - y1) + 'px';
  }

  hideSelectionBox(): void {
    this.selBoxEl.style.display = 'none';
  }

  private el(tag: string, cls: string, parent?: HTMLElement): HTMLElement {
    const e = document.createElement(tag);
    e.className = cls;
    (parent ?? this.root).appendChild(e);
    return e;
  }

  private buildTopBar(): void {
    const top = this.el('div', 'ed-topbar');
    const logo = this.el('div', 'ed-logo');
    logo.innerHTML = `<svg viewBox="0 0 32 32" fill="none"><path d="M16 3l2.6 7.8L26 13l-7.4 2.2L16 23l-2.6-7.8L6 13l7.4-2.2z" fill="#e8c36a"/><path d="M16 18v9M12 27h8" stroke="#e8c36a" stroke-width="1.6"/></svg> EDADES DEL PERÚ`;
    top.appendChild(logo);
    for (const k of RESOURCE_KEYS) {
      const info = RESOURCE_INFO[k];
      const res = this.el('div', 'ed-res');
      res.id = 'ed-res-' + k;
      res.innerHTML = `<span class="res-icon">${info.icon}</span><span class="res-val">0</span>`;
      top.appendChild(res);
      this.resEls[k] = res;
    }
    this.popEl = this.el('div', '');
    this.popEl.id = 'ed-pop';
    this.popEl.innerHTML = `👥 <span>0/0</span>`;
    top.appendChild(this.popEl);
    this.eraEl = this.el('div', '');
    this.eraEl.id = 'ed-era';
    this.eraDot = this.el('span', 'era-dot');
    this.eraEl.appendChild(this.eraDot);
    this.eraEl.appendChild(this.el('span', ''));
    top.appendChild(this.eraEl);
    top.appendChild(this.el('div', 'ed-spacer'));
    const speed = this.el('div', '');
    speed.id = 'ed-speed';
    for (const s of [0.5, 1, 2, 3]) {
      const btn = this.el('button', 'speed-btn') as HTMLButtonElement;
      btn.textContent = s === 0.5 ? '½' : String(s) + '×';
      btn.addEventListener('click', () => {
        this.game.loop.speed = s;
        this.refreshSpeed();
      });
      if (s === 1) btn.classList.add('active');
      speed.appendChild(btn);
    }
    top.appendChild(speed);
    const pauseBtn = this.el('button', 'ed-topbtn') as HTMLButtonElement;
    pauseBtn.textContent = '⏸';
    pauseBtn.title = 'Pausa (P)';
    pauseBtn.addEventListener('click', () => this.game.togglePause());
    top.appendChild(pauseBtn);
    const menuBtn = this.el('button', 'ed-topbtn') as HTMLButtonElement;
    menuBtn.textContent = '☰ Menú';
    menuBtn.addEventListener('click', () => this.showPauseMenu());
    top.appendChild(menuBtn);
  }

  private refreshSpeed(): void {
    const btns = this.root.querySelectorAll<HTMLButtonElement>('#ed-speed .speed-btn');
    btns.forEach((b) =>
      b.classList.toggle('active', (b.textContent === '½' ? 0.5 : parseFloat(b.textContent!)) === this.game.loop.speed),
    );
  }

  private buildBottom(): void {
    const bottom = this.el('div', '');
    bottom.id = 'ed-bottom';
    // the command panel only appears with a selection (0 A.D.-style)
    bottom.style.display = 'none';
    this.bottomEl = bottom;
    this.bottomHeader = this.el('div', '');
    this.bottomHeader.id = 'ed-bottom-header';
    bottom.appendChild(this.bottomHeader);
    const body = this.el('div', '');
    body.id = 'ed-bottom-body';
    this.descEl = this.el('div', '');
    this.descEl.id = 'ed-desc';
    body.appendChild(this.descEl);
    this.gridEl = this.el('div', 'ed-grid');
    body.appendChild(this.gridEl);
    this.commandsEl = this.el('div', '');
    this.commandsEl.id = 'ed-commands';
    body.appendChild(this.commandsEl);
    bottom.appendChild(body);
  }

  private buildMinimap(): void {
    const wrap = this.el('div', '');
    wrap.id = 'ed-minimap-wrap';
    this.minimapCanvas = document.createElement('canvas');
    this.minimapCanvas.id = 'ed-minimap';
    this.minimapCanvas.width = 210;
    this.minimapCanvas.height = 210;
    wrap.appendChild(this.minimapCanvas);
    const compass = this.el('div', '');
    compass.id = 'ed-compass';
    compass.setAttribute('aria-hidden', 'true');
    compass.innerHTML =
      '<span class="n">N</span><span class="e">E</span><span class="s">S</span><span class="w">W</span>';
    wrap.appendChild(compass);
    this.minimapCtx = this.minimapCanvas.getContext('2d')!;
    const toWorld = (cx: number, cy: number): { x: number; z: number } => {
      const rect = this.minimapCanvas.getBoundingClientRect();
      const nx = (cx - rect.left) / rect.width;
      const ny = (cy - rect.top) / rect.height;
      const s = this.game.settings.mapSize;
      return { x: nx * s, z: ny * s };
    };
    this.minimapCanvas.addEventListener('contextmenu', (e) => e.preventDefault());
    // left click/drag = move the viewport; right click = move order
    this.minimapCanvas.addEventListener('mousedown', (e) => {
      if (e.button === 2) {
        const w = toWorld(e.clientX, e.clientY);
        this.game.commandMoveToWorld(w.x, w.z, e.ctrlKey || e.altKey);
        return;
      }
      if (e.button !== 0) return;
      const w = toWorld(e.clientX, e.clientY);
      this.game.camera.moveTo(w.x, w.z, true);
      const onMove = (ev: MouseEvent) => {
        const p = toWorld(ev.clientX, ev.clientY);
        this.game.camera.moveTo(p.x, p.z, true);
      };
      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    });
  }

  private buildToasts(): void {
    this.toastsEl = this.el('div', '');
    this.toastsEl.id = 'ed-toasts';
  }

  private buildObjectivesPanel(): void {
    this.objPanelEl = this.el('div', '');
    this.objPanelEl.id = 'ed-objectives';
    this.objPanelEl.style.display = 'none';
    this.objPanelEl.innerHTML = `<h4>🎯 Objetivos</h4>`;
    this.objListEl = this.el('div', '', this.objPanelEl);
  }

  private buildDialogue(): void {
    this.dialogueEl = this.el('div', '');
    this.dialogueEl.id = 'ed-dialogue';
    this.dialogueEl.innerHTML = `<div class="pic"></div><div class="body"><div class="who"></div><div class="txt"></div></div>`;
  }

  /** Character dialogue (commander/narrator) with auto-close. */
  showDialogue(name: string, text: string, duration = 5, portrait?: PortraitId): void {
    const pic = this.dialogueEl.querySelector('.pic') as HTMLElement;
    pic.innerHTML = portrait ? portraitSvg(COMMANDERS[portrait], 44) : '';
    this.dialogueEl.querySelector('.who')!.textContent = name;
    this.dialogueEl.querySelector('.txt')!.textContent = text;
    this.dialogueEl.classList.add('show');
    this.dialogueTimer = duration;
  }

  private buildTutorial(): void {
    this.tutorialEl = this.el('div', '');
    this.tutorialEl.id = 'ed-tutorial';
    this.tutorialEl.innerHTML = `<div class="tut-head"><span>🎓 Tutorial</span><span class="tut-count"></span></div><div class="tut-step"></div><div class="tut-actions"></div>`;
    this.tutorialStepEl = this.tutorialEl.querySelector('.tut-step') as HTMLElement;
    this.tutorialCountEl = this.tutorialEl.querySelector('.tut-count') as HTMLElement;
  }

  /** Show/update the tutorial panel. `onSkip` adds the skip button. */
  showTutorialStep(text: string, index: number, total: number, onSkip?: () => void): void {
    this.tutorialStepEl.textContent = text;
    this.tutorialCountEl.textContent = `Paso ${index + 1} / ${total}`;
    const actions = this.tutorialEl.querySelector('.tut-actions') as HTMLElement;
    actions.innerHTML = '';
    if (onSkip) {
      const skip = document.createElement('button');
      skip.className = 'ed-ghostbtn';
      skip.style.margin = '0';
      skip.textContent = 'Omitir tutorial';
      skip.addEventListener('click', onSkip);
      actions.appendChild(skip);
    }
    this.tutorialEl.classList.add('show');
  }

  hideTutorial(): void {
    this.tutorialEl.classList.remove('show');
    this.clearHudHighlight();
  }

  /** Highlight (with a pulse) a HUD element during the tutorial. */
  highlightHud(selector: string): void {
    this.clearHudHighlight();
    const target = this.root.querySelector(selector);
    if (target) target.classList.add('ed-hint-pulse');
  }

  clearHudHighlight(): void {
    this.root.querySelectorAll('.ed-hint-pulse').forEach((el) => el.classList.remove('ed-hint-pulse'));
  }

  private refreshObjectives(): void {
    const mis = this.game.mission;
    if (!mis) return;
    this.objPanelEl.style.display = 'block';
    const items = mis.activeObjectives;
    const titles = this.objectiveTitles(items.map(({ def }) => def));
    this.objListEl.innerHTML = items
      .map(({ state }, i) => {
        const mark = state === 'completed' ? '✔' : state === 'failed' ? '✖' : '○';
        const cls = state === 'completed' ? 'done' : state === 'failed' ? 'failed' : '';
        return `<div class="obj ${cls}"><span class="mark">${mark}</span><span>${titles[i]}</span></div>`;
      })
      .join('');
  }

  /** Titles with a leading "o" for alternatives and a suffix for bonus objectives. */
  private objectiveTitles(objs: { title: string; group?: string; optional?: boolean }[]): string[] {
    const seen = new Set<string>();
    return objs.map((o) => {
      let t = o.title;
      if (o.group) {
        if (seen.has(o.group)) t = 'o ' + t;
        seen.add(o.group);
      }
      if (o.optional) t += ' (opcional)';
      return t;
    });
  }

  private buildEraBanner(): void {
    this.bannerEl = this.el('div', '');
    this.bannerEl.id = 'ed-era-banner';
    this.bannerEl.innerHTML = `<div class="years"></div><div class="name"></div>`;
  }

  private buildHelp(): void {
    const help = this.el('div', '');
    help.id = 'ed-help';
    help.innerHTML = `<b>Atajos</b><br>Clic izq: seleccionar · arrastra: área<br>Clic der: orden · Ctrl+der: atacar-mover<br>Shift: cola/rally · Ctrl+1-9: grupo · 1-9: recuperar<br>Minimapa: arrastra para mover · clic der: orden<br>Rueda: zoom · Q/E: rotar (opcional) · H/F/G/V: edificios · P: pausa`;
  }

  private buildFps(): void {
    const fps = this.el('div', '');
    fps.id = 'ed-fps';
    fps.textContent = '60 FPS';
    fps.style.display = 'none';
    this.fpsEl = fps;
  }
  private fpsEl!: HTMLElement;
  private showFps = false;

  /** Debug performance overlay (enabled with `?fps=1`; see `main.ts`). */
  setShowFps(on: boolean): void {
    this.showFps = on;
    this.fpsEl.style.display = on ? '' : 'none';
  }

  showToast(msg: string, type: 'info' | 'success' | 'warning' | 'error' | 'danger' = 'info'): void {
    const t = this.el('div', 'ed-toast ' + type);
    t.textContent = msg;
    this.toastsEl.appendChild(t);
    setTimeout(() => {
      t.style.transition = 'opacity 0.4s';
      t.style.opacity = '0';
      setTimeout(() => t.remove(), 400);
    }, 2600);
  }

  showEraBanner(era: Era): void {
    const def = ERA_DEFS[era];
    this.bannerEl.querySelector('.years')!.textContent = def.years;
    this.bannerEl.querySelector('.name')!.textContent = def.name;
    this.bannerEl.classList.remove('show');
    void (this.bannerEl as HTMLElement).offsetWidth;
    this.bannerEl.classList.add('show');
  }

  setPaused(p: boolean): void {
    const existing = document.getElementById('ed-paused');
    if (existing) existing.remove();
    if (!p) return;
    const ov = this.el('div', 'ed-overlay');
    ov.id = 'ed-paused';
    const panel = this.el('div', 'ed-panel', ov);
    panel.innerHTML = `<h2 style="color:var(--gold)">⏸ PAUSA</h2><div class="sub">La partida está detenida</div>`;
    const row = this.el('div', 'row', panel);
    const resume = this.el('button', 'ed-primary', row);
    resume.textContent = '▶ Reanudar';
    resume.addEventListener('click', () => this.game.togglePause());
    const save = this.el('button', 'ed-ghostbtn', row);
    save.textContent = '💾 Guardar partida';
    save.addEventListener('click', () => {
      if (this.game.saveMatch()) this.showToast('Partida guardada', 'success');
      else this.showToast('No se pudo guardar la partida', 'error');
    });
    const settings = this.el('button', 'ed-ghostbtn', row);
    settings.textContent = '⚙️ Opciones';
    settings.addEventListener('click', () => this.showOptions());
    const home = this.el('button', 'ed-ghostbtn', row);
    home.textContent = '🏠 Menú principal';
    home.addEventListener('click', () => {
      this.game.saveRecording();
      location.href = location.pathname;
    });
    const quit = this.el('button', 'ed-ghostbtn', row);
    quit.textContent = '🏳 Abandonar';
    quit.addEventListener('click', () => this.abandonMatch());
  }

  /** True if a modal menu is open (other than the pause panel). */
  hasBlockingOverlay(): boolean {
    return [...this.root.querySelectorAll('.ed-overlay')].some(
      (o) => o.id !== 'ed-paused' && !o.classList.contains('hidden'),
    );
  }

  /**
   * True if the pointer is over a HUD control (not the game view). `#ui-root` is
   * `pointer-events:none` and only real controls set `auto`, so any element under
   * the cursor that lives in the HUD is a control (0 A.D.-style edge guard).
   */
  isPointerOverUi(x: number, y: number): boolean {
    const el = document.elementFromPoint(x, y);
    return !!el && this.root.contains(el);
  }

  showVictory(victory: boolean, winText?: string, loseText?: string): void {
    this.game.loop.stop();
    this.clearOverlays();
    const ov = this.el('div', 'ed-overlay');
    const panel = this.el('div', 'ed-panel', ov);
    const p = this.game.players[0];
    const mis = this.game.mission?.def;
    const edu = mis ? getEducational(mis.id) : undefined;
    const title = victory ? '🏆 ¡VICTORIA!' : '💀 DERROTA';
    const sub =
      winText && loseText
        ? victory
          ? winText
          : loseText
        : victory
          ? 'Tu imperio se alza sobre las ruinas del enemigo.'
          : 'Tu civilización ha caído ante el avance enemigo.';
    const epilogue =
      victory && edu?.epilogue
        ? `<div class="ed-hist"><b style="color:var(--gold)">Epílogo.</b> ${edu.epilogue}</div>
           <div class="ed-note" style="font-size:12px;color:var(--text-dim);margin-bottom:12px">
             Puedes ampliar el contexto y las fuentes en el Códice desde el menú.
           </div>`
        : '';
    panel.innerHTML = `
      <h2 style="color:${victory ? 'var(--green)' : 'var(--red)'}">${title}</h2>
      <div class="sub" style="white-space:pre-line;line-height:1.6">${sub}</div>
      ${epilogue}
      <div style="font-size:13px;color:var(--text-dim);line-height:1.7;margin-bottom:16px">
        Bajas infligidas: <b>${p?.kills ?? 0}</b><br>
        Unidades creadas: <b>${p?.stats.created ?? 0}</b><br>
        Periodo: <b>${getPeriod(this.game.settings.period).name}</b>
      </div>
    `;
    const row = this.el('div', 'row', panel);
    const again = this.el('button', 'ed-primary', row);
    again.textContent = '↻ Jugar de nuevo';
    again.addEventListener('click', () => this.game.resetGame());
    const menu = this.el('button', 'ed-ghostbtn', row);
    menu.textContent = 'Menú principal';
    menu.addEventListener('click', () => {
      location.href = location.pathname + '?menu=1';
    });
  }

  /** Leave the match (respects the active campaign). */
  abandonMatch(): void {
    this.game.saveRecording();
    if (this.game.mission) {
      (this.game as any).missionEnd(false);
    } else {
      this.game.loop.stop();
      this.showVictory(false);
    }
  }

  // --- panels ---

  private setDesc(icon: string, title: string, subtitle: string): void {
    this.descEl.innerHTML = `<h3>${icon} ${title}</h3><div>${subtitle}</div>`;
  }

  private clearGrid(): void {
    this.gridEl.innerHTML = '';
  }

  private addCard(
    icon: string,
    name: string,
    costText: string,
    onClick: () => void,
    opts: { disabled?: boolean; afford?: boolean; cat?: string; progress?: number } = {},
  ): HTMLElement {
    const card = this.el(
      'div',
      'ed-card' +
        (opts.disabled ? ' disabled' : '') +
        (opts.afford ? ' afford' : '') +
        (opts.cat ? ' cat-' + opts.cat : ''),
    );
    card.innerHTML = `<span class="ic">${icon}</span><span class="nm">${name}</span><span class="cost">${costText}</span>`;
    if (opts.progress !== undefined) {
      card.classList.add('progress');
      card.innerHTML += `<div class="progbar" style="width:${Math.round(opts.progress * 100)}%"></div>`;
    }
    // pointerdown (not click): the panel may rebuild and would lose the click
    if (!opts.disabled) {
      card.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        this.game.audio.uiClick();
        onClick();
      });
    }
    this.gridEl.appendChild(card);
    return card;
  }

  private addCommand(label: string, onClick: () => void, title = ''): void {
    const btn = this.el('button', 'ed-command') as HTMLButtonElement;
    btn.textContent = label;
    btn.title = title;
    btn.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      onClick();
    });
    this.commandsEl.appendChild(btn);
  }

  private costText(cost: Partial<Resources>): string {
    const parts: string[] = [];
    for (const k of RESOURCE_KEYS) {
      if (cost[k] && cost[k]! > 0) parts.push(`${RESOURCE_INFO[k].icon}${cost[k]}`);
    }
    return parts.join(' ');
  }

  private canAfford(cost: Partial<Resources>): boolean {
    const p = this.game.players[0];
    for (const k of RESOURCE_KEYS) {
      if (p.resources[k] < (cost[k] ?? 0)) return false;
    }
    return true;
  }

  private renderBottom(): void {
    const units = this.game.getSelectedUnits();
    const building = this.game.getSelectedBuilding();
    // the command panel only appears with a selection (0 A.D.-style)
    if (units.length === 0 && !building) {
      this.bottomEl.style.display = 'none';
      return;
    }
    this.bottomEl.style.display = '';
    this.commandsEl.innerHTML = '';

    if (units.length > 0) {
      this.renderUnitPanel(units);
    } else if (building && building.owner === 0) {
      this.renderBuildingPanel(building);
    } else if (building && building.owner !== 0) {
      this.setDesc(
        '🏰',
        BUILDING_INFO[building.kind].name,
        `Base enemiga · HP ${Math.ceil(building.hp)}/${Math.ceil(building.maxHp)}`,
      );
      this.clearGrid();
      this.addCommand('⚔️ Atacar', () => this.orderAttackBuilding(building.id));
    }
  }

  /**
   * Rebuild the bottom panel only if its structure changed. Avoids recreating the nodes on
   * every tick (which used to lose card clicks) and the flicker.
   */
  private renderBottomIfChanged(): void {
    const key = this.bottomSignature();
    if (key === this.bottomKey) return;
    this.bottomKey = key;
    this.renderBottom();
  }

  /** Cheap signature of the state affecting the bottom panel (selection, queue, era, resources). */
  private bottomSignature(): string {
    const units = this.game.getSelectedUnits();
    const building = this.game.getSelectedBuilding();
    const p = this.game.players[0];
    // resource bucket to refresh availability (afford) without recreating each frame
    const res = p ? RESOURCE_KEYS.map((k) => Math.floor(p.resources[k] / 25)).join(',') : '';
    const tail = '|e:' + (p?.era ?? 0) + '|res:' + res;
    if (units.length > 0) {
      const ids = units
        .map((u) => u.id)
        .sort((a, b) => a - b)
        .join(',');
      return 'u:' + ids + tail;
    }
    if (building) {
      if (building.owner !== 0) return 'enemy:' + building.id + tail;
      return (
        'b:' +
        building.id +
        ':' +
        (building.constructionComplete ? 1 : 0) +
        ':q' +
        building.productionQueue.map((q) => q.unit).join(',') +
        ':r' +
        building.researchQueue.map((q) => q.tech).join(',') +
        tail
      );
    }
    return 'idle' + tail;
  }

  /** Update the bottom panel progress bars in place (without recreating nodes). */
  private updateBottomProgress(): void {
    const b = this.game.getSelectedBuilding();
    if (!b || b.owner !== 0) return;
    const buildBar = this.gridEl.querySelector('[data-build-card] .progbar') as HTMLElement | null;
    if (buildBar) {
      const pct = Math.round(b.buildRatio * 100);
      buildBar.style.width = pct + '%';
      const cost = buildBar.parentElement?.querySelector('.cost');
      if (cost) cost.textContent = `${pct}%`;
    }
    this.gridEl.querySelectorAll('[data-prod-idx]').forEach((el) => {
      const idx = Number((el as HTMLElement).dataset.prodIdx);
      const item = b.productionQueue[idx];
      if (!item) return;
      const pct = Math.round(item.progress * 100);
      const bar = el.querySelector('.progbar') as HTMLElement | null;
      if (bar) bar.style.width = pct + '%';
      const cost = el.querySelector('.cost');
      if (cost) cost.textContent = `${pct}% ✖`;
    });
  }

  private renderUnitPanel(units: Unit[]): void {
    const first = units[0];
    const info = UNIT_INFO[first.kind];
    const civ = this.game.players[first.owner]?.civ;
    this.setDesc(info.icon, `${unitDisplayName(first.kind, civ)} ×${units.length}`, this.unitDesc(first));
    this.clearGrid();
    // summary by type (click = select only that type) — AoE2 style
    if (units.length > 1) {
      const groups = new Map<UnitKind, number>();
      for (const u of units) groups.set(u.kind, (groups.get(u.kind) ?? 0) + 1);
      for (const [kind, count] of groups) {
        const gi = UNIT_INFO[kind];
        this.addCard(
          gi.icon,
          `${count}× ${unitDisplayName(kind, this.game.players[first.owner]?.civ)}`,
          'clic: filtrar',
          () => this.game.selectUnits(units.filter((u) => u.kind === kind).map((u) => u.id)),
          { cat: 'sel' },
        );
      }
    }
    if (units.length > 0 && units.every((u) => u.kind === UnitKind.WORKER)) {
      for (const kind of BUILDABLE_KINDS) {
        if (!this.game.canBuildKind(kind)) continue;
        const stats = getBuildingStats(kind, this.game.players[0].era);
        const infoB = BUILDING_INFO[kind];
        this.addCard(infoB.icon, infoB.name, this.costText(stats.cost), () => this.game.startPlacement(kind), {
          afford: this.canAfford(stats.cost),
          cat: 'econ',
        });
      }
    }
    this.addCommand('⛔ Detener', () => this.orderStop(), 'S');
    this.addCommand('🦅 Atacar-mover', () => this.orderAttackMove(), 'Ctrl+botón derecho');
    this.addCommand('🛡️ Defensivo', () => this.orderStance('defensivo'));
    this.addCommand('⭕ Patrullar', () => this.orderPatrol());
  }

  private unitDesc(u: Unit): string {
    const stats = u.stats;
    return `HP ${Math.ceil(u.hp)}/${Math.ceil(u.maxHp)} · Daño ${formatStat(stats.attack)} · Rango ${formatStat(stats.range)} · Blindaje ${formatStat(stats.heavyArmor)}`;
  }

  private renderBuildingPanel(b: Building): void {
    const info = BUILDING_INFO[b.kind];
    const def = BUILDING_DEFS[b.kind];
    this.setDesc(info.icon, info.name, this.buildingDesc(b));
    this.clearGrid();

    if (!b.constructionComplete) {
      const buildCard = this.addCard('🔨', 'En construcción', `${Math.round(b.buildRatio * 100)}%`, () => {}, {
        disabled: true,
        progress: b.buildRatio,
      });
      buildCard.dataset.buildCard = '1';
      return;
    }

    // production queue (click the card to cancel)
    for (let i = 0; i < b.productionQueue.length; i++) {
      const item = b.productionQueue[i];
      const uInfo = UNIT_INFO[item.unit];
      const card = this.addCard(
        uInfo.icon,
        unitDisplayName(item.unit, this.game.players[b.owner]?.civ),
        `${Math.round(item.progress * 100)}% ✖`,
        () => this.game.executeCommand({ kind: 'cancel', buildingId: b.id, index: i }),
        {
          progress: item.progress,
          cat: 'mil',
        },
      );
      card.dataset.prodIdx = String(i);
    }

    // train units
    const allowedUnits = this.game.mission?.def.allowedUnits;
    for (const unitKind of def.trainable ?? []) {
      if (allowedUnits && !allowedUnits.includes(unitKind)) continue;
      const stats = getUnitStats(unitKind, b.era);
      const uInfo = UNIT_INFO[unitKind];
      const unitName = unitDisplayName(unitKind, this.game.players[b.owner]?.civ);
      const tech = UNIT_ARCHETYPES[unitKind].requiresTech?.[0];
      const techOk = !tech || this.game.players[0].techs.has(tech);
      const eraOk = !!UNIT_ARCHETYPES[unitKind].eraModel[this.game.players[0].era];
      const periodOk = unitMinPeriod(unitKind) <= this.game.settings.period;
      const fortOk = !UNIT_ARCHETYPES[unitKind].requiresFortress || b.kind === BuildingKind.FORTRESS;
      const disabled = !techOk || !eraOk || !periodOk || !fortOk || !this.canAfford(stats.cost);
      this.addCard(uInfo.icon, unitName, this.costText(stats.cost), () => this.trainUnit(b.id, unitKind), {
        disabled,
        afford: !disabled && this.canAfford(stats.cost),
        cat: 'mil',
      });
    }

    // technologies (institute)
    const techs = TECHS.filter(
      (t) =>
        t.building === b.kind &&
        techAvailable(t, this.game.settings.period, this.game.players[b.owner]?.civ) &&
        !this.game.players[0].techs.has(t.id) &&
        (!t.requirements || t.requirements.every((r) => this.game.players[0].techs.has(r))),
    );
    for (const t of techs) {
      const disabled = !this.canAfford(t.cost);
      this.addCard(t.icon ?? '📚', t.name, this.costText(t.cost), () => this.researchTech(b.id, t.id), {
        disabled,
        afford: !disabled,
        cat: 'advance',
      });
    }

    // build more (if center, house, etc.)
    if (b.kind === BuildingKind.CENTER) {
      this.addCard(
        '🏠',
        'Vivienda',
        this.costText(getBuildingStats(BuildingKind.HOUSE, b.era).cost),
        () => this.game.startPlacement(BuildingKind.HOUSE),
        { cat: 'econ' },
      );
      this.addCard(
        '🌽',
        'Granja',
        this.costText(getBuildingStats(BuildingKind.FARM, b.era).cost),
        () => this.game.startPlacement(BuildingKind.FARM),
        { cat: 'econ' },
      );
    }

    this.addCommand('📍 Punto de reunión', () =>
      this.game.hud.showToast('Usa Shift+Botón derecho en el suelo', 'info'),
    );
    if (b.garrisonedIds.length > 0) {
      this.addCommand(`🚪 Desembarcar (${b.garrisonedIds.length})`, () => this.ungarrison(b.id));
    }
  }

  private buildingDesc(b: Building): string {
    const stats = b.stats;
    let s = `HP ${Math.ceil(b.hp)}/${Math.ceil(b.maxHp)} · Blindaje ${formatStat(stats.armor)}`;
    if (b.constructionComplete && b.productionQueue.length > 0) {
      s += ` · Entrenando: ${unitDisplayName(b.productionQueue[0].unit, this.game.players[b.owner]?.civ)}`;
    }
    if (b.isFarm && b.constructionComplete) {
      const mult = this.game.farmYieldAt(b.pos.x, b.pos.z);
      s += ` · Reserva de alimentos: ${Math.ceil(b.foodAmount)}`;
      if (mult > 1.001) s += ` · +${Math.round((mult - 1) * 100)}% por el terreno`;
    }
    return s;
  }

  private trainUnit(buildingId: number, unit: UnitKind): void {
    const b = this.game.buildings.get(buildingId);
    if (!b) return;
    const stats = getUnitStats(unit, b.era);
    const p = this.game.players[0];
    if (p.populationUsed + stats.population > p.populationCap) {
      this.showToast('Población máxima alcanzada', 'warning');
      return;
    }
    if (!this.game.executeCommand({ kind: 'train', buildingId, unit })) {
      this.showToast('Recursos insuficientes', 'error');
    }
  }

  private researchTech(buildingId: number, techId: string): void {
    if (!this.game.executeCommand({ kind: 'research', buildingId, tech: techId })) {
      this.showToast('Recursos insuficientes', 'error');
    }
  }

  private ungarrison(buildingId: number): void {
    this.game.executeCommand({ kind: 'ungarrison', buildingId });
  }

  // --- commands ---

  private orderStop(): void {
    const ids = this.game.getSelectedUnits().map((u) => u.id);
    if (ids.length) this.game.executeCommand({ kind: 'stop', unitIds: ids });
  }

  private orderAttackMove(): void {
    const units = this.game.getSelectedUnits();
    if (units.length === 0) return;
    const u = units[0];
    const target = { x: u.pos.x + Math.cos(u.yaw) * 10, z: u.pos.z + Math.sin(u.yaw) * 10 };
    this.game.executeCommand({
      kind: 'order',
      unitIds: units.map((s) => s.id),
      order: { kind: OrderKind.ATTACK_MOVE, target },
      clear: true,
    });
  }

  private orderStance(stance: 'agresivo' | 'defensivo' | 'pasivo'): void {
    const ids = this.game.getSelectedUnits().map((u) => u.id);
    if (ids.length) this.game.executeCommand({ kind: 'stance', unitIds: ids, stance });
    this.showToast(`Postura: ${stance}`, 'info');
  }

  private orderPatrol(): void {
    const units = this.game.getSelectedUnits();
    if (units.length === 0) return;
    for (const u of units) {
      const target = { x: u.pos.x + Math.cos(u.yaw) * 14, z: u.pos.z + Math.sin(u.yaw) * 14 };
      this.game.executeCommand({
        kind: 'order',
        unitIds: [u.id],
        order: { kind: OrderKind.PATROL, target },
        clear: true,
      });
    }
  }

  private orderAttackBuilding(id: number): void {
    const ids = this.game.getSelectedUnits().map((u) => u.id);
    if (ids.length) {
      this.game.executeCommand({
        kind: 'order',
        unitIds: ids,
        order: { kind: OrderKind.ATTACK, entityId: id },
        clear: true,
      });
    }
  }

  // --- minimap ---

  private minimapBg: HTMLCanvasElement | null = null;
  private minimapSeed = -1;

  private renderMinimap(): void {
    const ctx = this.minimapCtx;
    const s = this.game.settings.mapSize;
    const w = 210;
    const t = this.game.terrain;
    const fow = this.game.fow;
    const fogOn = this.game.settings.fogOfWar;

    // cached terrain background (only regenerated if the seed changes)
    if (!this.minimapBg || this.minimapSeed !== this.game.settings.mapSeed) {
      this.minimapSeed = this.game.settings.mapSeed;
      this.minimapBg = document.createElement('canvas');
      this.minimapBg.width = this.minimapBg.height = w;
      const bctx = this.minimapBg.getContext('2d')!;
      for (let y = 0; y < w; y++) {
        for (let x = 0; x < w; x++) {
          const wx = (x / w) * s;
          const wz = (y / w) * s;
          const h = t.getHeight(wx, wz);
          let c: string;
          if (t.isWater(wx, wz)) c = 'rgba(30,80,120,0.9)';
          else if (h > 9) c = 'rgba(150,145,140,0.95)';
          else if (h > 5) c = 'rgba(110,120,90,0.95)';
          else if (t.isBeach(wx, wz)) c = 'rgba(200,180,130,0.95)';
          else c = 'rgba(90,120,70,0.95)';
          bctx.fillStyle = c;
          bctx.fillRect(x, y, 1, 1);
        }
      }
    }
    ctx.drawImage(this.minimapBg, 0, 0);

    // fog on the minimap (unexplored areas in black)
    if (fogOn) {
      const step = 2;
      for (let y = 0; y < w; y += step) {
        for (let x = 0; x < w; x += step) {
          if (fow.isExplored((x / w) * s, (y / w) * s)) continue;
          ctx.fillStyle = 'rgba(4,4,8,0.92)';
          ctx.fillRect(x, y, step, step);
        }
      }
    }

    // resources
    for (const n of this.game.resourceNodes.values()) {
      if (n.dead) continue;
      if (fogOn && !fow.isExplored(n.pos.x, n.pos.z)) continue;
      ctx.fillStyle =
        n.resource === 'wood'
          ? '#3a7a2a'
          : n.resource === 'silver'
            ? '#b0b8c4'
            : n.resource === 'stone'
              ? '#e8b54a'
              : '#7a5a3a';
      ctx.fillRect((n.pos.x / s) * w, (n.pos.z / s) * w, 2, 2);
    }
    // buildings
    for (const b of this.game.buildings.values()) {
      if (b.dead) continue;
      const vis = !fogOn || fow.isExplored(b.pos.x, b.pos.z);
      if (!vis) continue;
      const visibleNow = !fogOn || fow.isVisible(b.pos.x, b.pos.z);
      ctx.fillStyle = b.owner === 0 ? '#4a8a4a' : visibleNow ? '#c03a3a' : 'rgba(110,110,110,0.6)';
      ctx.fillRect((b.pos.x / s) * w - 1, (b.pos.z / s) * w - 1, 3, 3);
    }
    // units: only own ones and currently visible enemy ones
    for (const u of this.game.units.values()) {
      if (u.dead) continue;
      if (fogOn) {
        if (u.owner === 0) {
          if (!fow.isVisible(u.pos.x, u.pos.z)) continue;
        } else if (!fow.isVisible(u.pos.x, u.pos.z)) {
          continue;
        }
      }
      ctx.fillStyle = u.owner === 0 ? '#6ad06a' : '#e05a5a';
      ctx.fillRect((u.pos.x / s) * w - 0.5, (u.pos.z / s) * w - 0.5, 1.5, 1.5);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.strokeRect(0, 0, w, w);
    // Camera footprint: rotate with the camera, but keep the minimap north-up.
    const quad = this.game.camera.getGroundQuad();
    const points = quad.map((p) => ({ x: (p.x / s) * w, y: (p.y / s) * w }));
    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 1;
    ctx.stroke();
    // Small forward line: target -> midpoint of the top edge.
    const target = this.game.camera.getTarget();
    const topMid = { x: (points[2].x + points[3].x) / 2, y: (points[2].y + points[3].y) / 2 };
    ctx.beginPath();
    ctx.moveTo((target.x / s) * w, (target.z / s) * w);
    ctx.lineTo(topMid.x, topMid.y);
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc((target.x / s) * w, (target.z / s) * w, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 1;
    // alert pulses (blink)
    if (this.alertPings.length) {
      const pulse = 0.5 + 0.5 * Math.sin(performance.now() * 0.012);
      for (const p of this.alertPings) {
        const ax = (p.x / s) * w;
        const az = (p.z / s) * w;
        ctx.strokeStyle = `rgba(255,70,70,${0.35 + pulse * 0.55})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(ax, az, 5 + pulse * 3, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.lineWidth = 1;
    }
  }

  // --- menus ---

  showMainMenu(): void {
    this.game.loop.stop();
    this.clearOverlays();
    this.setMenuOpen(true);
    const ov = this.el('div', 'ed-overlay');
    const panel = this.el('div', 'ed-panel', ov);
    panel.innerHTML = `
      <div style="font-size:12px;letter-spacing:4px;color:#a8883f">3000 a.C. — HOY</div>
      <h2>EDADES DEL PERÚ</h2>
      <div class="sub">Un estratega en tiempo real a través de cinco mil años de historia peruana</div>
    `;
    const rows = this.el('div', 'row', panel);
    const periodLabels: Record<string, string> = {};
    for (const p of PERIODS) periodLabels[String(p.id)] = `${p.name} · ${p.dates}`;
    rows.appendChild(
      this.field(
        'Periodo histórico',
        this.select(
          PERIODS.map((p) => String(p.id)),
          periodLabels,
          String(this.game.settings.period),
          (v) => {
            this.game.settings.period = Number(v) as HistoricalPeriod;
            const disp = civsForPeriod(this.game.settings.period);
            if (!disp.some((c) => c.id === this.game.settings.civPlayer)) this.game.settings.civPlayer = disp[0].id;
            let rival = disp.find((c) => c.id === this.game.settings.civAI && c.id !== this.game.settings.civPlayer);
            if (!rival) rival = disp.find((c) => c.id !== this.game.settings.civPlayer) ?? disp[0];
            this.game.settings.civAI = rival.id;
            this.game.settings.mapType = getCiv(this.game.settings.civPlayer).geography;
            this.showMainMenu();
          },
        ),
      ),
    );
    rows.appendChild(
      this.field(
        'Dificultad',
        this.select(
          ['easy', 'normal', 'hard', 'legendary'] as const,
          { easy: 'Fácil', normal: 'Normal', hard: 'Difícil', legendary: 'Legendario' },
          this.game.settings.difficulty,
          (v) => (this.game.settings.difficulty = v),
        ),
      ),
    );
    const disponibles = civsForPeriod(this.game.settings.period);
    const civLabels: Record<string, string> = {};
    for (const c of disponibles) civLabels[c.id] = `${c.name} (${MAP_LABEL[c.geography]})`;
    rows.appendChild(
      this.field(
        'Tu civilización',
        this.select(
          disponibles.map((c) => c.id),
          civLabels,
          this.game.settings.civPlayer,
          (v) => {
            this.game.settings.civPlayer = v;
            if (this.game.settings.civAI === this.game.settings.civPlayer) {
              const alt = disponibles.find((c) => c.id !== v) ?? disponibles[0];
              this.game.settings.civAI = alt.id;
            }
            this.game.settings.mapType = getCiv(v).geography;
            this.showMainMenu();
          },
        ),
      ),
    );
    rows.appendChild(
      this.field(
        'Rival (contemporáneo)',
        this.select(
          disponibles.map((c) => c.id),
          civLabels,
          this.game.settings.civAI,
          (v) => {
            this.game.settings.civAI = v;
            this.showMainMenu();
          },
        ),
      ),
    );
    const rows2 = this.el('div', 'row', panel);
    rows2.appendChild(
      this.field(
        'Mapa',
        this.select(
          ['coast', 'andes', 'altiplano', 'jungle'] as const,
          MAP_LABEL,
          this.game.settings.mapType,
          (v) => (this.game.settings.mapType = v),
        ),
      ),
    );
    rows2.appendChild(
      this.field(
        'Hora del día',
        this.select(
          ['morning', 'noon', 'dusk', 'night'] as const,
          { morning: 'Mañana', noon: 'Mediodía', dusk: 'Atardecer', night: 'Noche' },
          this.game.settings.timeOfDay,
          (v) => this.setTimeOfDay(v),
        ),
      ),
    );
    rows2.appendChild(
      this.field(
        'Victoria',
        this.select(
          ['conquest', 'wonder'] as const,
          { conquest: 'Conquista', wonder: 'Huaca Sagrada' },
          this.game.settings.victoryMode,
          (v) => (this.game.settings.victoryMode = v),
        ),
      ),
    );
    if (hasSave()) {
      const continueBtn = this.el('button', 'ed-primary', panel);
      continueBtn.textContent = '▶ Continuar partida';
      continueBtn.addEventListener('click', () => {
        this.setMenuOpen(false);
        this.clearOverlays();
        this.game.loadMatch();
      });
    }
    if (hasReplay()) {
      const replayBtn = this.el('button', 'ed-ghostbtn', panel);
      replayBtn.textContent = '🎬 Ver última repetición';
      replayBtn.addEventListener('click', () => {
        this.setMenuOpen(false);
        this.clearOverlays();
        this.game.loadReplayMatch();
      });
    }
    const startBtn = this.el('button', 'ed-primary', panel);
    startBtn.textContent = '▶ INICIAR ESCARAMUZA';
    startBtn.addEventListener('click', () => {
      this.game.settings.missionId = undefined;
      this.setMenuOpen(false);
      this.clearOverlays();
      this.game.resetGame();
    });
    const campaignBtn = this.el('button', 'ed-ghostbtn', panel);
    campaignBtn.textContent = '📜 Campañas';
    campaignBtn.addEventListener('click', () => this.showCampaignIntro());
    const codexBtn = this.el('button', 'ed-ghostbtn', panel);
    codexBtn.textContent = '📖 Códice';
    codexBtn.addEventListener('click', () => this.showCodex());
    const controlsBtn = this.el('button', 'ed-ghostbtn', panel);
    controlsBtn.textContent = '❓ Cómo jugar';
    controlsBtn.addEventListener('click', () => this.showControls());
  }

  /** Open the educational codex/encyclopedia (periods, civilizations, campaigns and dossiers). */
  showCodex(): void {
    this.clearOverlays();
    this.setMenuOpen(true);
    openCodex(this.root, () => this.showMainMenu());
  }

  /** Historical campaign prologue before the mission list (AoE style). */
  showCampaignIntro(): void {
    this.clearOverlays();
    this.setMenuOpen(true);
    const seen = this.introSeen();
    const ov = this.el('div', 'ed-overlay');
    const panel = this.el('div', 'ed-panel', ov);
    panel.style.maxWidth = '660px';
    panel.innerHTML = `
      <div style="font-size:12px;letter-spacing:3px;color:#a8883f">CAMPAÑA</div>
      <h2>${CAMPAIGN_TITLE}</h2>
      <div class="sub">${CAMPAIGN_SUBTITLE}</div>
      <div class="ed-hist">${PROLOGUE}</div>
    `;
    const row = this.el('div', 'row', panel);
    const start = this.el('button', 'ed-primary', row);
    start.textContent = '▶ Ver misiones';
    start.addEventListener('click', () => {
      this.markIntroSeen();
      this.showCampaignMenu();
    });
    const codex = this.el('button', 'ed-ghostbtn', row);
    codex.textContent = '📖 Códice';
    codex.addEventListener('click', () => this.showCodex());
    const back = this.el('button', 'ed-ghostbtn', panel);
    back.textContent = seen ? '← Volver' : '← Volver al menú';
    back.addEventListener('click', () => this.showMainMenu());
    if (seen) start.textContent = '▶ Ver misiones';
  }

  private introSeen(): boolean {
    try {
      return localStorage.getItem('peru-campaign-intro') === '1';
    } catch {
      return false;
    }
  }

  private markIntroSeen(): void {
    try {
      localStorage.setItem('peru-campaign-intro', '1');
    } catch {
      /* noop */
    }
  }

  /** Controls and basic concepts panel. */
  showControls(): void {
    this.clearOverlays();
    this.setMenuOpen(true);
    const ov = this.el('div', 'ed-overlay');
    const panel = this.el('div', 'ed-panel', ov);
    panel.style.maxWidth = '620px';
    panel.innerHTML = `<h2>CÓMO JUGAR</h2><div class="sub">Reúne recursos, construye, entrena un ejército y vence a tu rival.</div>`;
    const keys = this.el('div', 'ed-keys', panel);
    keys.innerHTML = `
      <b>Clic izquierdo / arrastrar</b><span>Seleccionar unidad, edificio o caja de selección</span>
      <b>Doble clic</b><span>Seleccionar todas las unidades del mismo tipo</span>
      <b>E</b><span>Seleccionar todo tu ejército</span>
      <b>Botón derecho</b><span>Mover · recolectar · atacar · construir (con obreros)</span>
      <b>Ctrl + Botón derecho</b><span>Atacar-mover</span>
      <b>Shift + Botón derecho</b><span>Encolar órdenes / fijar punto de reunión</span>
      <b>G · V</b><span>Construir andén · vivienda</span>
      <b>WASD / flechas / bordes</b><span>Mover la cámara</span>
      <b>Rueda</b><span>Zoom · <b>Q/E</b> rotar · <b>F</b> seguir</span>
      <b>H</b><span>Ir a la Plaza Mayor · <b>Espacio</b> última batalla</span>
      <b>P</b><span>Pausa · <b>☰ Menú</b> opciones y salir</span>
      <b>Meta</b><span>Destruye a tu rival o construye la Huaca Sagrada y protégela 5 min</span>
    `;
    const back = this.el('button', 'ed-primary', panel);
    back.textContent = '← Volver';
    back.addEventListener('click', () => this.showMainMenu());
  }

  /** Mission briefing before starting (historical context + objectives + sources). */
  showBriefing(mis: MissionDef, onStart: () => void): void {
    this.game.loop.stop();
    if (!this.game.getPaused()) this.game.togglePause();
    this.clearOverlays();
    const ov = this.el('div', 'ed-overlay');
    const panel = this.el('div', 'ed-panel', ov);
    panel.style.maxWidth = '680px';
    const period = getPeriod(mis.period);
    const player = getCiv(mis.playerCiv);
    const enemy = getCiv(mis.enemyCiv);
    const edu = getEducational(mis.id);
    const context = edu?.briefing
      ? `<div class="ed-hist"><b style="color:var(--gold)">Contexto histórico.</b> ${edu.briefing}</div>`
      : edu?.context
        ? `<div class="ed-hist">${mis.history}</div><div class="ed-hist"><b style="color:var(--gold)">Contexto histórico.</b> ${edu.context}</div>`
        : `<div class="ed-hist">${mis.history}</div>`;
    const funFact = edu ? `<div class="ed-sabias">💡 <b>¿Sabías que…?</b> ${edu.didYouKnow}</div>` : '';
    const sides = mis.enemy.active
      ? `<span>Bandos: <b>${player.name}</b> vs <b>${player.id === enemy.id ? 'grupos rivales' : enemy.name}</b></span>`
      : `<span>Bandos: <b>${player.name}</b> (sin enfrentamiento documentado)</span>`;
    const sources =
      edu && edu.sources.length
        ? `<details class="ed-fuentes"><summary>Fuentes históricas</summary><ul>${edu.sources
            .map(
              (f) => `<li>${f.url ? `<a href="${f.url}" target="_blank" rel="noopener">${f.text}</a>` : f.text}</li>`,
            )
            .join('')}</ul></details>`
        : '';
    const commanders = (mis.commanders ?? [])
      .flatMap((id) => {
        const c = COMMANDERS[id];
        return c ? [c] : [];
      })
      .map(
        (c) =>
          `<div class="ed-cmd-card">${portraitSvg(c, 56)}<div class="ed-cmd-info"><b>${escapeHtml(c.name)}</b><span>${escapeHtml(c.role)}</span>${
            c.status === 'abstraction' ? '<em>Reconstrucción estilizada</em>' : ''
          }</div></div>`,
      )
      .join('');
    const commandersHtml = commanders ? `<div class="ed-commanders">${commanders}</div>` : '';
    panel.innerHTML = `
      <div style="font-size:12px;letter-spacing:3px;color:#a8883f">${mis.subtitle}</div>
      <h2>${mis.title}</h2>
      <div class="ed-meta">
        <span>Periodo: <b>${period.name}</b> (${period.dates})</span>
        <span>Geografía: <b>${MAP_LABEL[mis.map.type]}</b></span>
        ${sides}
      </div>
      ${commandersHtml}
      ${context}
      ${funFact}
      <div class="sub" style="text-align:left;font-size:12px;color:var(--text);line-height:1.7;margin-bottom:10px"><b style="color:var(--gold)">OBJETIVOS</b><br>${this.objectiveTitles(
        mis.objectives,
      )
        .map((t) => '• ' + t)
        .join('<br>')}</div>
      ${sources}
    `;
    const start = this.el('button', 'ed-primary', panel);
    start.textContent = '▶ COMENZAR MISIÓN';
    start.addEventListener('click', () => {
      this.clearOverlays();
      onStart();
    });
  }

  /** Campaign mission selection menu. */
  showCampaignMenu(): void {
    this.clearOverlays();
    this.setMenuOpen(true);
    const ov = this.el('div', 'ed-overlay');
    const panel = this.el('div', 'ed-panel', ov);
    panel.style.maxWidth = '560px';
    // `progress` is the number of completed missions (and the index of the next one)
    const progress = this.campaignProgress();
    panel.innerHTML = `
      <div style="font-size:12px;letter-spacing:3px;color:#a8883f">CAMPAÑA</div>
      <h2>${CAMPAIGN_TITLE}</h2>
      <div class="sub">${CAMPAIGN_SUBTITLE}</div>
      <div class="sub" style="color:var(--gold)">${progress} / ${MISSIONS.length} misiones completadas</div>
    `;
    const startMission = (id: string): void => {
      this.game.settings.missionId = id;
      this.setMenuOpen(false);
      this.clearOverlays();
      this.game.resetGame();
    };
    MISSIONS.forEach((mis, i) => {
      const row = this.el('div', 'row', panel);
      row.style.justifyContent = 'flex-start';
      const btn = this.el('button', 'ed-ghostbtn', row) as HTMLButtonElement;
      btn.style.flex = '1';
      if (i > progress) {
        btn.disabled = true;
        btn.classList.add('disabled');
        btn.style.opacity = '0.4';
        btn.textContent = `🔒 ${i + 1}. ${mis.title}`;
        return;
      }
      const done = i < progress;
      btn.textContent = `${done ? '✓' : '▶'} ${i + 1}. ${mis.title} — ${mis.subtitle}`;
      if (done) btn.style.color = 'var(--gold)';
      btn.addEventListener('click', () => startMission(mis.id));
    });
    if (progress < MISSIONS.length) {
      const continueButton = this.el('button', 'ed-primary', panel);
      continueButton.textContent = '▶ Continuar campaña';
      continueButton.addEventListener('click', () => startMission(MISSIONS[progress].id));
    } else {
      const doneMsg = this.el('div', 'sub', panel);
      doneMsg.style.color = 'var(--gold)';
      doneMsg.textContent = '🏆 Campaña completada. Puedes rejugar cualquier misión.';
    }
    const back = this.el('button', 'ed-ghostbtn', panel);
    back.textContent = '← Volver';
    back.addEventListener('click', () => this.showMainMenu());
  }

  /** Saved campaign progress: number of completed missions (index of the next one). */
  private campaignProgress(): number {
    try {
      const raw = localStorage.getItem('peru-campaign');
      if (!raw) return 0;
      const n = Number.parseInt(raw, 10);
      if (!Number.isFinite(n)) return 0;
      return Math.max(0, Math.min(MISSIONS.length, n));
    } catch {
      return 0;
    }
  }

  /** Register a mission as completed. */
  saveCampaignProgress(id: string): void {
    const idx = MISSIONS.findIndex((m) => m.id === id);
    if (idx < 0) return;
    const next = Math.min(MISSIONS.length, Math.max(idx + 1, this.campaignProgress()));
    try {
      localStorage.setItem('peru-campaign', String(next));
    } catch {
      /* noop */
    }
  }

  private setTimeOfDay(v: GameSettings['timeOfDay']): void {
    this.game.settings.timeOfDay = v;
    const map: Record<string, number> = { morning: 0.62, noon: 0.5, dusk: 0.28, night: 0.05 };
    this.game.sky.setTimeOfDay(map[v] ?? 0.5);
  }

  private showPauseMenu(): void {
    if (!this.game.getPaused()) this.game.togglePause();
    else this.setPaused(true);
  }

  private showOptions(): void {
    this.clearOverlays();
    const ov = this.el('div', 'ed-overlay');
    const panel = this.el('div', 'ed-panel', ov);
    panel.innerHTML = `<h2>OPCIONES</h2><div class="sub">Ajustes visuales y de sonido</div>`;
    const row = this.el('div', 'row', panel);
    const q = this.field(
      'Calidad',
      this.select(
        ['high', 'medium', 'low'] as const,
        { high: 'Alta (AAA)', medium: 'Media', low: 'Baja' },
        this.game.settings.quality,
        (v) => this.game.setQuality(v),
      ),
    );
    row.appendChild(q);
    this.toggle(
      row,
      'Efectos cinematográficos',
      ['Activados', 'Desactivados'],
      () => this.game.settings.cinematic,
      (v) => {
        this.game.settings.cinematic = v;
        this.game.postfx.setCinematic(v);
      },
    );
    this.toggle(
      row,
      'Rotar cámara (Q/E)',
      ['Activada', 'Desactivada'],
      () => this.game.settings.rotateCamera,
      (v) => {
        this.game.settings.rotateCamera = v;
        this.game.camera.setRotationEnabled(v);
      },
    );
    row.appendChild(
      this.field(
        'Velocidad de cámara',
        this.select(
          ['slow', 'normal', 'fast'] as const,
          { slow: 'Baja', normal: 'Normal', fast: 'Alta' },
          this.game.settings.cameraSpeed,
          (v) => {
            this.game.settings.cameraSpeed = v;
            this.game.camera.setSpeedScale(CAMERA_SPEED_SCALE[v]);
          },
        ),
      ),
    );
    this.toggle(
      row,
      'Niebla de guerra',
      ['Activada', 'Desactivada'],
      () => this.game.settings.fogOfWar,
      (v) => this.game.setFogOfWar(v),
    );
    this.toggle(
      row,
      'Sonido',
      ['Activado', 'Desactivado'],
      () => this.game.settings.soundEnabled,
      (v) => {
        this.game.settings.soundEnabled = v;
        this.game.audio.enabled = v;
      },
    );
    this.toggle(
      row,
      'Música',
      ['Activada', 'Desactivada'],
      () => this.game.settings.musicEnabled,
      (v) => {
        this.game.settings.musicEnabled = v;
        this.game.audio.musicEnabled = v;
        if (v) this.game.audio.startMusic();
        else this.game.audio.stopMusic();
      },
    );
    this.toggle(
      row,
      'Consejos',
      ['Activados', 'Desactivados'],
      () => this.game.settings.showHints,
      (v) => (this.game.settings.showHints = v),
    );
    const back = this.el('button', 'ed-primary', panel);
    back.textContent = 'Volver';
    back.addEventListener('click', () => this.showPauseMenu());
  }

  private field(label: string, input: HTMLElement): HTMLElement {
    const f = this.el('div', 'ed-field');
    f.appendChild(this.el('label', '')).textContent = label;
    f.appendChild(input);
    return f;
  }

  /** A labelled on/off button for a settings panel (`words` = [on, off]). */
  private toggle(
    parent: HTMLElement,
    label: string,
    words: [string, string],
    get: () => boolean,
    set: (v: boolean) => void,
  ): void {
    const btn = document.createElement('button');
    btn.className = 'ed-ghostbtn';
    const render = () => (btn.textContent = get() ? words[0] : words[1]);
    render();
    btn.addEventListener('click', () => {
      set(!get());
      render();
    });
    parent.appendChild(this.field(label, btn));
  }

  private select<T extends string>(
    values: readonly T[],
    labels: Record<string, string>,
    value: T,
    onChange: (v: T) => void,
  ): HTMLSelectElement {
    const sel = document.createElement('select');
    for (const v of values) {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = labels[v] ?? v;
      sel.appendChild(opt);
    }
    sel.value = value;
    sel.addEventListener('change', () => onChange(sel.value as T));
    return sel;
  }

  private clearOverlays(): void {
    this.root.querySelectorAll('.ed-overlay').forEach((e) => e.remove());
  }

  /** Hide the in-game HUD while a modal menu is open. */
  private setMenuOpen(v: boolean): void {
    this.root.classList.toggle('menu-open', v);
  }

  // --- update ---

  update(dt: number, t: number): void {
    void t;
    this.updateAcc += dt;
    this.damage.update(this.game.camera.camera, dt);
    const now = performance.now();
    if (this.alertPings.length) this.alertPings = this.alertPings.filter((p) => p.until > now);
    // dialogue with auto-close
    if (this.dialogueTimer > 0) {
      this.dialogueTimer -= dt;
      if (this.dialogueTimer <= 0) this.dialogueEl.classList.remove('show');
    }
    // campaign objectives panel (tick shared with the minimap)
    if (this.game.mission) {
      this.objPanelEl.style.display = 'block';
      if (this.updateAcc > 0.15) this.refreshObjectives();
    } else {
      this.objPanelEl.style.display = 'none';
    }
    const p = this.game.players[0];
    if (p) {
      // resources
      for (const k of RESOURCE_KEYS) {
        const el = this.resEls[k];
        const val = Math.floor(p.resources[k]);
        const span = el.querySelector('.res-val')!;
        span.textContent = formatNumber(val);
        el.classList.toggle('res-low', val < 30);
      }
      // hide resources unavailable in the period (e.g. Stone without a Quarry)
      this.resEls.stone.style.display = this.game.canBuildKind(BuildingKind.REFINERY) ? '' : 'none';
      this.popEl.querySelector('span')!.textContent = `${p.populationUsed}/${p.populationCap}`;
      const period = getPeriod(this.game.settings.period);
      this.eraEl.querySelector('span:last-child')!.textContent = `${period.name} · ${period.dates}`;
      this.eraDot.style.background = `#${ERA_COLORS[p.era].toString(16).padStart(6, '0')}`;
    }
    if (this.updateAcc > 0.15) {
      this.updateAcc = 0;
      this.renderBottomIfChanged();
      this.updateBottomProgress();
      this.renderMinimap();
    }
    if (this.showFps) this.fpsEl.textContent = `${this.game.loop.getFps()} FPS · ${this.game.getAppliedQuality()}`;
  }
}
