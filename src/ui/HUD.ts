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
  AlertReason,
  CombatStance,
  MapType,
} from '../core/types';
import { BUILDING_DEFS, getBuildingStats } from '../model/defs/buildings';
import { droughtYieldFactor } from '../model/defs/farmYield';
import { getBuildingCard } from '../model/defs/buildingCards';
import {
  UNIT_ARCHETYPES,
  UNIT_CLASS_LABEL,
  getUnitStats,
  unitClassFor,
  unitAvailableToCiv,
  unitDisplayIcon,
  unitDisplayName,
  unitAvailableInPeriod,
} from '../model/defs/units';
import { TECHS, techAvailable } from '../model/defs/techs';
import { uniqueTechsForCiv, uniqueUnitGapForCiv, uniqueUnitsForCiv } from '../model/defs/unique';
import { ERA_DEFS } from '../model/defs/eras';
import { PERIODS, getPeriod } from '../model/defs/periods';
import { civsForPeriod, getCiv } from '../model/defs/civs';
import { RESOURCE_INFO, MAP_LABEL, GameSettings, CAMERA_SPEED_SCALE, STARTING_RESOURCES } from '../core/Config';
import { formatNumber, formatStat } from '../util/math';
import { LABEL_COLORS, LABEL_OPACITY } from '../rendering/MapLabels';
import { t } from '../i18n';
import { artIntroForMission } from '../art/manifest';
import { artFigureHtml, includeUnreviewedArt } from './ArtFigure';
import { getEducational } from '../campaign/defs/educational';
import {
  CAMPAIGNS,
  getCampaignForMission,
  campaignNumber,
  nextReleasedMission,
  missionPosition,
  type CampaignId,
} from '../campaign/defs/campaigns';
import { SERIES_INTRO } from '../campaign/defs/cinematics';
import { CAMPAIGN_ONLY } from '../core/release';
import { markMissionComplete, parseCampaignProgress } from '../campaign/progress';
import { CinematicPlayer } from './CinematicPlayer';
import { CAMPAIGN_ART, MENU_BACKDROP, MISSION_ART } from './menuArt';
import { renderBriefing } from './MissionBriefing';
import { decorateTitleScreen, renderCampaignPath, renderMainMenu } from './SeriesMenu';
import { publicAsset } from '../util/publicAsset';
import type { MissionDef, ObjectiveProgress, ObjState } from '../campaign/types';
import { COMMANDERS, commanderById, type PortraitId } from '../model/defs/commanders';
import type { HeritageBuildingDef, HeritageBuildingId } from '../model/defs/heritage';
import { portraitSvg } from './Portrait';
import { DamageNumbers } from './DamageNumbers';
import { openCodex } from './Codex';
import { openTechTree } from './TechTree';
import { bus } from '../core/EventBus';
import { hasSave } from '../game/SaveGame';
import { hasReplay, saveReplay } from '../game/replay';
import { mountMatchStats } from './MatchStatsPanel';
import {
  COMMAND_SLOT_COUNT,
  HOTKEYS,
  formatHotkeys,
  keyFor,
  isReservedKey,
  keymapConflicts,
  normalizeKeymap,
  type HotkeyAction,
} from '../core/hotkeys';

const ACT_TITLE = /^(Acto [IVXL]+) ·/;

/** Briefings with this many named characters switch to the compact cast grid. */
const CAST_LAYOUT_MIN = 5;

const STANCE_TOOLTIP: Record<CombatStance, string> = {
  agresivo: t('hud.stance.agresivo'),
  defensivo: t('hud.stance.defensivo'),
  pasivo: t('hud.stance.pasivo'),
};

const STANCE_LABEL: Record<CombatStance, string> = {
  agresivo: t('hud.stance.agresivoLabel'),
  defensivo: t('hud.stance.defensivoLabel'),
  pasivo: t('hud.stance.pasivoLabel'),
};

