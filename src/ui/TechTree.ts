import { BUILDING_DEFS, BUILDING_INFO } from '../model/defs/buildings';
import { UNIT_ARCHETYPES, UNIT_INFO, unitDisplayIcon } from '../model/defs/units';
import { TECHS } from '../model/defs/techs';
import { PERIODS } from '../model/defs/periods';
import { ERA_DEFS } from '../model/defs/eras';
import { Era } from '../core/types';

export interface TechTreeNode {
  id: string;
  name: string;
  icon: string;
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

/** The tech tree is generated from the defs; it never duplicates balance data. */
export function techTreeData(): TechTreeEra[] {
  return ERA_DEFS.map((eraDef) => {
    const era = eraDef.id;
    const buildings = Object.values(BUILDING_DEFS)
      .filter((def) => def.minEra === era)
      .map((def) => ({ id: def.id, name: BUILDING_INFO[def.id].name, icon: BUILDING_INFO[def.id].icon }));
    const units = Object.values(UNIT_ARCHETYPES)
      .filter((def) => def.eraModel[era])
      .map((def) => ({ id: def.id, name: UNIT_INFO[def.id].name, icon: unitDisplayIcon(def.id, era) }));
    const techs = TECHS.filter((tech) => eraForPeriod(tech.minPeriod) === era).map((tech) => ({
      id: tech.id,
      name: tech.name,
      icon: tech.icon ?? '📚',
    }));
    return { era, name: eraDef.name, buildings, units, techs };
  });
}

function column(title: string, items: TechTreeNode[]): string {
  return `<div class="ed-tree-col"><h4>${title}</h4>${
    items.length
      ? items.map((item) => `<div class="ed-tree-item"><span>${item.icon}</span>${item.name}</div>`).join('')
      : '<div class="ed-tree-empty">—</div>'
  }</div>`;
}

export function techTreeHtml(): string {
  return `<div class="ed-tree">${techTreeData()
    .map(
      (era) => `<div class="ed-tree-era">
        <h3>${era.name}</h3>
        <div class="ed-tree-cols">
          ${column('Edificios', era.buildings)}
          ${column('Unidades', era.units)}
          ${column('Tecnologías', era.techs)}
        </div>
      </div>`,
    )
    .join('')}</div>`;
}

export function openTechTree(root: HTMLElement, onClose: () => void): void {
  root.querySelector('#ed-tech-tree')?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'ed-overlay';
  overlay.id = 'ed-tech-tree';
  const panel = document.createElement('div');
  panel.className = 'ed-panel ed-tree-panel';
  panel.innerHTML = `<h2>🌳 Árbol tecnológico</h2>
    <div class="sub">Edificios, unidades y tecnologías por era, generados desde los defs del juego.</div>
    ${techTreeHtml()}`;
  const close = document.createElement('button');
  close.className = 'ed-primary';
  close.textContent = '← Volver';
  close.addEventListener('click', () => {
    overlay.remove();
    onClose();
  });
  panel.appendChild(close);
  overlay.appendChild(panel);
  root.appendChild(overlay);
}
