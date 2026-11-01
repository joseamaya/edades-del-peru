/** Single source of truth for in-match keyboard shortcuts. */
export type HotkeyAction =
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
  keys: string[];
  label: string;
  group: 'game' | 'camera';
}

export const HOTKEYS: HotkeyDef[] = [
  { action: 'pause', keys: ['p'], label: 'Pausa', group: 'game' },
  { action: 'lastBattle', keys: [' '], label: 'Última batalla', group: 'game' },
  { action: 'centerBase', keys: ['h'], label: 'Centrar Plaza Mayor', group: 'game' },
  { action: 'followUnit', keys: ['f'], label: 'Seguir unidad', group: 'game' },
  { action: 'selectArmy', keys: ['e'], label: 'Todo el ejército', group: 'game' },
  { action: 'buildFarm', keys: ['g'], label: 'Andén', group: 'game' },
  { action: 'buildHouse', keys: ['v'], label: 'Vivienda', group: 'game' },
  { action: 'rotateLeft', keys: ['z'], label: 'Rotar cámara a la izquierda', group: 'camera' },
  { action: 'rotateRight', keys: ['x'], label: 'Rotar cámara a la derecha', group: 'camera' },
];

/** Primary key for an action (the array exists for future alternate bindings). */
export function keyFor(action: HotkeyAction): string {
  return HOTKEYS.find((h) => h.action === action)?.keys[0] ?? '';
}

/** Human-readable shortcut line shared by the in-game help and tests. */
export function formatHotkeys(group?: HotkeyDef['group']): string {
  return HOTKEYS.filter((h) => !group || h.group === group)
    .map((h) => `${h.keys.map((k) => (k === ' ' ? 'Espacio' : k.toUpperCase())).join('/')}: ${h.label}`)
    .join(' · ');
}