const ORDINAL_KEYS = [
  'hud.ordinal.first',
  'hud.ordinal.second',
  'hud.ordinal.third',
  'hud.ordinal.fourth',
  'hud.ordinal.fifth',
] as const;

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
  BuildingKind.WALL,
  BuildingKind.GATE,
  BuildingKind.TOWER,
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
    --stats-food: #e8c36a;
    --stats-wood: #5fd08a;
    --stats-silver: #9fb4d8;
    --stats-stone: #c49a6c;
    --weave: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='8' viewBox='0 0 16 8'%3E%3Cpath d='M0 8L8 0l8 8' fill='none' stroke='%23e8c36a' stroke-opacity='0.18'/%3E%3C/svg%3E");
  }
  #ui-root { position: fixed; inset: 0; pointer-events: none; z-index: 20; font-family: "Bahnschrift", "Arial Narrow", "Segoe UI", sans-serif; color: var(--text); user-select: none; }
  #ui-root h1, #ui-root h2, #ui-root h3, .ed-logo { font-family: Georgia, "Times New Roman", serif; letter-spacing: 1px; }
  #ui-root * { box-sizing: border-box; }
  .ed-btn { pointer-events: auto; }
  .ed-topbar { position: absolute; top: 0; left: 0; right: 0; height: 46px; display: flex; align-items: center; gap: 8px; padding: 6px 12px; background: linear-gradient(180deg, rgba(12,14,18,0.96), rgba(12,14,18,0.82)); border-bottom: 1px solid var(--line); overflow: hidden; }
  .ed-logo { font-weight: 700; font-size: 15px; letter-spacing: 2px; color: var(--gold); text-transform: uppercase; display: flex; align-items: center; gap: 8px; white-space: nowrap; flex-shrink: 0; }
  .ed-logo svg { width: 22px; height: 22px; }
  .ed-res.res-unavailable { opacity: .42; }
  .ed-idle { display: flex; align-items: center; gap: 3px; font-size: 12px; color: var(--text); cursor: pointer; padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(232,195,106,.2); }
  .ed-idle:hover { border-color: var(--gold); }
  .ed-idle.none { opacity: .45; }
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
  #ed-minimap-wrap { position: absolute; left: 12px; bottom: 12px; width: var(--minimap-size); height: var(--minimap-size); border: 1px solid var(--line); border-radius: 4px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.5); }
  #ed-minimap { width: 100%; height: 100%; display: block; cursor: crosshair; pointer-events: auto; }
  #ed-compass { position: absolute; inset: 0; pointer-events: none; font-size: 10px; font-weight: 700; letter-spacing: 0.5px; color: rgba(255,255,255,0.9); text-shadow: 0 1px 2px rgba(0,0,0,0.9); }
  #ed-compass span { position: absolute; padding: 1px 3px; border-radius: 2px; background: rgba(6,8,12,0.55); }
  #ed-compass .n { top: 3px; left: 50%; transform: translateX(-50%); color: var(--gold); }
  #ed-compass .e { top: 50%; right: 3px; transform: translateY(-50%); }
  #ed-compass .s { bottom: 3px; left: 50%; transform: translateX(-50%); }
  #ed-compass .w { top: 50%; left: 3px; transform: translateY(-50%); }

  /* Command bar: one low horizontal strip right of the minimap (AoE/SC2 layout). Selection info on the
     left, actions in a row in the middle, orders on the right; it only grows when the actions wrap. */
  #ui-root { --minimap-size: 190px; --bar-gap: 12px; --panel-floor: 150px; }
  #ed-bottom { position: absolute; left: calc(var(--minimap-size) + 2 * var(--bar-gap)); right: var(--bar-gap); bottom: var(--bar-gap); max-width: 1180px; margin: 0 auto; background: var(--panel); border: 1px solid var(--line); border-radius: 6px; pointer-events: auto; display: flex; flex-direction: column; box-shadow: 0 6px 30px rgba(0,0,0,0.55); overflow: hidden; }
  #ed-bottom-header { padding: 3px 12px; font-size: 12px; font-weight: 700; border-bottom: 1px solid var(--line); display: flex; align-items: center; gap: 8px; background: rgba(232,195,106,0.06); background-image: var(--weave); background-repeat: repeat-x; background-position: bottom; }
  #ed-bottom-header:empty { display: none; }
  #ed-bottom-body { padding: 6px 8px; display: flex; flex-direction: row; align-items: flex-start; gap: 10px; }
  #ed-desc { flex: 0 0 250px; max-height: 120px; overflow-y: auto; font-size: 12px; color: var(--text-dim); line-height: 1.35; padding-right: 10px; border-right: 1px solid var(--line); }
  #ed-desc:empty { display: none; }
  #ed-desc h3 { margin: 0 0 3px; font-size: 14px; color: var(--text); }
  .ed-grid { flex: 1 1 auto; display: flex; flex-wrap: wrap; align-content: flex-start; gap: 5px; min-width: 0; }
  #ed-commands { flex: 0 1 260px; display: flex; flex-wrap: wrap; align-content: flex-start; gap: 4px; padding-left: 10px; border-left: 1px solid var(--line); }
  #ed-commands:empty { display: none; }
  #ed-commands .ed-command { padding: 4px 8px; }
  .ed-card { pointer-events: auto; width: 60px; height: 60px; border-radius: 4px; border: 1px solid var(--line); background: var(--panel-2); display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; font-size: 10px; text-align: center; position: relative; transition: border-color 0.12s, transform 0.06s; }
  .ed-card:hover { border-color: var(--gold); transform: translateY(-1px); }
  .ed-card .ic { font-size: 21px; line-height: 1; }
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
  .ed-hotkey { position: absolute; top: 2px; right: 3px; min-width: 12px; padding: 0 2px; border-radius: 2px; background: rgba(232,195,106,.18); color: var(--gold); font-size: 8px; font-weight: 800; line-height: 12px; text-align: center; pointer-events: none; }
  .ed-command .ed-hotkey { position: static; margin-left: 6px; background: rgba(0,0,0,.2); }

  .ed-group { display: flex; gap: 6px; margin-top: 6px; }
  .ed-command { pointer-events: auto; border: 1px solid var(--line); background: var(--panel-2); color: var(--text); border-radius: 4px; padding: 5px 9px; font-size: 11px; cursor: pointer; font-weight: 600; }
  .ed-command:hover { border-color: var(--gold); color: var(--gold); }
  .ed-command.disabled { opacity: 0.55; cursor: not-allowed; border-style: dashed; }
  .ed-command.disabled:hover { border-color: var(--line); color: var(--text); }

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
  /* Above every in-game HUD layer (alerts, damage numbers, tooltip and cursor): a positioned child
     with z-index used to paint over the veil despite coming earlier in the DOM (issue 415). */
  .ed-overlay { position: absolute; inset: 0; z-index: 70; display: flex; align-items: center; justify-content: center; background: rgba(6,8,12,0.82); backdrop-filter: blur(3px); pointer-events: auto; }
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

  /* Onboarding: title, main menu, campaign hub and cinematics */
  .ed-title-card { position: relative; z-index: 1; text-align: center; padding: 32px; max-width: 720px; }
  .ed-title-ornament { width: 78px; height: 34px; margin: 0 auto 18px; background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M10 1h4v5h5v4h4v4h-4v4h-5v5h-4v-5H5v-4H1v-4h4V6h5z' fill='%23e8c36a' fill-opacity='0.82'/%3E%3C/svg%3E") center/contain no-repeat; filter: drop-shadow(0 0 14px rgba(232,195,106,.35)); }
  .ed-title-card .kicker { font-size: 11px; letter-spacing: 5px; color: var(--gold-dim); text-transform: uppercase; }
  .ed-title-card h1 { margin: 12px 0 8px; font-size: clamp(42px, 8vw, 92px); line-height: .96; color: #f3e5bb; text-shadow: 0 4px 30px rgba(0,0,0,.8); letter-spacing: 3px; }
  .ed-title-card .sub { color: var(--text-dim); font-size: 14px; line-height: 1.6; max-width: 460px; margin: 0 auto 26px; }
  .ed-title-card .ed-primary { padding: 12px 42px; font-size: 15px; letter-spacing: 2px; box-shadow: 0 8px 30px rgba(232,195,106,.18); }
  .ed-title-card .hint { margin-top: 14px; color: var(--text-dim); font-size: 10px; letter-spacing: 2px; text-transform: uppercase; }

  .ed-menu-shell { position: relative; z-index: 1; display: flex; flex-direction: column; justify-content: space-between; width: min(620px, 54vw); min-height: 100%; padding: clamp(28px, 5vw, 70px) clamp(24px, 4vw, 68px) 28px; }
  .ed-menu-kicker { color: var(--gold-dim); font-size: 11px; letter-spacing: 4px; text-transform: uppercase; margin-bottom: 12px; }
  .ed-menu-title { margin: 0; font-size: clamp(40px, 5.2vw, 74px); line-height: .92; color: #f3e5bb; letter-spacing: 2px; text-shadow: 0 4px 28px rgba(0,0,0,.72); }
  .ed-menu-sub { margin: 14px 0 26px; max-width: 430px; color: var(--text-dim); font-size: 13px; line-height: 1.6; }
  .ed-menu-actions { display: flex; flex-direction: column; align-items: flex-start; gap: 3px; max-width: 390px; }
  .ed-menu-btn { pointer-events: auto; width: 100%; display: flex; align-items: center; gap: 14px; text-align: left; background: linear-gradient(90deg, rgba(16,20,25,.84), rgba(16,20,25,.22)); border: 0; border-left: 3px solid rgba(232,195,106,.28); color: var(--text); padding: 12px 16px; border-radius: 3px; cursor: pointer; font-size: 16px; font-weight: 700; letter-spacing: .4px; transition: border-color .18s, background .18s, transform .18s; }
  .ed-menu-btn .ic { width: 22px; text-align: center; color: var(--gold); font-size: 16px; }
  .ed-menu-btn small { display: block; color: var(--text-dim); font-size: 10px; font-weight: 500; letter-spacing: .3px; margin-top: 2px; }
  .ed-menu-btn:hover { border-left-color: var(--gold); background: linear-gradient(90deg, rgba(232,195,106,.15), rgba(16,20,25,.28)); transform: translateX(3px); }
  .ed-menu-btn.primary { border-left-color: var(--gold); background: linear-gradient(90deg, rgba(232,195,106,.22), rgba(16,20,25,.3)); }
  .ed-menu-btn[disabled] { opacity: .42; cursor: default; transform: none; }
  .ed-menu-footer { position: relative; z-index: 1; margin-top: 22px; display: flex; gap: 14px; align-items: center; flex-wrap: wrap; color: var(--text-dim); font-size: 10px; letter-spacing: .6px; }
  .ed-menu-footer button { background: none; border: 0; color: var(--gold-dim); font: inherit; cursor: pointer; padding: 0; text-decoration: underline; text-underline-offset: 3px; }
  .ed-menu-footer button:hover { color: var(--gold); }

  .ed-cinematic { align-items: flex-end; justify-content: flex-start; background-size: 108%; background-position: 56% 50%; background-repeat: no-repeat; padding: clamp(26px, 6vw, 72px); animation: menu-drift 30s ease-in-out infinite alternate; }
  .ed-cinematic::before { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse at 70% 35%, transparent 0%, rgba(3,5,8,.18) 48%, rgba(3,5,8,.82) 100%); pointer-events: none; }
  .ed-cinematic-copy { position: relative; z-index: 1; max-width: 680px; margin-bottom: clamp(84px, 12vh, 130px); }
  .ed-cinematic.is-active .ed-cinematic-copy { animation: cinematic-in .8s ease; }
  .ed-cinematic-series { color: var(--gold-dim); font-size: 10px; letter-spacing: 4px; text-transform: uppercase; margin-bottom: 16px; }
  .ed-cinematic-kicker { color: var(--gold); font-size: 11px; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 8px; }
  .ed-cinematic-title { margin: 0 0 12px; color: #f4e7c2; font-size: clamp(34px, 5vw, 58px); line-height: 1.02; text-shadow: 0 4px 22px rgba(0,0,0,.72); }
  .ed-cinematic-text { margin: 0; color: #d9d4c8; font-size: clamp(14px, 1.35vw, 18px); line-height: 1.65; max-width: 640px; text-shadow: 0 2px 12px rgba(0,0,0,.72); }
  .ed-cinematic-footer { position: absolute; z-index: 2; left: clamp(26px, 6vw, 72px); right: clamp(26px, 6vw, 72px); bottom: clamp(22px, 4vw, 46px); display: flex; align-items: center; justify-content: space-between; gap: 18px; }
  .ed-cinematic-progress { display: flex; gap: 6px; align-items: center; }
  .ed-cinematic-progress span { width: 26px; height: 2px; background: rgba(232,195,106,.25); transition: background .2s, width .2s; }
  .ed-cinematic-progress span.active { width: 44px; background: var(--gold); }
  .ed-cinematic-actions { display: flex; align-items: center; gap: 4px; }
  .ed-cinematic-skip { opacity: .7; }
  .ed-cinematic-skip:hover { opacity: 1; }
  @keyframes cinematic-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }

  .ed-campaign-panel { width: min(1020px, 94vw); max-height: 90vh; overflow: auto; text-align: left; background: linear-gradient(180deg, rgba(12,16,21,.96), rgba(8,11,15,.94)); border: 1px solid var(--line); border-radius: 8px; padding: clamp(22px, 3vw, 38px); box-shadow: 0 24px 70px rgba(0,0,0,.72); }
  .ed-campaign-head { display: flex; justify-content: space-between; gap: 20px; align-items: flex-end; margin-bottom: 20px; }
  .ed-campaign-head h2 { margin: 4px 0 4px; font-size: clamp(28px, 4vw, 44px); }
  .ed-campaign-head .sub { margin: 0; }
  .ed-skirmish-info { text-align: left; font-size: 12px; line-height: 1.55; color: var(--text-dim); background: rgba(232,195,106,0.06); border-left: 3px solid var(--gold-dim); border-radius: 4px; padding: 8px 12px; margin: 8px 0; }
  .ed-skirmish-info b { color: var(--gold); }
  .ed-map-preview { display: block; width: 100%; max-width: 640px; height: auto; margin: 0 auto 8px; border: 1px solid var(--line); border-radius: 4px; image-rendering: auto; }


  .ed-epilogue { width: min(780px, 94vw); max-height: 90vh; overflow: auto; background: linear-gradient(180deg, rgba(15,18,22,.97), rgba(7,10,14,.97)); border-color: rgba(232,195,106,.34); }
  .epilogue-title { font-size: clamp(36px, 6vw, 62px); letter-spacing: 3px; }
  .epilogue-title.win { color: var(--gold); }
  .epilogue-title.lose { color: var(--red); }


  .ed-hotkey-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px 12px; margin: 8px 0; text-align: left; max-height: 180px; overflow: auto; }
  .ed-hotkey-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 11px; color: var(--text-dim); }
  .ed-hotkey-row button { margin: 0; padding: 3px 8px; min-width: 70px; font-size: 11px; }
  .ed-stats { text-align: left; margin: 10px 0 14px; border-top: 1px solid var(--line); padding-top: 10px; }
  .ed-stats-tabs { display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 10px; }
  .ed-stats-tabs button { pointer-events: auto; background: transparent; border: 1px solid var(--line); color: var(--text-dim); border-radius: 4px; padding: 5px 10px; font-size: 11px; font-weight: 700; cursor: pointer; }
  .ed-stats-tabs button.active { background: rgba(232,195,106,.16); border-color: var(--gold); color: var(--gold); }
  .ed-stats-body { background: rgba(10,12,16,.55); border: 1px solid var(--line); border-radius: 6px; padding: 10px; }
  .ed-stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 7px; margin-bottom: 10px; }
  .ed-stats-card { background: var(--panel-2); border: 1px solid var(--line); border-left: 3px solid var(--player-color, var(--line)); border-radius: 5px; padding: 8px 10px; display: flex; flex-direction: column; gap: 2px; font-size: 11px; color: var(--text-dim); }
  .ed-stats-card b { font-size: 12px; color: var(--text); }
  .ed-stats-card strong { color: var(--text); font-size: 21px; line-height: 1.1; }
  .ed-stats-card span { font-size: 10px; }
  .ed-stats-table { width: 100%; border-collapse: collapse; font-size: 11px; margin: 4px 0 10px; }
  .ed-stats-table th, .ed-stats-table td { border-bottom: 1px solid rgba(232,195,106,.12); padding: 4px 6px; text-align: right; }
  .ed-stats-table th:first-child { text-align: left; color: var(--text-dim); font-weight: 600; }
  .ed-stats-table thead th { color: var(--gold); font-size: 11px; border-bottom: 2px solid var(--player-color, transparent); }
  .ed-stats-table thead small { display: block; color: var(--text-dim); font-size: 9px; font-weight: 400; }
  .ed-stats-chart { color: var(--text); }
  .ed-stats-chart svg { width: 100%; height: auto; display: block; overflow: visible; }
  .ed-stats-chart .grid { stroke: rgba(232,195,106,.14); stroke-width: 1; }
  .ed-stats-chart .axis-line { stroke: rgba(232,195,106,.3); stroke-width: 1; }
  .ed-stats-chart .axis { fill: currentColor; opacity: .62; font-size: 9px; }
  .ed-stats-legends { display: flex; flex-wrap: wrap; gap: 4px 12px; font-size: 10px; color: var(--text-dim); margin-top: 2px; }
  .ed-stats-legend { display: inline-flex; align-items: center; gap: 4px; }
  .ed-stats-legend i { width: 8px; height: 8px; border-radius: 2px; display: inline-block; }
  .ed-stats-empty { color: var(--text-dim); font-size: 11px; padding: 6px 0; }
  .ed-stats-tech ul { margin: 4px 0 0; padding-left: 16px; color: var(--text); font-size: 10px; }
  @media (prefers-color-scheme: light) {
    .ed-stats-body { background: #f7f2e5; border-color: #c9b98f; color: #1d1a14; }
    .ed-stats-card { background: #fffaf0; border-color: #d8c9a6; color: #5c513b; }
    .ed-stats-card b, .ed-stats-card strong, .ed-stats-tech ul { color: #1d1a14; }
    .ed-stats-chart { color: #1d1a14; }
    .ed-stats-chart .grid { stroke: rgba(90,70,30,.2); }
    .ed-stats-table thead th { color: #6b4f13; }
    .ed-stats-tabs button.active { background: rgba(120,90,20,.15); border-color: #8a6a1f; color: #6b4f13; }
    :root {
      --stats-food: #9a6b0f;
      --stats-wood: #2f7a4a;
      --stats-silver: #4a6485;
      --stats-stone: #7a5530;
    }
    .ed-stats-table th, .ed-stats-table td { border-bottom-color: rgba(90,70,30,.2); }
    .ed-stats-table th:first-child, .ed-stats-legends { color: #5c513b; }
  }

  .ed-tree-panel { width: min(1080px, 96vw); max-height: 90vh; overflow: auto; text-align: left; }
  .ed-tree { display: flex; flex-direction: column; gap: 14px; margin: 10px 0; }
  .ed-tree-era { border-top: 1px solid var(--line); padding-top: 8px; }
  .ed-tree-era h3 { margin: 0 0 6px; color: var(--gold); font-size: 15px; }
  .ed-tree-cols { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
  .ed-tree-col h4 { margin: 0 0 4px; color: var(--text-dim); font-size: 11px; text-transform: uppercase; letter-spacing: .5px; }
  .ed-tree-item { display: flex; align-items: center; gap: 6px; font-size: 11px; padding: 2px 0; }
  .ed-tree-unique { color: var(--gold); font-size: 10px; margin-left: 4px; }
  .ed-tree-empty { color: var(--text-dim); font-size: 11px; }
  @media (max-width: 700px) { .ed-tree-cols { grid-template-columns: 1fr; } }
  .ed-mission-card.with-art { background-size: cover; background-position: center; }
  .ed-mission-card { position: absolute; inset: 0; z-index: 30; display: flex; align-items: center; justify-content: center; background: rgba(3,6,9,.56); pointer-events: auto; animation: mission-card-in .7s ease; }
  .ed-mission-card .inner { text-align: center; padding: 30px; max-width: 760px; }
  .ed-mission-card .year { color: var(--gold); font-size: 12px; letter-spacing: 4px; text-transform: uppercase; }
  .ed-mission-card h2 { margin: 10px 0 4px; color: #f4e7c2; font-size: clamp(38px, 7vw, 76px); line-height: .98; text-shadow: 0 4px 30px rgba(0,0,0,.7); }
  .ed-mission-card .place { color: var(--text-dim); font-size: 13px; line-height: 1.6; letter-spacing: 1px; max-width: 640px; margin: 0 auto; }
  .ed-mission-card .hint { margin-top: 22px; color: var(--gold-dim); font-size: 10px; letter-spacing: 2px; text-transform: uppercase; }
  @keyframes mission-card-in { from { opacity: 0; } to { opacity: 1; } }

  @keyframes menu-drift { from { background-position: 54% 48%; background-size: 106%; } to { background-position: 60% 54%; background-size: 110%; } }

  @media (max-width: 1100px) {
    #ui-root { --minimap-size: 160px; }
    #ed-desc { flex-basis: 190px; }
    #ed-commands { flex-basis: 190px; }
  }
  @media (max-width: 820px) {
    .ed-menu-shell { width: 100%; padding: 30px 22px 24px; }
    .ed-menu-title { font-size: clamp(38px, 11vw, 62px); }
    .ed-menu-actions { max-width: none; }
    .ed-campaign-head { display: block; }
    .ed-cinematic { padding: 24px; }
    .ed-cinematic-footer { left: 24px; right: 24px; bottom: 20px; }
    .ed-cinematic-progress { display: none; }
    .ed-title-card h1 { letter-spacing: 1px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .ed-cinematic { background-position: center; }
    .ed-cinematic { animation: none !important; background-size: cover; }
    .ed-cinematic-copy, .ed-menu-btn, .ed-mission-card { animation: none !important; transition: none !important; opacity: 1; transform: none; }
  }

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
  .ed-art { margin: 10px 0 12px; }
  .ed-art img { width: 100%; max-height: min(300px, 30vh); object-fit: cover; display: block; border: 1px solid var(--line); border-radius: 6px; background: #0b0d11; }
  .ed-art figcaption { text-align: left; font-size: 11px; line-height: 1.45; color: var(--text-dim); margin-top: 5px; }
  .ed-art-draft { color: var(--gold); }

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
  #ed-tutorial { position: static; order: 1; flex: 0 0 auto; max-height: 40%; overflow-y: auto; width: 100%; background: rgba(12,16,24,0.95); border: 1px solid var(--gold); border-radius: 6px; padding: 12px 16px; box-shadow: 0 8px 30px rgba(0,0,0,0.6); display: none; pointer-events: auto; }
  #ed-tutorial.show { display: block; animation: tutorial-in 0.3s ease; }
  @keyframes tutorial-in { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
  #ed-tutorial .tut-head { display: flex; justify-content: space-between; align-items: center; font-size: 11px; letter-spacing: 2px; color: var(--gold-dim); text-transform: uppercase; }
  #ed-tutorial .tut-step { font-size: 14px; color: var(--text); line-height: 1.5; margin: 8px 0 6px; }
  #ed-tutorial .tut-actions { text-align: right; }
  .ed-hint-pulse { animation: hint-pulse 1.1s ease-in-out infinite; outline: 2px solid var(--gold) !important; outline-offset: 2px; border-radius: 4px; }
  @keyframes hint-pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(232,195,106,0.55); } 50% { box-shadow: 0 0 0 9px rgba(232,195,106,0); } }

  #ed-help { position: relative; order: 2; flex: 0 1 auto; min-height: 0; margin-top: auto; width: 100%; max-height: 35%; overflow-y: auto; font-size: 11px; color: var(--text-dim); background: rgba(10,12,16,0.7); padding: 8px 12px; border-radius: 4px; border: 1px solid rgba(232,195,106,0.15); line-height: 1.5; }
  #ui-root.help-collapsed #ed-help { display: none; }
  .ed-help-close { position: absolute; top: 2px; right: 4px; background: none; border: 0; color: var(--text-dim); font-size: 14px; cursor: pointer; padding: 0 3px; }
  #ed-help-open { position: static; order: 3; align-self: flex-end; margin-top: auto; width: 28px; height: 28px; border-radius: 50%; border: 1px solid rgba(232,195,106,0.35); background: rgba(10,12,16,0.8); color: var(--gold); font-weight: 700; cursor: pointer; display: none; }
  #ui-root.help-collapsed #ed-help-open { display: block; }
  #ed-cursor { position: absolute; width: 20px; height: 20px; pointer-events: none; }
  .ed-error { color: var(--red); font-size: 12px; margin-top: 8px; min-height: 16px; }
  #ed-fps { position: absolute; top: 52px; right: 12px; font-size: 11px; color: var(--text-dim); background: rgba(0,0,0,0.4); padding: 2px 8px; border-radius: 3px; }
  /* Hide the in-game HUD while a modal menu is open */
  #ui-root.menu-open .ed-topbar,
  #ui-root.menu-open #ed-bottom,
  #ui-root.menu-open #ed-minimap-wrap,
  #ui-root.menu-open #ed-right-column,
  #ui-root.menu-open #ed-fps { display: none; }
  .ed-keys { display: grid; grid-template-columns: auto 1fr; gap: 4px 16px; font-size: 13px; color: var(--text-dim); text-align: left; }
  .ed-keys b { color: var(--gold); font-weight: 700; }

  /* Objectives panel (campaign) */
  /* Right-hand column: objectives, tutorial and shortcuts share one stack, so they never cover each
     other nor reach the command bar (issues 401 and 402). */
  #ed-right-column { position: absolute; top: 56px; right: 12px; width: 240px; bottom: calc(var(--ed-command-bar-h, 0px) + 2 * var(--bar-gap)); display: flex; flex-direction: column; gap: 8px; pointer-events: none; }
  #ed-right-column > * { pointer-events: auto; }
  /* Final screens, the pause menu and every other modal own the screen: the objectives column
     must not show through the veil, not even its sticky archive summary (issue 415). */
  #ui-root:has(> .ed-overlay:not(.hidden)) #ed-right-column { display: none; }
  #ed-objectives { position: static; order: 0; flex: 0 1 auto; max-height: 100%; min-height: 104px; display: flex; flex-direction: column; width: 100%; overflow: hidden; background: var(--panel); border: 1px solid var(--line); border-radius: 6px; padding: 10px 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.5); }
  #ed-objectives .obj-list { display: flex; flex-direction: column; flex: 1 1 auto; min-height: 0; overflow: hidden; padding-right: 2px; }
  /* Active goals size to their content: the panel grows into the column's free space and the archive
     yields first. A percentage cap here cut the list through a line (issue 421). */
  #ed-objectives .obj-current { flex: 1 1 auto; max-height: none; min-height: 0; overflow-y: auto; scrollbar-width: thin; scrollbar-color: var(--gold-dim) rgba(0,0,0,0.25); }
  #ed-objectives .obj-current::-webkit-scrollbar { width: 6px; }
  #ed-objectives .obj-current::-webkit-scrollbar-track { background: rgba(0,0,0,0.25); border-radius: 3px; }
  #ed-objectives .obj-current::-webkit-scrollbar-thumb { background: var(--gold-dim); border-radius: 3px; }
  /* When the column is too short even for the active goals, fade the cut edge so the player sees the
     list continues; the thumb above stays visible. */
  #ed-objectives .obj-current.is-scrollable:not(.is-at-end) { -webkit-mask-image: linear-gradient(180deg, #000 calc(100% - 14px), transparent); mask-image: linear-gradient(180deg, #000 calc(100% - 14px), transparent); }
  #ed-objectives .obj-current:focus-visible { outline: 1px solid var(--gold); outline-offset: 2px; }
  #ed-objectives .obj-current:empty { display: none; }
  /* The <details> itself is the scroll container: Chromium does not lay out its slotted children as
     flex items, so a nested flex scroller would overflow the panel instead of scrolling. */
  #ed-objectives details.obj-archive { display: block; flex: 0 1 auto; max-height: 40%; min-height: 1.4em; overflow-y: auto; margin-top: 4px; border-top: 1px solid var(--line); padding-top: 4px; }
  #ed-objectives details.obj-archive > summary { position: sticky; top: 0; z-index: 1; background: var(--panel); cursor: pointer; font-size: 11px; color: var(--text-dim); list-style: none; line-height: 1.4; }
  #ed-objectives details.obj-archive > summary::-webkit-details-marker { display: none; }
  #ed-objectives details.obj-archive > summary:focus-visible { outline: 1px solid var(--gold); outline-offset: 2px; }
  #ed-objectives details.obj-archive[open] > summary { color: var(--green); }
  #ed-objectives h4 { margin: 0 0 8px; font-size: 12px; letter-spacing: 2px; color: var(--gold); text-transform: uppercase; }
  #ed-objectives .obj { display: flex; gap: 8px; align-items: flex-start; font-size: 12px; color: var(--text-dim); padding: 3px 0; line-height: 1.35; }
  #ed-objectives .obj .mark { min-width: 16px; text-align: center; color: var(--text-dim); }
  #ed-objectives .obj.done { color: var(--green); }
  #ed-objectives .obj.done .mark { color: var(--green); }
  #ed-objectives .obj.failed { color: var(--red); }
  #ed-objectives .obj.failed .mark { color: var(--red); }

  #ed-dialogue { position: absolute; left: 50%; transform: translateX(-50%); width: min(560px, 86vw); background: rgba(12,14,18,0.92); border: 1px solid var(--line); border-left: 3px solid var(--gold); border-radius: 4px; padding: 10px 14px; opacity: 0; pointer-events: none; transition: opacity 0.25s ease; background-image: var(--weave); background-repeat: repeat-x; background-position: top; }
  /* The dialogue sits above the command bar, whose height changes with the selected
     panel; the floor keeps them clear of the minimap while nothing is selected. */
  #ed-dialogue { bottom: max(var(--panel-floor), calc(var(--ed-command-bar-h, 0px) + 2 * var(--bar-gap))); }
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

/**
 * Persistent HUD panels that must stop edge scrolling even though the HUD root is
 * `pointer-events:none`: `elementFromPoint` only sees controls whose own `pointer-events` is `auto`.
 * Add any new always-on panel here. The top bar is deliberately absent: its top edge is the physical
 * screen edge, and its buttons keep `pointer-events:auto`, so hovering them still blocks the pan.
 */
const EDGE_GUARD_SELECTOR =
  '#ed-bottom, #ed-minimap-wrap, #ed-objectives, #ed-tutorial, #ed-help, #ed-help-open, #ed-fps, #ed-toasts, #ed-alerts, #ed-dialogue';

/** Visible toast stack cap: repeated events refresh one toast instead of flooding the screen. */
const MAX_TOASTS = 4;
/** How long an idle toast stays before fading (ms). */
const TOAST_LIFETIME = 2600;

export class HUD {
  game: Game;
  private root: HTMLDivElement;
  private resEls: Record<string, HTMLElement> = {} as any;
  private popEl!: HTMLElement;
  private idleEl!: HTMLElement;
  private eraEl!: HTMLElement;
  private eraDot!: HTMLElement;
  private bottomEl!: HTMLElement;
  private bottomHeader!: HTMLElement;
  /** Persistent HUD panels that swallow edge scrolling even when they are pointer-events:none. */
  private edgeGuardEls: HTMLElement[] = [];
  private descEl!: HTMLElement;
  private gridEl!: HTMLElement;
  private commandsEl!: HTMLElement;
  private toastsEl!: HTMLElement;
  /** Live toasts keyed by type + message: repeats refresh the timer and show ×N. */
  private toasts = new Map<string, { el: HTMLElement; count: number; timer: number }>();
  private minimapCanvas!: HTMLCanvasElement;
  private minimapCtx!: CanvasRenderingContext2D;
  private bannerEl!: HTMLElement;
  private updateAcc = 0;
  private bottomKey = '';
  private hotkeySlot = 0;
  private rightColumnEl!: HTMLElement;
  private objPanelEl!: HTMLElement;
  private objListEl!: HTMLElement;
  /** Objective state last rendered, so the archive `<details>` survives the 0.15 s refresh. */
  private objSignature = '';
  /** The campaign-only folded-shortcuts default is applied when the mission first exists. */
  private helpDefaultApplied = false;
  private dialogueEl!: HTMLElement;
  private dialogueTimer = 0;
  private hoverEl!: HTMLElement;
  private selBoxEl!: HTMLElement;
  private damage!: DamageNumbers;
  private cursorEl!: HTMLElement;
  private alertsEl!: HTMLElement;
  private alertPings: { x: number; z: number; until: number; discovery?: boolean }[] = [];
  /** Last time each unit/reason alert was shown, to avoid notification spam. */
  private alertLastAt = new Map<string, number>();
  private tutorialEl!: HTMLElement;
  private tutorialStepEl!: HTMLElement;
  private tutorialCountEl!: HTMLElement;
  private missionCard: HTMLElement | null = null;
  private commandBarObserver!: ResizeObserver;
  /** Re-evaluates the objectives scroll affordance when the column, tutorial or list changes size. */
  private objectivesObserver!: ResizeObserver;

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
    // Objectives, tutorial and shortcuts share one right-hand column (they must never overlap).
    this.rightColumnEl = this.el('div', '', this.root);
    this.rightColumnEl.id = 'ed-right-column';
    this.buildHelp();
    this.buildFps();
    this.buildObjectivesPanel();
    this.buildDialogue();
    this.buildTutorial();
    this.buildHover();
    this.buildDamageCursor();
    this.buildAlerts();
    this.commandBarObserver = new ResizeObserver(() => this.syncCommandBarHeight());
    this.commandBarObserver.observe(this.bottomEl);
    this.syncCommandBarHeight();
    this.objectivesObserver = new ResizeObserver(() => this.syncObjectivesScroll());
    this.objectivesObserver.observe(this.objListEl);
    this.syncObjectivesScroll();
    this.edgeGuardEls = Array.from(this.root.querySelectorAll<HTMLElement>(EDGE_GUARD_SELECTOR));
    bus.on('alert', (info) => this.pushAlert(info));
    game.onDestroy(() => this.dispose());
  }

  dispose(): void {
    this.commandBarObserver.disconnect();
    this.objectivesObserver.disconnect();
    for (const entry of this.toasts.values()) window.clearTimeout(entry.timer);
    this.toasts.clear();
    this.toastsEl?.replaceChildren();
  }

  /** Publish the command bar height so the dialogue can sit above it. */
  private syncCommandBarHeight(): void {
    const visible = this.bottomEl.style.display !== 'none';
    const height = visible ? Math.ceil(this.bottomEl.getBoundingClientRect().height) : 0;
    this.root.style.setProperty('--ed-command-bar-h', `${height}px`);
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

  /** Clickable alert that centers and (for unit alerts) selects the subject. */
  pushAlert(info: {
    icon: string;
    text: string;
    x: number;
    z: number;
    warn?: boolean;
    unitId?: number;
    reason?: AlertReason;
  }): void {
    const now = performance.now();
    if (info.unitId !== undefined) {
      const key = `${info.unitId}:${info.reason ?? info.text}`;
      const last = this.alertLastAt.get(key);
      if (last !== undefined && now - last < 6000) return;
      this.alertLastAt.set(key, now);
      if (this.alertLastAt.size > 100) {
        for (const [k, t] of this.alertLastAt) if (now - t > 120000) this.alertLastAt.delete(k);
      }
    }
    const el = document.createElement('div');
    el.className = 'ed-alert' + (info.warn ? ' warn' : '');
    el.innerHTML = `${info.icon} ${info.text}`;
    if (info.unitId !== undefined) el.dataset.unitId = String(info.unitId);
    el.addEventListener('click', () => {
      if (info.unitId !== undefined) this.game.focusUnit(info.unitId);
      else this.game.camera.focusOn(info.x, info.z);
      el.remove();
    });
    this.alertsEl.prepend(el);
    while (this.alertsEl.children.length > 5) this.alertsEl.lastChild?.remove();
    this.pingMap(info.x, info.z);
    setTimeout(() => el.remove(), 9000);
  }

  private pingMap(x: number, z: number, discovery = false): void {
    this.alertPings.push({ x, z, until: performance.now() + 6000, discovery });
  }

  /** Announce a newly revealed site and ping it on the minimap without covering the objectives. */
  showDiscovery(name: string, x: number, z: number): void {
    this.showToast(t('hud.discovery', { name }), 'info');
    this.pingMap(x, z, true);
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
    logo.innerHTML = `<svg viewBox="0 0 32 32" fill="none"><path d="M16 3l2.6 7.8L26 13l-7.4 2.2L16 23l-2.6-7.8L6 13l7.4-2.2z" fill="#e8c36a"/><path d="M16 18v9M12 27h8" stroke="#e8c36a" stroke-width="1.6"/></svg> ${t('app.title')}`;
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
    this.idleEl = this.el('div', 'ed-idle', top);
    this.idleEl.id = 'ed-idle';
    this.idleEl.title = t('hud.topbar.idle');
    this.idleEl.innerHTML = `👷 <span class="idle-val">0</span>`;
    this.idleEl.addEventListener('click', () => this.game.cycleIdleWorker());
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
    pauseBtn.title = t('hud.topbar.pauseTitle');
    pauseBtn.addEventListener('click', () => this.game.togglePause());
    top.appendChild(pauseBtn);
    const menuBtn = this.el('button', 'ed-topbtn') as HTMLButtonElement;
    menuBtn.textContent = t('hud.topbar.menu');
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
    this.objPanelEl = this.el('div', '', this.rightColumnEl);
    this.objPanelEl.id = 'ed-objectives';
    this.objPanelEl.style.display = 'none';
    this.objPanelEl.innerHTML = `<h4>${t('hud.objectives.title')}</h4>`;
    this.objListEl = this.el('div', 'obj-list', this.objPanelEl);
    // The active list is rebuilt on every refresh, so listen on the stable container (capture).
    this.objListEl.addEventListener('scroll', () => this.syncObjectivesFade(), true);
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
    this.tutorialEl = this.el('div', '', this.rightColumnEl);
    this.tutorialEl.id = 'ed-tutorial';
    this.tutorialEl.innerHTML = `<div class="tut-head"><span>${t('hud.tutorial.title')}</span><span class="tut-count"></span></div><div class="tut-step"></div><div class="tut-actions"></div>`;
    this.tutorialStepEl = this.tutorialEl.querySelector('.tut-step') as HTMLElement;
    this.tutorialCountEl = this.tutorialEl.querySelector('.tut-count') as HTMLElement;
  }

  /** Show/update the tutorial panel. `onSkip` adds the skip button. */
  showTutorialStep(text: string, index: number, total: number, onSkip?: () => void): void {
    this.tutorialStepEl.textContent = text;
    this.tutorialCountEl.textContent = t('hud.tutorial.step', { current: index + 1, total });
    const actions = this.tutorialEl.querySelector('.tut-actions') as HTMLElement;
    actions.innerHTML = '';
    if (onSkip) {
      const skip = document.createElement('button');
      skip.className = 'ed-ghostbtn';
      skip.style.margin = '0';
      skip.textContent = t('hud.tutorial.skip');
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
    if (!mis || this.isMissionCardOpen()) return;
    this.objPanelEl.style.display = '';
    // `wait` beats (Caral's prosperity) are narrative; a countdown would read as a chore.
    const items = mis.activeObjectives.filter(({ def }) => def.kind !== 'wait');
    const titles = this.objectiveTitles(items.map(({ def }) => def));
    const rows = items.map((item, i) => ({
      def: item.def,
      state: item.state,
      title: titles[i],
      progress: item.state === 'activo' ? mis.getObjectiveProgress(item.def.id) : null,
    }));
    // Re-render only when something visible changes, so the archive's open state is not lost.
    const signature = rows
      .map((row) => {
        const p = row.progress;
        // Time goals rebuild once per displayed second, not on every tick.
        const value = p ? (p.format === 'time' ? Math.ceil(p.current) : Math.floor(p.current)) : '';
        return `${row.def.id}:${row.state}:${p ? `${p.format}:${value}/${p.target}` : ''}`;
      })
      .join('|');
    if (signature === this.objSignature) return;
    this.objSignature = signature;
    const archiveDetails = this.objListEl.querySelector('details');
    const archiveWasOpen = archiveDetails?.open ?? false;
    const archiveScroll = archiveDetails?.scrollTop ?? 0;
    const currentScroll = (this.objListEl.querySelector('.obj-current') as HTMLElement | null)?.scrollTop ?? 0;
    const current = rows.filter((row) => row.state === 'activo' || row.state === 'pendiente');
    const done = rows.filter((row) => row.state !== 'activo' && row.state !== 'pendiente');
    const rowHtml = (row: (typeof rows)[number]): string => {
      const cls = row.state === 'completed' ? 'done' : row.state === 'failed' ? 'failed' : '';
      const suffix = row.progress ? ` (${this.objectiveProgressText(row.progress)})` : '';
      return `<div class="obj ${cls}"><span class="mark">${this.objectiveMark(row.state)}</span><span>${row.title}${suffix}</span></div>`;
    };
    const archive = done.length
      ? `<details class="obj-archive"${archiveWasOpen ? ' open' : ''}><summary>${this.archiveSummary(rows, done.length)}</summary>${done
          .map(rowHtml)
          .join('')}</details>`
      : '';
    // The current goals live in their own region: expanding the archive never scrolls them away.
    this.objListEl.innerHTML =
      `<div class="obj-current" role="region" tabindex="0" aria-label="${t('hud.objectives.active')}">${current
        .map(rowHtml)
        .join('')}</div>` + archive;
    const details = this.objListEl.querySelector('details');
    if (details) details.scrollTop = archiveScroll;
    const currentEl = this.objListEl.querySelector('.obj-current') as HTMLElement | null;
    if (currentEl) currentEl.scrollTop = currentScroll;
    this.syncObjectivesScroll();
  }

  /**
   * Flag the active list when it really scrolls (thin thumb + faded cut edge) and end the visible area
   * on a whole row, so a long list never shows half a line at rest (issue 421).
   */
  private syncObjectivesScroll(): void {
    const current = this.objListEl.querySelector('.obj-current') as HTMLElement | null;
    if (!current) return;
    current.style.removeProperty('max-height');
    const available = current.clientHeight;
    const overflowing = current.scrollHeight > available + 1;
    if (!overflowing) {
      current.classList.remove('is-scrollable', 'is-at-end');
      return;
    }
    const top = current.getBoundingClientRect().top;
    let whole = 0;
    for (const row of current.querySelectorAll<HTMLElement>('.obj')) {
      const rect = row.getBoundingClientRect();
      const bottom = rect.bottom - top + current.scrollTop;
      if (bottom <= available + 0.5) whole = Math.max(whole, bottom);
    }
    // Stop half a pixel short of the next row so its padding cannot peek under the fade.
    if (whole > 0) current.style.maxHeight = `${Math.max(0, whole - 0.5)}px`;
    current.classList.add('is-scrollable');
    this.syncObjectivesFade();
  }

  /** The bottom fade disappears once the list is scrolled to its end, so the last row is not dimmed. */
  private syncObjectivesFade(): void {
    const current = this.objListEl.querySelector('.obj-current') as HTMLElement | null;
    if (!current) return;
    const atEnd = current.scrollTop + current.clientHeight >= current.scrollHeight - 1;
    current.classList.toggle('is-at-end', atEnd);
    current.classList.toggle('is-scrollable', current.scrollHeight > current.clientHeight + 1);
  }

  /**
   * One line for the finished goals, grouped by act: "Finalizados (7) · Acto I ✔ 2/2 · Acto II ✔ 3/5".
   * Only acts that appear in the titles are grouped; a failure is marked, never counted as a success.
   */
  private archiveSummary(rows: { def: { title: string }; state: ObjState }[], finished: number): string {
    const acts = new Map<string, { done: number; failed: number; total: number }>();
    for (const row of rows) {
      const act = ACT_TITLE.exec(row.def.title)?.[1];
      if (!act) continue;
      const counts = acts.get(act) ?? { done: 0, failed: 0, total: 0 };
      counts.total++;
      if (row.state === 'completed') counts.done++;
      else if (row.state === 'failed') counts.failed++;
      acts.set(act, counts);
    }
    const parts = [...acts]
      .filter(([, counts]) => counts.done + counts.failed > 0)
      .map(([act, counts]) => `${act} ✔ ${counts.done}/${counts.total}${counts.failed ? ` · ✖ ${counts.failed}` : ''}`);
    if (!parts.length) return t('hud.objectives.archive', { count: finished });
    const others = rows.filter((row) => !ACT_TITLE.test(row.def.title));
    const otherDone = others.filter((row) => row.state === 'completed').length;
    if (otherDone > 0) parts.push(`${t('hud.objectives.archiveOther')} ✔ ${otherDone}/${others.length}`);
    return `${t('hud.objectives.archive', { count: finished })} · ${parts.join(' · ')}`;
  }

  private objectiveMark(state: ObjState): string {
    return state === 'completed' ? '✔' : state === 'failed' ? '✖' : '○';
  }

  private objectiveProgressText(p: ObjectiveProgress): string {
    if (p.format === 'time') return `${this.clockText(p.current)} / ${this.clockText(p.target)}`;
    const current = Math.max(0, Math.min(p.current, p.target));
    return `${Math.floor(current)}/${p.target}`;
  }

  private clockText(seconds: number): string {
    const s = Math.max(0, Math.ceil(seconds));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  /** Titles with a leading "o" for alternatives and a suffix for bonus objectives. */
  private objectiveTitles(objs: { title: string; group?: string; optional?: boolean }[]): string[] {
    const seen = new Set<string>();
    return objs.map((o) => {
      let title = o.title;
      if (o.group) {
        if (seen.has(o.group)) title = t('hud.objectives.alternative') + title;
        seen.add(o.group);
      }
      if (o.optional) title += t('hud.objectives.optionalSuffix');
      return title;
    });
  }

  private buildEraBanner(): void {
    this.bannerEl = this.el('div', '');
    this.bannerEl.id = 'ed-era-banner';
    this.bannerEl.innerHTML = `<div class="years"></div><div class="name"></div>`;
  }

  private buildHelp(): void {
    const help = this.el('div', '', this.rightColumnEl);
    help.id = 'ed-help';
    help.innerHTML = `<button class="ed-help-close" type="button" aria-label="${t('hud.help.closeAria')}" title="${t('hud.help.closeTitle')}">×</button>${t(
      'hud.help.body',
      {
        keys: `${formatHotkeys('game', this.game.settings.hotkeys)} · ${formatHotkeys('camera', this.game.settings.hotkeys)}`,
      },
    )}`;
    help.querySelector('.ed-help-close')?.addEventListener('click', () => this.toggleHelp());
    const open = this.el('button', '', this.rightColumnEl) as HTMLButtonElement;
    open.id = 'ed-help-open';
    open.type = 'button';
    open.textContent = '?';
    open.title = t('hud.help.openTitle');
    open.setAttribute('aria-label', t('hud.help.openTitle'));
    open.addEventListener('click', () => this.toggleHelp());
  }

  private refreshHelp(): void {
    const keys = this.root.querySelector('.ed-help-keys');
    if (keys) {
      keys.textContent = `${formatHotkeys('game', this.game.settings.hotkeys)} · ${formatHotkeys('camera', this.game.settings.hotkeys)}`;
    }
  }

  showTechTree(): void {
    const p = this.game.players[0];
    const civ = p?.civ;
    const allowedUnits = this.game.mission?.def.allowedUnits;
    openTechTree(
      this.root,
      () => {},
      civ
        ? {
            civ,
            period: this.game.settings.period,
            era: p.era,
            // The civic center is never placed but always stands, and its technologies are researched there.
            canBuild: (kind) => kind === BuildingKind.CENTER || this.game.canBuildKind(kind),
            canTrain: (kind) => !allowedUnits || allowedUnits.includes(kind),
            canResearch: (techId) => this.game.canResearchTech(techId),
            buildingName: (kind) => this.game.buildingName(kind),
            buildingIcon: (kind) => this.game.buildingIcon(kind),
          }
        : undefined,
    );
  }

  /** Show/hide the in-match shortcut panel (?). */
  toggleHelp(): void {
    this.root.classList.toggle('help-collapsed');
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
    const key = type + '|' + msg;
    const existing = this.toasts.get(key);
    const entry =
      existing && existing.el.isConnected ? existing : { el: this.el('div', 'ed-toast ' + type), count: 0, timer: 0 };
    entry.count++;
    entry.el.textContent = entry.count > 1 ? `${msg} ×${entry.count}` : msg;
    window.clearTimeout(entry.timer);
    entry.timer = window.setTimeout(() => {
      // A newer toast may have reused this key while the old one was being replaced.
      if (this.toasts.get(key) === entry) this.dismissToast(key);
    }, TOAST_LIFETIME);
    // The most recently refreshed toast sits at the bottom, so the cap drops the least recent one.
    this.toasts.delete(key);
    this.toasts.set(key, entry);
    this.toastsEl.appendChild(entry.el);
    while (this.toasts.size > MAX_TOASTS) {
      const oldest = this.toasts.keys().next().value;
      if (oldest === undefined) break;
      this.dismissToast(oldest, true);
    }
    this.trimToasts();
  }

  /** Keep the DOM stack at `MAX_TOASTS`, dropping faded nodes that are no longer tracked. */
  private trimToasts(): void {
    const live = new Set([...this.toasts.values()].map((entry) => entry.el));
    for (const el of [...this.toastsEl.children]) {
      if (this.toastsEl.children.length <= MAX_TOASTS) break;
      if (!live.has(el as HTMLElement)) el.remove();
    }
  }

  /** Remove a toast now (`immediate`) or after its fade. */
  private dismissToast(key: string, immediate = false): void {
    const entry = this.toasts.get(key);
    if (!entry) return;
    this.toasts.delete(key);
    window.clearTimeout(entry.timer);
    if (immediate) {
      entry.el.remove();
      return;
    }
    entry.el.style.transition = 'opacity 0.4s';
    entry.el.style.opacity = '0';
    window.setTimeout(() => {
      entry.el.remove();
      this.trimToasts();
    }, 400);
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
    panel.innerHTML = `<h2 style="color:var(--gold)">${t('hud.pause.title')}</h2><div class="sub">${t('hud.pause.sub')}</div>`;
    const row = this.el('div', 'row', panel);
    const resume = this.el('button', 'ed-primary', row);
    resume.textContent = t('hud.pause.resume');
    resume.addEventListener('click', () => this.game.togglePause());
    const save = this.el('button', 'ed-ghostbtn', row);
    save.textContent = t('hud.pause.save');
    save.addEventListener('click', () => {
      if (this.game.saveMatch()) this.showToast(t('hud.toast.saved'), 'success');
      else this.showToast(t('hud.toast.saveFailed'), 'error');
    });
    const tree = this.el('button', 'ed-ghostbtn', row);
    tree.textContent = t('hud.techTree.title');
    tree.addEventListener('click', () => this.showTechTree());
    const settings = this.el('button', 'ed-ghostbtn', row);
    settings.textContent = t('hud.pause.options');
    settings.addEventListener('click', () => this.showOptions());
    const home = this.el('button', 'ed-ghostbtn', row);
    home.textContent = t('hud.pause.mainMenu');
    home.addEventListener('click', () => {
      this.game.saveRecording();
      location.href = location.pathname;
    });
    const quit = this.el('button', 'ed-ghostbtn', row);
    quit.textContent = t('hud.pause.quit');
    quit.addEventListener('click', () => this.abandonMatch());
  }

  /** True if a modal menu is open (other than the pause panel). */
  hasBlockingOverlay(): boolean {
    return [...this.root.querySelectorAll('.ed-overlay')].some(
      (o) => o.id !== 'ed-paused' && !o.classList.contains('hidden'),
    );
  }

  /**
   * True if the pointer is over a HUD panel or control (not the game view). `#ui-root` is
   * `pointer-events:none`, so `elementFromPoint` only sees real controls; the persistent panels
   * are hit-tested by their rects because their backgrounds and gaps would otherwise leak through.
   */
  isPointerOverUi(x: number, y: number): boolean {
    for (const panel of this.edgeGuardEls) {
      const r = panel.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return true;
    }
    const el = document.elementFromPoint(x, y);
    return !!el && this.root.contains(el);
  }

  showVictory(victory: boolean, winText?: string, loseText?: string): void {
    this.game.loop.stop();
    this.clearOverlays();
    const ov = this.el('div', 'ed-overlay');
    const panel = this.el('div', 'ed-panel ed-epilogue', ov);
    const p = this.game.players[0];
    const mis = this.game.mission?.def;
    const edu = mis ? getEducational(mis.id) : undefined;
    const campaign = mis ? getCampaignForMission(mis.id) : undefined;
    if (victory && mis?.epilogueImage) {
      ov.style.background = `linear-gradient(180deg, rgba(6,8,12,.55), rgba(6,8,12,.86)), url("${publicAsset(mis.epilogueImage)}") center / cover`;
    }
    const title = victory ? t('hud.victory.title') : t('hud.victory.defeat');
    const sub =
      winText && loseText ? (victory ? winText : loseText) : victory ? t('hud.victory.win') : t('hud.victory.lose');
    const epilogue =
      victory && edu?.epilogue
        ? `<div class="ed-hist"><b style="color:var(--gold)">${t('hud.victory.epilogue')}</b> ${edu.epilogue}</div>
           <div class="ed-note" style="font-size:12px;color:var(--text-dim);margin-bottom:12px">
             ${t('hud.victory.epilogueHint')}
           </div>`
        : '';
    const optional = victory
      ? (this.game.mission?.activeObjectives ?? []).filter(({ def, state }) => def.optional && state !== 'pendiente')
      : [];
    const optionalSummary = optional.length
      ? `<div class="ed-hist" style="padding:8px 0"><b style="color:var(--gold)">${t('hud.victory.optional')}</b><br>${optional
          .map(
            ({ def, state }) =>
              `${state === 'completed' ? '✔' : state === 'failed' ? '✖' : '○'} ${escapeHtml(def.title)}`,
          )
          .join('<br>')}</div>`
      : '';
    this.game.matchStats.captureNow(this.game.players, this.game.units.values(), this.game.buildings.values());
    const peaceful = mis?.enemy.active === false;
    const commonStats = `${t('hud.victory.created', { count: p?.stats.created ?? 0 })}<br>
         ${t('hud.victory.period', { period: getPeriod(this.game.settings.period).name })}`;
    const stats = peaceful
      ? `${t('hud.victory.heritage', { count: this.game.getVisitedHeritage().length })}<br>${commonStats}`
      : `${t('hud.victory.kills', { count: p?.kills ?? 0 })}<br>${commonStats}`;
    if (victory && mis) this.saveCampaignProgress(mis.id);
    const next = victory ? nextReleasedMission(mis?.id ?? '') : undefined;
    const chapterEnd = victory && campaign && campaign.releasedMissionIds.includes(mis?.id ?? '') && !next;
    const chapterIndex = campaign ? CAMPAIGNS.findIndex((c) => c.id === campaign.id) : -1;
    const ordinalKey = chapterIndex >= 0 && chapterIndex < ORDINAL_KEYS.length ? ORDINAL_KEYS[chapterIndex] : null;
    const chapterEndText = ordinalKey
      ? t('hud.victory.chapterEnd', { ordinal: t(ordinalKey) })
      : t('hud.victory.chapterEndGeneric');
    panel.innerHTML = `
      <div class="ed-menu-kicker">${campaign ? campaign.title.toUpperCase() : t('app.series')}${mis ? ` · ${mis.subtitle}` : ''}</div>
      <h2 class="epilogue-title ${victory ? 'win' : 'lose'}">${title}</h2>
      <div class="sub" style="white-space:pre-line;line-height:1.6">${sub}</div>
      ${epilogue}
      ${optionalSummary}
      <div style="font-size:12px;color:var(--text-dim);line-height:1.7;margin-bottom:14px">${stats}</div>
      <div id="ed-stats-panel" class="ed-stats"></div>
      ${chapterEnd ? `<div class="ed-hist" style="border-left:3px solid var(--gold);padding-left:12px"><b style="color:var(--gold)">${chapterEndText}</b> ${t('hud.victory.chapterEndHint')}</div>` : ''}
    `;
    const statsRoot = panel.querySelector<HTMLElement>('#ed-stats-panel');
    if (statsRoot) {
      // A mission without an active enemy has no rival to compare against: the empty "(IA)" column
      // only made it look like a player who did nothing (issue 403).
      const compared = peaceful ? this.game.players.filter((player) => player.id === 0) : this.game.players;
      mountMatchStats(
        statsRoot,
        this.game.matchStats.samples,
        compared.map((player) => ({
          id: player.id,
          name: player.name,
          civ: player.civ,
          colorHex: player.colorHex,
        })),
        { playerId: 0, combat: !peaceful },
      );
    }
    const row = this.el('div', 'row', panel);
    if (next) {
      const nextButton = this.el('button', 'ed-primary', row);
      nextButton.textContent = t('hud.victory.continue', { title: next.title });
      nextButton.addEventListener('click', () => {
        this.game.settings.missionId = next.id;
        this.game.resetGame();
      });
    } else if (victory && campaign) {
      const hub = this.el('button', 'ed-primary', row);
      hub.textContent = t('hud.victory.backCampaigns');
      hub.addEventListener('click', () => {
        this.setMenuOpen(true);
        this.showCampaignHub();
      });
    }
    const again = this.el('button', next || (victory && campaign) ? 'ed-ghostbtn' : 'ed-primary', row);
    again.textContent = t('hud.victory.playAgain');
    again.addEventListener('click', () => this.game.resetGame());
    const menu = this.el('button', 'ed-ghostbtn', row);
    menu.textContent = t('hud.victory.mainMenu');
    menu.addEventListener('click', () => {
      location.href = location.pathname + '?menu=1';
    });
    const replay = this.game.lastReplay;
    if (replay) {
      const replayRow = this.el('div', 'row', panel);
      const watch = this.el('button', 'ed-ghostbtn', replayRow);
      watch.textContent = t('hud.victory.watchReplay');
      watch.dataset.statsReplay = 'watch';
      watch.addEventListener('click', () => {
        if (!saveReplay(replay)) {
          this.showToast(t('hud.victory.replayOpenFailed'), 'error');
          return;
        }
        location.href = location.pathname + '?replay=1';
      });
      const save = this.el('button', 'ed-ghostbtn', replayRow);
      save.textContent = t('hud.victory.saveReplay');
      save.dataset.statsReplay = 'save';
      save.addEventListener('click', () => {
        const saved = saveReplay(replay);
        this.showToast(
          saved ? t('hud.victory.replaySaved') : t('hud.victory.replaySaveFailed'),
          saved ? 'success' : 'error',
        );
      });
    }
  }

  private deliverySignature(heritageId: HeritageBuildingId): string {
    const delivery = this.game.mission?.activeDeliveryFor(heritageId);
    if (!delivery) return '';
    // The gate includes the worker proximity and the shortfall, so the button re-enables as soon
    // as a worker arrives or the stock is topped up (issue 387).
    const gate = this.game.deliveryGate(heritageId);
    const state = gate.ok ? 'ok' : `${gate.reason}:${gate.missing}`;
    return `:d${delivery.def.id}=${delivery.delivered}:g${state}`;
  }

  /** Chapter card between the acts of one mission; the mission clock waits while it is open. */
  showActCard(kicker: string, title: string, text: string, image?: string): void {
    this.showChapterCard(kicker, title, text, false, image);
  }

  /** A mission's narrated intro (per-beat backdrops), then `done` (the briefing). */
  playMissionIntro(mis: MissionDef, done: () => void): void {
    const beats = mis.intro ?? [];
    if (!beats.length) {
      done();
      return;
    }
    // The world waits behind the intro, as it does behind the briefing (the mission clock must not run).
    if (!this.game.getPaused()) this.game.togglePause();
    this.game.audio.cinematicSting?.();
    new CinematicPlayer(this.root, {
      beats,
      background: MENU_BACKDROP,
      kicker: mis.title.toUpperCase(),
      finalLabel: t('hud.cinematic.toBriefing'),
      onDone: done,
    });
  }

  /** Whether the map has a node of this kind (cached per match: nodes never appear later). */
  private resourceOnMap(kind: string): boolean {
    let cached = this.resourceKinds;
    if (!cached || cached.match !== this.game) {
      const kinds = new Set<string>();
      for (const n of this.game.resourceNodes.values()) kinds.add(n.kind);
      cached = this.resourceKinds = { match: this.game, kinds };
    }
    return cached.kinds.has(kind);
  }

  private resourceKinds: { match: unknown; kinds: Set<string> } | null = null;

  /** True while the chapter card is on screen (its absence means the mission may advance). */
  isMissionCardOpen(): boolean {
    return this.missionCard !== null && this.missionCard.isConnected;
  }

  /** Chapter title card shown over the opening camera flight. */
  private showMissionTitle(mis: MissionDef): void {
    const [year, place] = mis.subtitle.split('·').map((part) => part.trim());
    this.showChapterCard(
      `${year ?? ''}${place ? ` · ${place}` : ''}`,
      mis.title,
      mis.history.split('\n')[0] ?? '',
      true,
    );
  }

  private showChapterCard(kicker: string, title: string, text: string, autoDismiss: boolean, image?: string): void {
    this.missionCard?.remove();
    const card = this.el('div', 'ed-mission-card');
    if (image) {
      card.classList.add('with-art');
      card.style.backgroundImage = `linear-gradient(180deg, rgba(3,6,9,.25), rgba(3,6,9,.82) 70%), url("${publicAsset(image)}")`;
    }
    card.innerHTML = `
      <div class="inner">
        <div class="year">${kicker}</div>
        <h2>${title}</h2>
        <div class="place">${text}</div>
        <div class="hint">${t('hud.missionCard.hint')}</div>
      </div>
    `;
    this.missionCard = card;
    const dismiss = () => {
      card.remove();
      if (this.missionCard === card) this.missionCard = null;
    };
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', t('hud.missionCard.aria'));
    card.addEventListener('click', dismiss);
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        dismiss();
      }
    });
    card.focus();
    if (autoDismiss && new URLSearchParams(location.search).get('cardhold') !== '1') window.setTimeout(dismiss, 15000);
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

  private applyHotkey(el: HTMLElement): void {
    if (this.hotkeySlot >= COMMAND_SLOT_COUNT) return;
    // Decorative chips opt out so they neither take a slot nor show a key (the heritage
    // «Certeza» card used to eat Q). Real commands keep their slot when disabled, so keys
    // stay stable as stock changes (issue 387).
    if (el.dataset.noHotkey === '1') return;
    const action = `command${this.hotkeySlot + 1}` as HotkeyAction;
    const key = keyFor(action, this.game.settings.hotkeys);
    this.hotkeySlot++;
    if (!key) return;
    el.dataset.hotkey = key;
    const label = document.createElement('span');
    label.className = 'ed-hotkey';
    label.textContent = key === ' ' ? '␣' : key.toUpperCase();
    el.appendChild(label);
  }

  /** Run the visible command card/button bound to a key. */
  triggerHotkey(key: string): boolean {
    if (!key) return false;
    const el = this.root.querySelector<HTMLElement>(`[data-hotkey="${window.CSS.escape(key)}"]`);
    if (!el || el.classList.contains('disabled')) return false;
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
    return true;
  }

  private addCard(
    icon: string,
    name: string,
    costText: string,
    onClick: () => void,
    opts: { disabled?: boolean; afford?: boolean; cat?: string; progress?: number; hotkey?: boolean } = {},
  ): HTMLElement {
    const card = this.el(
      'div',
      'ed-card' +
        (opts.disabled ? ' disabled' : '') +
        (opts.afford ? ' afford' : '') +
        (opts.cat ? ' cat-' + opts.cat : ''),
    );
    if (opts.hotkey === false) card.dataset.noHotkey = '1';
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
    this.applyHotkey(card);
    this.gridEl.appendChild(card);
    return card;
  }

  private addCommand(
    label: string,
    onClick: () => void,
    title = '',
    opts: { disabled?: boolean; hotkey?: boolean } = {},
  ): void {
    const btn = this.el('button', 'ed-command') as HTMLButtonElement;
    btn.textContent = label;
    btn.title = title;
    if (opts.hotkey === false) btn.dataset.noHotkey = '1';
    if (opts.disabled) {
      btn.classList.add('disabled');
      btn.disabled = true;
    } else {
      btn.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        onClick();
      });
    }
    this.applyHotkey(btn);
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
    const heritage = this.game.getSelectedHeritage();
    // the command panel only appears with a selection (0 A.D.-style)
    if (units.length === 0 && !building && !heritage) {
      this.bottomEl.style.display = 'none';
      return;
    }
    this.bottomEl.style.display = '';
    this.commandsEl.innerHTML = '';
    this.hotkeySlot = 0;

    if (units.length > 0) {
      this.renderUnitPanel(units);
    } else if (building && building.owner === 0) {
      this.renderBuildingPanel(building);
    } else if (building && building.owner !== 0) {
      this.setDesc(
        '🏰',
        this.game.buildingName(building.kind),
        t('hud.heritage.enemyBase', { hp: Math.ceil(building.hp), maxHp: Math.ceil(building.maxHp) }),
      );
      this.clearGrid();
      this.addCommand(t('hud.heritage.attack'), () => this.orderAttackBuilding(building.id));
    } else if (heritage) {
      this.renderHeritagePanel(heritage);
    }
  }

  private renderHeritagePanel(heritage: HeritageBuildingDef): void {
    const visited = this.game.isHeritageVisited(heritage.id);
    this.setDesc(
      '🏛️',
      heritage.name,
      `${heritage.sector} · ${heritage.role}<br><span style="color:var(--text-dim)">${heritage.summary}</span><br><span style="color:var(--text-dim);font-size:11px">${t('hud.heritage.source', { source: heritage.citation })}</span>`,
    );
    this.clearGrid();
    this.addCard(
      '📚',
      t('hud.heritage.certainty', { confidence: heritage.confidence }),
      visited ? t('hud.heritage.fieldRecord') : t('hud.heritage.fieldCard'),
      () => {},
      {
        disabled: true,
        cat: 'sel',
        hotkey: false,
      },
    );
    if (heritage.operation === 'toggle-canal') {
      const open = this.game.isCanalOpen();
      this.addCommand(open ? t('hud.heritage.closeGate') : t('hud.heritage.openGate'), () => this.game.toggleCanal());
    }
    if (heritage.operation === 'offer') {
      const amount = heritage.operationAmount ?? 50;
      const resource = heritage.operationResource ?? 'silver';
      this.addCommand(
        t('hud.heritage.offering', { amount, resource: RESOURCE_INFO[resource].name.toLowerCase() }),
        () => this.game.makeOffering(heritage.id),
      );
    }
    if (heritage.operation === 'trade') {
      const amount = heritage.operationAmount ?? 50;
      const resource = heritage.operationResource ?? 'silver';
      this.addCommand(t('hud.heritage.trade', { amount, resource: RESOURCE_INFO[resource].name.toLowerCase() }), () =>
        this.game.makeTrade(heritage.id),
      );
    }
    const delivery = this.game.mission?.activeDeliveryFor(heritage.id);
    if (delivery?.def.resource) {
      const resource = delivery.def.resource;
      const gate = this.game.deliveryGate(heritage.id);
      const label = t('hud.heritage.deliver', {
        amount: gate.amount,
        resource: RESOURCE_INFO[resource].name.toLowerCase(),
        done: delivery.delivered,
        total: delivery.def.count ?? 0,
      });
      if (gate.ok) {
        this.addCommand(label, () => this.game.deliverToHeritage(heritage.id));
      } else {
        // Keep the amount/progress visible and append why the button cannot run.
        const reason =
          gate.reason === 'away'
            ? t('hud.heritage.deliverAway')
            : t('hud.heritage.deliverShort', {
                amount: gate.missing,
                resource: RESOURCE_INFO[resource].name.toLowerCase(),
              });
        this.addCommand(`${label} · ${reason}`, () => {}, '', { disabled: true });
      }
    }
    if (heritage.operation === 'assembly') {
      const state = this.game.getAssemblyState();
      if (state === 'pendiente' && this.game.canStartAssembly()) {
        this.addCommand(t('hud.heritage.assemblyCall'), () => this.game.startAssembly());
      } else if (state === 'activo') {
        this.addCommand(t('hud.heritage.assemblyActive'), () => {});
      } else if (state === 'completed') {
        this.addCommand(t('hud.heritage.assemblyDone'), () => {});
      }
    }
    this.addCommand(visited ? t('hud.heritage.visited') : t('hud.heritage.visit'), () =>
      this.game.visitHeritage(heritage.id),
    );
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
    const heritage = this.game.getSelectedHeritage();
    const p = this.game.players[0];
    // resource bucket to refresh availability (afford) without recreating each frame
    const res = p ? RESOURCE_KEYS.map((k) => Math.floor(p.resources[k] / 25)).join(',') : '';
    const marketKey =
      building?.kind === BuildingKind.MARKET
        ? ['food', 'wood', 'stone']
            .map((r) => this.game.marketQuote(building.owner, r as keyof Resources, 'buy').silver)
            .join(',')
        : '';
    const farmKey = building?.isFarm ? (building.foodAmount <= 0 ? 'empty' : 'full') : '';
    const marketSilver = building?.kind === BuildingKind.MARKET ? Math.floor(p?.resources.silver ?? 0) : '';
    const tail = '|e:' + (p?.era ?? 0) + '|res:' + res + '|m:' + marketKey + '|f:' + farmKey + '|sv:' + marketSilver;
    if (units.length > 0) {
      const ids = units
        .map((u) => u.id)
        .sort((a, b) => a - b)
        .join(',');
      const one = units.length === 1 ? units[0]! : null;
      const live = one
        ? `|t:${one.orderQueue[0]?.kind ?? ''}:${one.orderQueue[0]?.entityId ?? ''}:${Math.floor(one.carryCountNow())}`
        : '';
      return 'u:' + ids + live + tail;
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
    if (heritage)
      return (
        'h:' +
        heritage.id +
        (this.game.isHeritageVisited(heritage.id) ? ':v' : '') +
        (heritage.operation === 'toggle-canal' ? ':c' + Number(this.game.isCanalOpen()) : '') +
        (heritage.operation === 'assembly' ? ':a' + this.game.getAssemblyState() : '') +
        this.deliverySignature(heritage.id) +
        tail
      );
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
    const civ = this.game.players[first.owner]?.civ;
    const commander = units.length === 1 ? commanderById(first.tag) : undefined;
    const cast = units.flatMap((u) => {
      const c = commanderById(u.tag);
      return c ? [c] : [];
    });
    const castLine =
      commander || cast.length === 0 ? '' : `<b>${t('hud.unit.cast')}:</b> ${cast.map((c) => c.name).join(' · ')}<br>`;
    const mixed = new Set(units.map((u) => u.kind)).size > 1;
    const title = commander
      ? `${commander.hero ? '★ ' : ''}${commander.name}`
      : mixed
        ? `${t('hud.unit.group')} ×${units.length}`
        : `${unitDisplayName(first.kind, civ, first.era)} ×${units.length}`;
    this.setDesc(
      commander ? portraitSvg(commander, 30) : mixed ? '👥' : unitDisplayIcon(first.kind, first.era),
      title,
      commander ? `${commander.role}<br>${this.unitDesc(first)}` : `${castLine}${this.unitDesc(first)}`,
    );
    this.clearGrid();
    // summary by type (click = select only that type) — AoE2 style
    if (units.length > 1) {
      const groups = new Map<UnitKind, number>();
      for (const u of units) groups.set(u.kind, (groups.get(u.kind) ?? 0) + 1);
      for (const [kind, count] of groups) {
        this.addCard(
          unitDisplayIcon(kind, first.era),
          `${count}× ${unitDisplayName(kind, this.game.players[first.owner]?.civ, first.era)}`,
          t('hud.unit.filter'),
          () => this.game.selectUnits(units.filter((u) => u.kind === kind).map((u) => u.id)),
          { cat: 'sel' },
        );
      }
    }
    if (units.length > 0 && units.every((u) => u.kind === UnitKind.WORKER)) {
      for (const kind of BUILDABLE_KINDS) {
        if (!this.game.canBuildKind(kind)) continue;
        const stats = getBuildingStats(kind, this.game.players[0].era);
        this.addCard(
          this.game.buildingIcon(kind),
          this.game.buildingName(kind),
          this.costText(stats.cost),
          () => this.game.startPlacement(kind),
          { afford: this.canAfford(stats.cost), cat: 'econ' },
        );
      }
    }
    this.addCommand(t('hud.unit.stop'), () => this.orderStop(), 'S');
    // A peaceful mission (no active enemy) shows no military orders to its workers and scouts.
    const civilians = units.every((u) => u.kind === UnitKind.WORKER || u.kind === UnitKind.SCOUT);
    const mission = this.game.mission;
    if (civilians && mission && !mission.def.enemy.active) return;
    this.addCommand(t('hud.unit.formation'), () => this.game.cycleFormation());
    this.addCommand(t('hud.unit.attackMove'), () => this.orderAttackMove(), t('hud.unit.attackMoveHint'));
    this.addCommand(t('hud.unit.aggressive'), () => this.orderStance('agresivo'));
    this.addCommand(t('hud.unit.defensive'), () => this.orderStance('defensivo'));
    this.addCommand(t('hud.unit.passive'), () => this.orderStance('pasivo'));
    this.addCommand(t('hud.unit.patrol'), () => this.orderPatrol());
  }

  /** What a worker or scout is doing, for the peaceful missions' selection card. */
  private civilianTask(u: Unit): string {
    const order = u.orderQueue[0];
    if (!order) return t('hud.unit.task.idle');
    if (order.kind === 'build') {
      const target = this.game.buildings.get(order.entityId ?? -1);
      return t(target?.isFarm ? 'hud.unit.task.tilling' : 'hud.unit.task.building');
    }
    if (order.kind === 'deliver') return t('hud.unit.task.delivering');
    if (order.kind === 'gather') {
      if (this.game.buildings.get(order.entityId ?? -1)?.isFarm) return t('hud.unit.task.farming');
      const kind = this.game.resourceNodes.get(order.entityId ?? -1)?.kind;
      if (kind === 'fishing') return t('hud.unit.task.fishing');
      if (kind === 'tree') return t('hud.unit.task.wood');
      if (kind === 'well') return t('hud.unit.task.stone');
      return t('hud.unit.task.food');
    }
    return t('hud.unit.task.walking');
  }

  private unitDesc(u: Unit): string {
    const mission = this.game.mission;
    if (mission && !mission.def.enemy.active && (u.kind === UnitKind.WORKER || u.kind === UnitKind.SCOUT)) {
      const carry = u.carryCountNow();
      return t('hud.unit.civilian', {
        hp: Math.ceil(u.hp),
        maxHp: Math.ceil(u.maxHp),
        task: this.civilianTask(u),
        carry:
          carry > 0
            ? t('hud.unit.carrying', {
                amount: Math.floor(carry),
                max: u.maxCarry,
                resource: RESOURCE_INFO[u.carriedResource()].name.toLowerCase(),
              })
            : '',
      });
    }
    const stats = u.stats;
    const stance = STANCE_TOOLTIP[u.combatStance];
    const bonuses = Object.entries(stats.bonusVs ?? {}).map(([cls, value]) => ({
      label: UNIT_CLASS_LABEL[cls as keyof typeof UNIT_CLASS_LABEL],
      value: value ?? 0,
    }));
    const strong = bonuses.filter((b) => b.value > 0).map((b) => `${b.label} (+${Math.round(b.value * 100)}%)`);
    const weak = bonuses.filter((b) => b.value < 0).map((b) => `${b.label} (${Math.round(b.value * 100)}%)`);
    const myClass = unitClassFor(u.kind);
    for (const [kind, archetype] of Object.entries(UNIT_ARCHETYPES)) {
      if ((archetype.bonusVs?.[myClass] ?? 0) <= 0) continue;
      const label = UNIT_CLASS_LABEL[unitClassFor(kind as keyof typeof UNIT_ARCHETYPES)];
      if (!weak.some((w) => w.startsWith(label))) weak.push(label);
    }
    const counters = `${strong.length ? t('hud.unit.strong', { targets: strong.join(', ') }) : ''}${weak.length ? t('hud.unit.weak', { targets: weak.join(', ') }) : ''}`;
    return t('hud.unit.stats', {
      hp: Math.ceil(u.hp),
      maxHp: Math.ceil(u.maxHp),
      attack: formatStat(stats.attack),
      range: formatStat(stats.range),
      armor: formatStat(stats.heavyArmor),
      counters,
      stance,
      stanceLabel: STANCE_LABEL[u.combatStance],
    });
  }

  private renderBuildingPanel(b: Building): void {
    const def = BUILDING_DEFS[b.kind];
    this.setDesc(this.game.buildingIcon(b.kind), this.game.buildingName(b.kind), this.buildingDesc(b));
    this.clearGrid();

    if (!b.constructionComplete) {
      const buildCard = this.addCard(
        '🔨',
        t('hud.building.underConstruction'),
        `${Math.round(b.buildRatio * 100)}%`,
        () => {},
        {
          disabled: true,
          progress: b.buildRatio,
          hotkey: false,
        },
      );
      buildCard.dataset.buildCard = '1';
      return;
    }

    // production queue (click the card to cancel)
    for (let i = 0; i < b.productionQueue.length; i++) {
      const item = b.productionQueue[i];
      const card = this.addCard(
        unitDisplayIcon(item.unit, b.era),
        unitDisplayName(item.unit, this.game.players[b.owner]?.civ, b.era),
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
      const ownerCiv = this.game.players[b.owner]?.civ;
      if (!unitAvailableToCiv(unitKind, ownerCiv)) continue;
      const stats = getUnitStats(unitKind, b.era);
      const unitName = unitDisplayName(unitKind, this.game.players[b.owner]?.civ, b.era);
      const tech = UNIT_ARCHETYPES[unitKind].requiresTech?.[0];
      const techOk = !tech || this.game.players[0].techs.has(tech);
      const eraOk = !!UNIT_ARCHETYPES[unitKind].eraModel[this.game.players[0].era];
      const periodOk = unitAvailableInPeriod(unitKind, this.game.settings.period);
      const fortOk = !UNIT_ARCHETYPES[unitKind].requiresFortress || b.kind === BuildingKind.FORTRESS;
      const disabled = !techOk || !eraOk || !periodOk || !fortOk || !this.canAfford(stats.cost);
      this.addCard(
        unitDisplayIcon(unitKind, b.era),
        unitName,
        this.costText(stats.cost),
        () => this.trainUnit(b.id, unitKind),
        {
          disabled,
          afford: !disabled && this.canAfford(stats.cost),
          cat: 'mil',
        },
      );
    }

    // technologies (institute)
    const techs = TECHS.filter(
      (t) =>
        t.building === b.kind &&
        techAvailable(t, this.game.settings.period, this.game.players[b.owner]?.civ) &&
        this.game.canResearchTech(t.id) &&
        !this.game.players[0].techs.has(t.id) &&
        (!t.requirements || t.requirements.every((r) => this.game.players[0].techs.has(r))),
    );
    for (const tech of techs) {
      const disabled = !this.canAfford(tech.cost);
      this.addCard(tech.icon ?? '📚', tech.name, this.costText(tech.cost), () => this.researchTech(b.id, tech.id), {
        disabled,
        afford: !disabled,
        cat: 'advance',
      });
    }

    if (b.kind === BuildingKind.MARKET) {
      for (const resource of ['food', 'wood', 'stone'] as const) {
        const info = RESOURCE_INFO[resource];
        const buy = this.game.marketQuote(b.owner, resource, 'buy');
        const sell = this.game.marketQuote(b.owner, resource, 'sell');
        const silver = this.game.players[b.owner]?.resources.silver ?? 0;
        const have = this.game.players[b.owner]?.resources[resource] ?? 0;
        this.addCard(
          info.icon,
          t('hud.building.buy', { resource: info.name }),
          t('hud.building.silver', { amount: buy.silver }),
          () => this.game.executeCommand({ kind: 'market', action: 'buy', resource, amount: buy.amount }),
          { cat: 'econ', disabled: silver < buy.silver, afford: silver >= buy.silver },
        );
        this.addCard(
          info.icon,
          t('hud.building.sell', { resource: info.name }),
          t('hud.building.silver', { amount: sell.silver }),
          () => this.game.executeCommand({ kind: 'market', action: 'sell', resource, amount: sell.amount }),
          { cat: 'econ', disabled: have < sell.amount, afford: have >= sell.amount },
        );
      }
    }
    if (b.kind === BuildingKind.FARM && b.foodAmount <= 0) {
      this.addCard(
        '🌱',
        t('hud.building.replant'),
        this.costText({ ...({ food: 0, wood: 40, silver: 0, stone: 0 } as Resources) }),
        () => this.game.executeCommand({ kind: 'replant', buildingId: b.id }),
        { cat: 'econ' },
      );
    }

    // build more (if center, house, etc.)
    if (b.kind === BuildingKind.CENTER) {
      // Same names as the worker's build menu, and only what this match allows.
      for (const kind of [BuildingKind.HOUSE, BuildingKind.FARM]) {
        if (!this.game.canBuildKind(kind)) continue;
        this.addCard(
          this.game.buildingIcon(kind),
          this.game.buildingName(kind),
          this.costText(getBuildingStats(kind, b.era).cost),
          () => this.game.startPlacement(kind),
          { cat: 'econ' },
        );
      }
    }

    this.addCommand(t('hud.techTree.title'), () => this.showTechTree());
    this.addCommand(t('hud.building.rally'), () => this.game.hud.showToast(t('hud.toast.rallyHint'), 'info'));
    if (b.garrisonedIds.length > 0) {
      this.addCommand(t('hud.building.ungarrison', { count: b.garrisonedIds.length }), () => this.ungarrison(b.id));
    }
  }

  private buildingDesc(b: Building): string {
    const stats = b.stats;
    let s = t('hud.building.armor', {
      hp: Math.ceil(b.hp),
      maxHp: Math.ceil(b.maxHp),
      armor: formatStat(stats.armor),
    });
    if (b.constructionComplete && b.productionQueue.length > 0) {
      s += t('hud.building.training', {
        unit: unitDisplayName(b.productionQueue[0].unit, this.game.players[b.owner]?.civ, b.era),
      });
    }
    if (b.isFarm && b.constructionComplete) {
      const mult = this.game.farmYieldAt(b.pos.x, b.pos.z);
      s += t('hud.building.foodReserve', { amount: Math.ceil(b.foodAmount) });
      if (mult > 1.001) s += t('hud.building.terrainBonus', { percent: Math.round((mult - 1) * 100) });
      const drought = this.game.environment.drought ?? 0;
      if (drought > 0.01) {
        s += t('hud.building.droughtPenalty', { percent: Math.round((1 - droughtYieldFactor(drought)) * 100) });
      }
    }
    const card = getBuildingCard(this.game.mission?.def.id, b.kind);
    if (card) {
      s += `<br><span style="color:var(--text-dim)">${t('hud.building.role', { role: card.role, summary: card.summary })}</span><br><span style="color:var(--text-dim);font-size:11px">${t('hud.building.source', { citation: card.citation, confidence: card.confidence })}</span>`;
    }
    return s;
  }

  private trainUnit(buildingId: number, unit: UnitKind): void {
    const b = this.game.buildings.get(buildingId);
    if (!b) return;
    const stats = getUnitStats(unit, b.era);
    const p = this.game.players[0];
    if (p.populationUsed + stats.population > p.populationCap) {
      this.showToast(t('hud.toast.maxPopulation'), 'warning');
      return;
    }
    if (!this.game.executeCommand({ kind: 'train', buildingId, unit })) {
      this.showToast(t('hud.toast.insufficientResources'), 'error');
    }
  }

  private researchTech(buildingId: number, techId: string): void {
    if (!this.game.executeCommand({ kind: 'research', buildingId, tech: techId })) {
      this.showToast(t('hud.toast.insufficientResources'), 'error');
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
    this.showToast(t('hud.toast.stance', { stance: t(`hud.stance.${stance}Label`) }), 'info');
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
    const terrain = this.game.terrain;
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
          const h = terrain.getHeight(wx, wz);
          let c: string;
          if (terrain.isWater(wx, wz)) c = 'rgba(30,80,120,0.9)';
          else if (h > 9) c = 'rgba(150,145,140,0.95)';
          else if (h > 5) c = 'rgba(110,120,90,0.95)';
          else if (terrain.isBeach(wx, wz)) c = 'rgba(200,180,130,0.95)';
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

    // place names, under the resource/unit dots so they never hide the board state
    for (const label of this.game.placeNames) {
      const wx = label.x * s;
      const wz = label.z * s;
      if (fogOn && !fow.isExplored(wx, wz)) continue;
      const kind = label.kind ?? 'region';
      ctx.save();
      ctx.font = 'italic 9px Georgia, "Times New Roman", serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = 'rgba(4, 6, 8, 0.8)';
      ctx.strokeText(label.text, label.x * w, label.z * w);
      // The minimap is a dense 190 px board: keep a legibility floor even for dim region names.
      ctx.globalAlpha = Math.max(LABEL_OPACITY[kind], 0.72);
      ctx.fillStyle = LABEL_COLORS[kind];
      ctx.fillText(label.text, label.x * w, label.z * w);
      ctx.restore();
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
    // active objectives: a small gold diamond gives the player a destination
    // without revealing hidden objectives or unexplored resources
    const mission = this.game.mission;
    if (mission) {
      for (const { def, state } of mission.activeObjectives) {
        if (state !== 'activo') continue;
        const anchor = mission.getObjectiveAnchor(def.id);
        if (!anchor) continue;
        const x = (anchor.x / s) * w;
        const y = (anchor.z / s) * w;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = 'rgba(232,195,106,0.28)';
        ctx.strokeStyle = '#e8c36a';
        ctx.lineWidth = 1.5;
        ctx.fillRect(-3, -3, 6, 6);
        ctx.strokeRect(-3, -3, 6, 6);
        ctx.restore();
      }
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
        ctx.strokeStyle = p.discovery
          ? `rgba(232,195,106,${0.35 + pulse * 0.55})`
          : `rgba(255,70,70,${0.35 + pulse * 0.55})`;
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
    const ov = this.el('div', 'ed-overlay ed-menu-screen');
    renderMainMenu(ov, {
      progress: this.readCampaignProgress(),
      hasSave: hasSave(),
      hasReplay: hasReplay(),
      skirmish: !CAMPAIGN_ONLY,
      onContinue: () => {
        this.setMenuOpen(false);
        this.clearOverlays();
        this.game.loadMatch();
      },
      onCampaigns: () => this.showCampaignHub(),
      onPlay: (id) => this.launchMission(id),
      onSkirmish: () => this.showSkirmishSetup(),
      onCodex: () => this.showCodex(),
      onControls: () => this.showControls(),
      onOptions: () => this.showOptions('main'),
      onIntro: () => this.showSeriesIntro(),
      onReplay: () => {
        this.setMenuOpen(false);
        this.clearOverlays();
        this.game.loadReplayMatch();
      },
    });
  }

  /** First-launch title gate; the click is also the audio gesture. */
  showTitleIntro(done: () => void): void {
    this.game.loop.stop();
    this.clearOverlays();
    this.setMenuOpen(true);
    const ov = this.el('div', 'ed-overlay ed-title-screen');
    ov.innerHTML = `
      <div class="ed-title-card">
        <div class="ed-title-ornament"></div>
        <div class="kicker">${t('app.series')}</div>
        <h1>${t('app.title')}</h1>
        <div class="sub">${t('hud.menu.titleIntro.sub')}</div>
        <button class="ed-primary" type="button">${t('hud.menu.titleIntro.enter')}</button>
        <div class="hint">${t('hud.menu.titleIntro.hint')}</div>
      </div>
    `;
    decorateTitleScreen(ov);
    const enter = ov.querySelector('button') as HTMLButtonElement;
    enter.addEventListener('click', () => {
      this.markTitleIntroSeen();
      this.game.audio.init();
      this.game.audio.resume();
      if (this.game.settings.musicEnabled) this.game.audio.startMusic();
      this.game.audio.cinematicSting();
      done();
    });
    enter.focus();
  }

  /** Replayable saga prologue. */
  showSeriesIntro(done: () => void = () => this.showMainMenu()): void {
    this.clearOverlays();
    this.setMenuOpen(true);
    new CinematicPlayer(this.root, {
      beats: SERIES_INTRO,
      background: MENU_BACKDROP,
      kicker: t('app.series'),
      finalLabel: t('hud.menu.seriesIntro.final'),
      onDone: done,
    });
  }

  private titleIntroSeen(): boolean {
    try {
      return localStorage.getItem('peru-title-intro') === '1';
    } catch {
      return false;
    }
  }

  private markTitleIntroSeen(): void {
    try {
      localStorage.setItem('peru-title-intro', '1');
    } catch {
      /* noop */
    }
  }

  /** Whether the first boot should show the title movie. */
  shouldShowTitleIntro(): boolean {
    return !this.titleIntroSeen();
  }

  /** Skirmish setup, separated from the main menu. */
  showSkirmishSetup(): void {
    this.clearOverlays();
    this.setMenuOpen(true);
    const ov = this.el('div', 'ed-overlay');
    const panel = this.el('div', 'ed-panel', ov);
    panel.style.maxWidth = '700px';
    panel.innerHTML = `
      <div style="font-size:12px;letter-spacing:4px;color:#a8883f">${t('hud.menu.skirmish.kicker')}</div>
      <h2>${t('hud.menu.skirmish.title')}</h2>
      <div class="sub">${t('hud.menu.skirmish.sub')}</div>
    `;
    const civ = getCiv(this.game.settings.civPlayer);
    const civInfo = this.el('div', 'ed-skirmish-info', panel);
    const uniqueUnits = uniqueUnitsForCiv(civ.id);
    const uniqueTechs = uniqueTechsForCiv(civ.id);
    const gap = uniqueUnitGapForCiv(civ.id);
    const uniqueUnitText = uniqueUnits.length
      ? uniqueUnits.map((u) => u.name).join(', ')
      : gap
        ? `${t('hud.codex.noUniqueUnit')} (${gap.reason})`
        : t('hud.codex.noUniqueUnit');
    const uniqueTechText = uniqueTechs.length
      ? uniqueTechs.map((tech) => tech.name).join(', ')
      : t('hud.codex.noUniqueTech');
    civInfo.innerHTML = `<b>${civ.name}</b> · ${civ.description}<br><span>${civ.bonuses.join(' · ')}</span><br><span>${t('hud.codex.uniqueUnit')}: ${uniqueUnitText} · ${t('hud.codex.uniqueTech')}: ${uniqueTechText}</span>`;
    const preview = document.createElement('canvas');
    preview.className = 'ed-map-preview';
    preview.width = 260;
    preview.height = 84;
    panel.appendChild(preview);
    this.drawMapPreview(preview, this.game.settings.mapType);
    const rows = this.el('div', 'row', panel);
    const periodLabels: Record<string, string> = {};
    for (const p of PERIODS) periodLabels[String(p.id)] = `${p.name} · ${p.dates}`;
    rows.appendChild(
      this.field(
        t('hud.menu.skirmish.period'),
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
            this.showSkirmishSetup();
          },
        ),
      ),
    );
    rows.appendChild(
      this.field(
        t('hud.menu.skirmish.difficulty'),
        this.select(
          ['easy', 'normal', 'hard', 'legendary'] as const,
          {
            easy: t('difficulty.easy'),
            normal: t('difficulty.normal'),
            hard: t('difficulty.hard'),
            legendary: t('difficulty.legendary'),
          },
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
        t('hud.menu.skirmish.civ'),
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
            this.showSkirmishSetup();
          },
        ),
      ),
    );
    rows.appendChild(
      this.field(
        t('hud.menu.skirmish.rival'),
        this.select(
          disponibles.map((c) => c.id),
          civLabels,
          this.game.settings.civAI,
          (v) => {
            this.game.settings.civAI = v;
            this.showSkirmishSetup();
          },
        ),
      ),
    );
    const rows2 = this.el('div', 'row', panel);
    rows2.appendChild(
      this.field(
        t('hud.menu.skirmish.map'),
        this.select(['coast', 'andes', 'altiplano', 'jungle'] as const, MAP_LABEL, this.game.settings.mapType, (v) => {
          this.game.settings.mapType = v;
          this.showSkirmishSetup();
        }),
      ),
    );
    rows2.appendChild(
      this.field(
        t('hud.menu.skirmish.time'),
        this.select(
          ['morning', 'noon', 'dusk', 'night'] as const,
          { morning: t('time.morning'), noon: t('time.noon'), dusk: t('time.dusk'), night: t('time.night') },
          this.game.settings.timeOfDay,
          (v) => this.setTimeOfDay(v),
        ),
      ),
    );
    rows2.appendChild(
      this.field(
        t('hud.menu.skirmish.victory'),
        this.select(
          ['conquest', 'wonder'] as const,
          { conquest: t('victory.conquest'), wonder: t('victory.wonder') },
          this.game.settings.victoryMode,
          (v) => (this.game.settings.victoryMode = v),
        ),
      ),
    );
    rows2.appendChild(
      this.field(
        t('hud.menu.skirmish.population'),
        this.select(
          ['50', '100', '150', '200'],
          { '50': '50', '100': '100', '150': '150', '200': '200' },
          String(this.game.settings.populationCap),
          (v) => (this.game.settings.populationCap = Number(v)),
        ),
      ),
    );
    rows2.appendChild(
      this.field(
        t('hud.menu.skirmish.resources'),
        this.select(
          STARTING_RESOURCES,
          { low: t('starting.low'), standard: t('starting.standard'), rich: t('starting.rich') },
          this.game.settings.startingResources,
          (v) => (this.game.settings.startingResources = v),
        ),
      ),
    );
    const startRow = this.el('div', 'row', panel);
    const back = this.el('button', 'ed-ghostbtn', startRow);
    back.textContent = t('hud.menu.skirmish.back');
    back.addEventListener('click', () => this.showMainMenu());
    const startBtn = this.el('button', 'ed-primary', startRow);
    startBtn.textContent = t('hud.menu.skirmish.start');
    startBtn.addEventListener('click', () => {
      this.game.settings.missionId = undefined;
      this.setMenuOpen(false);
      this.clearOverlays();
      this.game.resetGame();
    });
  }

  private drawMapPreview(canvas: HTMLCanvasElement, mapType: MapType): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const palette: Record<MapType, [string, string, string]> = {
      coast: ['#2f5d73', '#b7a06a', '#6e8a4a'],
      andes: ['#6b5136', '#9a7b4f', '#5f7a45'],
      altiplano: ['#8a7b63', '#c2b07a', '#6f7b58'],
      jungle: ['#1f4a35', '#3f6b3a', '#7a8a4a'],
    };
    const [water, land, accent] = palette[mapType] ?? palette.coast;
    const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    g.addColorStop(0, water);
    g.addColorStop(0.35, land);
    g.addColorStop(1, accent);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 0.18;
    for (let i = 0; i < 70; i++) {
      const x = (i * 97) % canvas.width;
      const y = (i * 53) % canvas.height;
      ctx.fillStyle = i % 2 ? '#000' : '#fff';
      ctx.fillRect(x, y, 3, 2);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(6,9,12,.55)';
    ctx.fillRect(8, canvas.height - 24, 132, 18);
    ctx.fillStyle = '#f0dfb7';
    ctx.font = '11px sans-serif';
    ctx.fillText(MAP_LABEL[mapType], 14, canvas.height - 11);
  }

  /** Open the educational codex/encyclopedia (periods, civilizations, campaigns and dossiers). */
  showCodex(): void {
    this.clearOverlays();
    this.setMenuOpen(true);
    openCodex(this.root, () => this.showMainMenu());
  }

  /** Controls and basic concepts panel. */
  showControls(): void {
    this.clearOverlays();
    this.setMenuOpen(true);
    const ov = this.el('div', 'ed-overlay');
    const panel = this.el('div', 'ed-panel', ov);
    panel.style.maxWidth = '620px';
    panel.innerHTML = `<h2>${t('hud.menu.controls.title')}</h2><div class="sub">${t('hud.menu.controls.sub')}</div>`;
    const keys = this.el('div', 'ed-keys', panel);
    keys.innerHTML = t('hud.menu.controls.keys');
    const back = this.el('button', 'ed-primary', panel);
    back.textContent = t('hud.menu.controls.back');
    back.addEventListener('click', () => this.showMainMenu());
  }

  /** Mission briefing before starting (historical context + objectives + sources). */
  showBriefing(mis: MissionDef, onStart: () => void): void {
    this.game.loop.stop();
    if (!this.game.getPaused()) this.game.togglePause();
    this.clearOverlays();
    const ov = this.el('div', 'ed-overlay');
    const period = getPeriod(mis.period);
    const player = getCiv(mis.playerCiv);
    const enemy = getCiv(mis.enemyCiv);
    const edu = getEducational(mis.id);
    // A hidden objective is a discovery; the briefing must not spoil it.
    const briefingObjectives = mis.objectives.filter((o) => !o.hidden);
    const context = edu?.briefing
      ? `<div class="ed-hist"><b style="color:var(--gold)">${t('hud.menu.briefing.historicalContext')}</b> ${edu.briefing}</div>`
      : edu?.context
        ? `<div class="ed-hist">${mis.history}</div><div class="ed-hist"><b style="color:var(--gold)">${t('hud.menu.briefing.historicalContext')}</b> ${edu.context}</div>`
        : `<div class="ed-hist">${mis.history}</div>`;
    const funFact = edu
      ? `<div class="ed-sabias"><b>${t('hud.menu.briefing.didYouKnow')}</b> ${edu.didYouKnow}</div>`
      : '';
    const playerName = mis.playerName ?? player.name;
    const enemyName = mis.enemyName ?? enemy.name;
    const sides = mis.enemy.active
      ? t('hud.menu.briefing.sidesVs', { player: escapeHtml(playerName), enemy: escapeHtml(enemyName) })
      : t('hud.menu.briefing.sidesAlone', { player: escapeHtml(playerName) });
    const sources =
      edu && edu.sources.length
        ? `<details class="ed-fuentes"><summary>${t('hud.menu.briefing.sources')}</summary><ul>${edu.sources
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
            c.status === 'abstraction' ? `<em>${t('hud.menu.briefing.stylized')}</em>` : ''
          }</div></div>`,
      )
      .join('');
    const introArt = artIntroForMission(mis.id, { includeUnreviewed: includeUnreviewedArt() });
    const campaign = getCampaignForMission(mis.id);
    // Numbered on the chapter's full path, as in the campaign menu (planned missions count).
    const position = missionPosition(mis.id);
    const kicker =
      campaign && position
        ? t('hud.menu.briefing.kicker', {
            n: campaignNumber(campaign.id),
            campaign: campaign.title,
            mission: position.n,
            total: position.total,
          })
        : t('hud.menu.briefing.mission');
    // The objective titles carry the "alternative" prefix; the optional ones get a tag instead of a suffix.
    const titles = this.objectiveTitles(briefingObjectives.map((o) => ({ ...o, optional: false })));
    renderBriefing(ov, {
      kicker,
      title: mis.title,
      subtitle: mis.subtitle,
      backdrop: MISSION_ART[mis.id],
      accent: campaign?.accent ?? '#c99a55',
      art: introArt
        ? artFigureHtml(introArt)
        : MISSION_ART[mis.id]
          ? `<figure class="ed-art"><img src="${MISSION_ART[mis.id]}" alt="${escapeHtml(mis.title)}" decoding="async"><figcaption>${t('hud.menu.briefing.captureCaption')}</figcaption></figure>`
          : '',
      story: context,
      didYouKnow: funFact,
      commanders: commanders
        ? `<div class="ed-commanders${(mis.commanders?.length ?? 0) >= CAST_LAYOUT_MIN ? ' ed-commanders--cast' : ''}">${commanders}</div>`
        : '',
      sources,
      facts: [
        {
          label: t('hud.menu.briefing.factPeriod'),
          value: `${period.name} · ${period.dates}${mis.periodNote ? ` · ${mis.periodNote}` : ''}`,
        },
        { label: t('hud.menu.briefing.factMap'), value: MAP_LABEL[mis.map.type] },
        { label: t('hud.menu.briefing.factSides'), value: sides },
      ],
      objectives: briefingObjectives.map((o, i) => ({ title: titles[i], optional: !!o.optional })),
      onStart: () => {
        this.clearOverlays();
        onStart();
        if (this.game.introEnabled) this.showMissionTitle(mis);
      },
      onBack: () => this.showCampaignHub(campaign?.id),
    });
  }

  /** The campaign path of La Senda del Sol: campaigns and missions open in order. */
  showCampaignHub(selected?: CampaignId): void {
    this.clearOverlays();
    this.setMenuOpen(true);
    const ov = this.el('div', 'ed-overlay ed-campaign-hub');
    renderCampaignPath(ov, {
      progress: this.readCampaignProgress(),
      unlockAll: new URLSearchParams(window.location.search).get('unlock') === 'all',
      selected,
      onPlay: (id) => this.launchMission(id),
      onPrologue: (id) => this.showCampaignIntroReplay(id),
      onBack: () => this.showMainMenu(),
    });
  }

  /** Backwards-compatible name used by older callers. */
  showCampaignMenu(): void {
    this.showCampaignHub();
  }

  private showCampaignIntroReplay(id: CampaignId): void {
    const campaign = CAMPAIGNS.find((c) => c.id === id) ?? CAMPAIGNS[0]!;
    this.clearOverlays();
    this.setMenuOpen(true);
    this.game.audio.cinematicSting();
    new CinematicPlayer(this.root, {
      beats: campaign.prologue,
      // Each campaign's own art only: Caral's capture is not a backdrop for the Viceroyalty.
      background: CAMPAIGN_ART[campaign.id],
      kicker: t('hud.menu.campaignIntro.kicker', {
        number: t('hud.menu.campaignHub.campaignNumber', { n: campaignNumber(campaign.id), total: CAMPAIGNS.length }),
        campaign: campaign.title.toUpperCase(),
      }),
      finalLabel: t('hud.menu.campaignHub.introReplay'),
      onDone: () => this.showCampaignHub(campaign.id),
    });
  }

  private launchMission(id: string): void {
    this.game.settings.missionId = id;
    this.setMenuOpen(false);
    this.clearOverlays();
    this.game.resetGame();
  }

  private readCampaignProgress() {
    try {
      return parseCampaignProgress(localStorage.getItem('peru-campaign'));
    } catch {
      return parseCampaignProgress(null);
    }
  }

  /** Register a released mission as completed, preserving the legacy numeric value. */
  saveCampaignProgress(id: string): void {
    const campaign = getCampaignForMission(id);
    if (!campaign || !campaign.releasedMissionIds.includes(id)) return;
    try {
      const next = markMissionComplete(this.readCampaignProgress(), campaign.id, id);
      localStorage.setItem('peru-campaign', JSON.stringify(next));
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

  private showOptions(from: 'main' | 'pause' = 'pause'): void {
    this.clearOverlays();
    const ov = this.el('div', 'ed-overlay');
    const panel = this.el('div', 'ed-panel', ov);
    panel.innerHTML = `<h2>${t('hud.menu.options.title')}</h2><div class="sub">${t('hud.menu.options.sub')}</div>`;
    const row = this.el('div', 'row', panel);
    const q = this.field(
      t('hud.menu.options.quality'),
      this.select(
        ['high', 'medium', 'low'] as const,
        { high: t('quality.high'), medium: t('quality.medium'), low: t('quality.low') },
        this.game.settings.quality,
        (v) => this.game.setQuality(v),
      ),
    );
    row.appendChild(q);
    this.toggle(
      row,
      t('hud.menu.options.cinematic'),
      [t('toggle.on'), t('toggle.off')],
      () => this.game.settings.cinematic,
      (v) => {
        this.game.settings.cinematic = v;
        this.game.postfx.setCinematic(v);
      },
    );
    this.toggle(
      row,
      t('hud.menu.options.rotate'),
      [t('toggle.onF'), t('toggle.offF')],
      () => this.game.settings.rotateCamera,
      (v) => {
        this.game.settings.rotateCamera = v;
        this.game.camera.setRotationEnabled(v);
      },
    );
    row.appendChild(
      this.field(
        t('hud.menu.options.cameraSpeed'),
        this.select(
          ['slow', 'normal', 'fast'] as const,
          { slow: t('cameraSpeed.slow'), normal: t('cameraSpeed.normal'), fast: t('cameraSpeed.fast') },
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
      t('hud.menu.options.edgeScroll'),
      [t('toggle.onM'), t('toggle.offM')],
      () => this.game.settings.edgeScroll,
      (v) => {
        this.game.settings.edgeScroll = v;
        this.game.camera.setEdgeScroll(v);
        this.game.saveSettings();
      },
    );
    this.toggle(
      row,
      t('hud.menu.options.fog'),
      [t('toggle.onF'), t('toggle.offF')],
      () => this.game.settings.fogOfWar,
      (v) => this.game.setFogOfWar(v),
    );
    this.toggle(
      row,
      t('hud.menu.options.sound'),
      [t('toggle.onM'), t('toggle.offM')],
      () => this.game.settings.soundEnabled,
      (v) => {
        this.game.settings.soundEnabled = v;
        this.game.audio.enabled = v;
      },
    );
    this.toggle(
      row,
      t('hud.menu.options.music'),
      [t('toggle.onF'), t('toggle.offF')],
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
      t('hud.menu.options.hints'),
      [t('toggle.on'), t('toggle.off')],
      () => this.game.settings.showHints,
      (v) => (this.game.settings.showHints = v),
    );
    this.toggle(
      row,
      t('hud.menu.options.showFps'),
      [t('toggle.onM'), t('toggle.offM')],
      () => this.game.settings.showFps,
      (v) => {
        this.game.settings.showFps = v;
        this.game.hud.setShowFps(v);
        this.game.saveSettings();
      },
    );
    const hotkeyTitle = this.el('div', 'ed-menu-kicker', panel);
    hotkeyTitle.textContent = t('hud.menu.options.hotkeys');
    const hotkeyHint = this.el('div', 'sub', panel);
    hotkeyHint.textContent = t('hud.menu.options.hotkeysHint');
    this.renderHotkeyEditor(panel);
    const back = this.el('button', 'ed-primary', panel);
    back.textContent = t('hud.menu.options.back');
    back.addEventListener('click', () => (from === 'main' ? this.showMainMenu() : this.showPauseMenu()));
  }

  private renderHotkeyEditor(parent: HTMLElement): void {
    const grid = this.el('div', 'ed-hotkey-grid', parent);
    for (const hotkey of HOTKEYS) {
      const row = this.el('div', 'ed-hotkey-row', grid);
      const label = this.el('span', '', row);
      label.textContent = hotkey.label;
      const button = this.el('button', 'ed-ghostbtn', row) as HTMLButtonElement;
      const render = (): void => {
        const key = keyFor(hotkey.action, this.game.settings.hotkeys);
        button.textContent = key === ' ' ? t('hud.menu.options.space') : key.toUpperCase();
      };
      render();
      button.addEventListener('click', () => {
        button.textContent = t('hud.menu.options.pressKey');
        const onKey = (event: KeyboardEvent): void => {
          event.preventDefault();
          event.stopImmediatePropagation();
          window.removeEventListener('keydown', onKey, true);
          if (event.key === 'Escape') {
            render();
            return;
          }
          const key = event.key.toLowerCase();
          if (['shift', 'control', 'alt', 'meta'].includes(key)) {
            render();
            return;
          }
          const next = { ...this.game.settings.hotkeys, [hotkey.action]: key };
          if (isReservedKey(key) || keymapConflicts(next).length > 0) {
            this.showToast(t('hud.toast.hotkeyConflict'), 'warning');
            render();
            return;
          }
          this.game.settings.hotkeys = normalizeKeymap(next);
          this.game.camera.setKeymap(this.game.settings.hotkeys);
          this.game.saveSettings();
          this.refreshHelp();
          this.bottomKey = '';
          this.showToast(t('hud.toast.hotkeyUpdated'), 'success');
          render();
        };
        window.addEventListener('keydown', onKey, true);
      });
    }
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
    this.root.querySelectorAll('.ed-overlay, .ed-mission-card').forEach((e) => e.remove());
  }

  /** Hide the in-game HUD while a modal menu is open. */
  private setMenuOpen(v: boolean): void {
    this.root.classList.toggle('menu-open', v);
  }

  // --- update ---

  update(dt: number, time: number): void {
    void time;
    this.updateAcc += dt;
    this.damage.update(this.game.camera.camera, dt);
    const now = performance.now();
    if (this.alertPings.length) this.alertPings = this.alertPings.filter((p) => p.until > now);
    // dialogue with auto-close
    if (this.dialogueTimer > 0) {
      this.dialogueTimer -= dt;
      if (this.dialogueTimer <= 0) this.dialogueEl.classList.remove('show');
    }
    // campaign objectives panel (tick shared with the minimap); the chapter card
    // owns the screen until the player dismisses it
    if (this.game.mission) {
      if (!this.helpDefaultApplied) {
        // In a campaign the column already carries the objectives and the tutorial: start the
        // shortcuts folded behind the "?" button so three panels never fight for the same space.
        this.helpDefaultApplied = true;
        this.root.classList.add('help-collapsed');
      }
      const cardOpen = this.isMissionCardOpen();
      this.objPanelEl.style.display = cardOpen ? 'none' : '';
      if (!cardOpen && this.updateAcc > 0.15) this.refreshObjectives();
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
      // hide resources unavailable in the match (e.g. Stone without a Quarry or quarry nodes, Silver in Caral)
      this.resEls.stone.classList.toggle(
        'res-unavailable',
        !this.game.canBuildKind(BuildingKind.REFINERY) && !this.resourceOnMap('well'),
      );
      this.resEls.silver.classList.toggle(
        'res-unavailable',
        !this.resourceOnMap('mine') && Math.floor(p.resources.silver) === 0,
      );
      this.popEl.querySelector('span')!.textContent = `${p.populationUsed}/${p.populationCap}`;
      const period = getPeriod(this.game.settings.period);
      this.eraEl.querySelector('span:last-child')!.textContent = `${period.name} · ${period.dates}`;
      this.eraDot.style.background = `#${ERA_COLORS[p.era].toString(16).padStart(6, '0')}`;
    }
    if (this.updateAcc > 0.15) {
      this.updateAcc = 0;
      const idle = this.game.idleWorkerIds().length;
      this.idleEl.querySelector('.idle-val')!.textContent = String(idle);
      this.idleEl.classList.toggle('none', idle === 0);
      this.renderBottomIfChanged();
      this.updateBottomProgress();
      this.renderMinimap();
    }
    if (this.showFps)
      this.fpsEl.textContent = t('hud.fps.value', {
        fps: this.game.loop.getFps(),
        quality: this.game.getAppliedQuality(),
      });
  }
}
