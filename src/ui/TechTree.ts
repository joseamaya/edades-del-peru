import { BUILDING_DEFS, BUILDING_INFO } from '../model/defs/buildings';
import { UNIT_ARCHETYPES, UNIT_INFO, unitAvailableToCiv, unitDisplayIcon, unitDisplayName } from '../model/defs/units';
import { TECHS, techAvailable } from '../model/defs/techs';
import { PERIODS } from '../model/defs/periods';
import { ERA_DEFS } from '../model/defs/eras';
import { BuildingKind, CivId, Era, HistoricalPeriod, UnitKind } from '../core/types';
import { t } from '../i18n';

export interface TechTreeNode {
  id: string;
  name: string;
  icon: string;
  unique?: boolean;
}

export interface TechTreeEra {
  era: Era;
  name: string;
  buildings: TechTreeNode[];
  units: TechTreeNode[];
  techs: TechTreeNode[];
}

function eraForPeriod(period: number): Era {
  return PERIODS.find((p) => p.id === period)?.level ?? Era.FORMATIVE;
}

/**
 * A running match narrows the tree to what the player can actually use: its civilization, its locked
 * period and era, and the mission's allowed buildings and units (Caral has no metallurgy, no war and no
 * cavalry, so none of it is listed).
 */
export interface TechTreeMatch {
  civ: CivId;
  period: HistoricalPeriod;
  era: Era;
  canBuild(kind: BuildingKind): boolean;
  canTrain(kind: UnitKind): boolean;
}

/** The tech tree is generated from the defs; it never duplicates balance data. */
export function techTreeData(match?: TechTreeMatch): TechTreeEra[] {
  if (match) {
    const eraDef = ERA_DEFS.find((def) => def.id === match.era) ?? ERA_DEFS[0]!;
    return [
      {
        era: match.era,
        name: eraDef.name,
        buildings: Object.values(BUILDING_DEFS)
          .filter((def) => match.canBuild(def.id))
          .map((def) => ({ id: def.id, name: BUILDING_INFO[def.id].name, icon: BUILDING_INFO[def.id].icon })),
        units: Object.values(UNIT_ARCHETYPES)
          .filter((def) => def.eraModel[match.era] && unitAvailableToCiv(def.id, match.civ) && match.canTrain(def.id))
          .map((def) => ({
            id: def.id,
            name: unitDisplayName(def.id, match.civ, match.era),
            icon: unitDisplayIcon(def.id, match.era),
            unique: def.category === 'unique',
          })),
        techs: TECHS.filter((tech) => techAvailable(tech, match.period, match.civ)).map((tech) => ({
          id: tech.id,
          name: tech.name,
          icon: tech.icon ?? '📚',
          unique: tech.unique === true,
        })),
      },
    ];
  }
  return ERA_DEFS.map((eraDef) => {
    const era = eraDef.id;
    const buildings = Object.values(BUILDING_DEFS)
      .filter((def) => def.minEra === era)
      .map((def) => ({ id: def.id, name: BUILDING_INFO[def.id].name, icon: BUILDING_INFO[def.id].icon }));
    const units = Object.values(UNIT_ARCHETYPES)
      .filter((def) => def.eraModel[era])
      .map((def) => ({
        id: def.id,
        name: UNIT_INFO[def.id].name,
        icon: unitDisplayIcon(def.id, era),
        unique: def.category === 'unique',
      }));
    const techs = TECHS.filter((tech) => eraForPeriod(tech.minPeriod) === era).map((tech) => ({
      id: tech.id,
      name: tech.name,
      icon: tech.icon ?? '📚',
      unique: tech.unique === true,
    }));
    return { era, name: eraDef.name, buildings, units, techs };
  });
}

function column(title: string, items: TechTreeNode[]): string {
  return `<div class="ed-tree-col"><h4>${title}</h4>${
    items.length
      ? items
          .map(
            (item) =>
              `<div class="ed-tree-item"><span>${item.icon}</span>${item.name}${item.unique ? `<span class="ed-tree-unique">${t('hud.techTree.unique')}</span>` : ''}</div>`,
          )
          .join('')
      : '<div class="ed-tree-empty">—</div>'
  }</div>`;
}

export function techTreeHtml(match?: TechTreeMatch): string {
  return `<div class="ed-tree">${techTreeData(match)
    .map(
      (era) => `<div class="ed-tree-era">
        <h3>${era.name}</h3>
        <div class="ed-tree-cols">
          ${column(t('hud.techTree.buildings'), era.buildings)}
          ${column(t('hud.techTree.units'), era.units)}
          ${column(t('hud.techTree.techs'), era.techs)}
        </div>
      </div>`,
    )
    .join('')}</div>`;
}

export function openTechTree(root: HTMLElement, onClose: () => void, match?: TechTreeMatch): void {
  root.querySelector('#ed-tech-tree')?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'ed-overlay';
  overlay.id = 'ed-tech-tree';
  const panel = document.createElement('div');
  panel.className = 'ed-panel ed-tree-panel';
  panel.innerHTML = `<h2>${t('hud.techTree.title')}</h2>
    <div class="sub">${t(match ? 'hud.techTree.subMatch' : 'hud.techTree.sub')}</div>
    ${techTreeHtml(match)}`;
  const close = document.createElement('button');
  close.className = 'ed-primary';
  close.textContent = t('hud.techTree.back');
  close.addEventListener('click', () => {
    overlay.remove();
    onClose();
  });
  panel.appendChild(close);
  overlay.appendChild(panel);
  root.appendChild(overlay);
}
