/** Single source of truth for in-match keyboard shortcuts. */
export type HotkeyAction =
  | 'toggleHelp'
  | 'nextIdleWorker'
  | 'pause'
  | 'lastBattle'
  | 'centerBase'
  | 'followUnit'
  | 'selectArmy'
  | 'buildFarm'
  | 'buildHouse'
  | 'rotateLeft'
  | 'rotateRight';

export interface HotkeyDef {
  action: HotkeyAction;
  key: string;
  label: string;
  group: 'game' | 'camera';
}

export const HOTKEYS: HotkeyDef[] = [
  { action: 'toggleHelp', key: 'f1', label: 'Mostrar/ocultar ayuda (también ?)', group: 'game' },
  { action: 'nextIdleWorker', key: '.', label: 'Siguiente obrero ocioso (Ctrl+: todos)', group: 'game' },
  { action: 'pause', key: 'p', label: 'Pausa', group: 'game' },
  { action: 'lastBattle', key: ' ', label: 'Última batalla', group: 'game' },
  { action: 'centerBase', key: 'h', label: 'Centrar Plaza Mayor', group: 'game' },
  { action: 'followUnit', key: 'f', label: 'Seguir unidad', group: 'game' },
  { action: 'selectArmy', key: 'e', label: 'Todo el ejército', group: 'game' },
  { action: 'buildFarm', key: 'g', label: 'Andén', group: 'game' },
  { action: 'buildHouse', key: 'v', label: 'Vivienda', group: 'game' },
  { action: 'rotateLeft', key: 'z', label: 'Rotar cámara a la izquierda', group: 'camera' },
  { action: 'rotateRight', key: 'x', label: 'Rotar cámara a la derecha', group: 'camera' },
];

export function keyFor(action: HotkeyAction): string {
  return HOTKEYS.find((h) => h.action === action)?.key ?? '';
}

/** Human-readable shortcut line shared by the in-game help and tests. */
export function formatHotkeys(group?: HotkeyDef['group']): string {
  return HOTKEYS.filter((h) => !group || h.group === group)
    .map((h) => {
      const key = h.key === ' ' ? 'Espacio' : h.key.toUpperCase();
      const suffix = h.group === 'camera' ? ' (si está activada)' : '';
      return `${key}: ${h.label}${suffix}`;
    })
    .join(' · ');
}
