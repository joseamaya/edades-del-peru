/** Single source of truth for in-match keyboard shortcuts. */
export type CommandHotkeyAction =
  | 'command1'
  | 'command2'
  | 'command3'
  | 'command4'
  | 'command5'
  | 'command6'
  | 'command7'
  | 'command8'
  | 'command9'
  | 'command10'
  | 'command11'
  | 'command12'
  | 'command13'
  | 'command14'
  | 'command15';

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
  | 'techTree'
  | 'rotateLeft'
  | 'rotateRight'
  | CommandHotkeyAction;

export type HotkeyMap = Record<HotkeyAction, string>;

export interface HotkeyDef {
  action: HotkeyAction;
  key: string;
  label: string;
  group: 'game' | 'camera' | 'commands';
}

export const COMMAND_SLOT_COUNT = 15;

const COMMAND_KEYS = ['q', 'w', 'r', 't', 'y', 'a', 's', 'd', 'j', 'l', 'c', 'b', 'n', 'm', 'u'];

export const DEFAULT_KEYMAP: HotkeyMap = {
  toggleHelp: '?',
  nextIdleWorker: '.',
  pause: 'p',
  lastBattle: ' ',
  centerBase: 'h',
  followUnit: 'f',
  selectArmy: 'e',
  buildFarm: 'g',
  buildHouse: 'v',
  techTree: 'k',
  rotateLeft: 'z',
  rotateRight: 'x',
  command1: 'q',
  command2: 'w',
  command3: 'r',
  command4: 't',
  command5: 'y',
  command6: 'a',
  command7: 's',
  command8: 'd',
  command9: 'j',
  command10: 'l',
  command11: 'c',
  command12: 'b',
  command13: 'n',
  command14: 'm',
  command15: 'u',
};

const NAMED_LABELS: { action: HotkeyAction; label: string; group: HotkeyDef['group'] }[] = [
  { action: 'toggleHelp', label: 'Mostrar/ocultar ayuda', group: 'game' },
  { action: 'nextIdleWorker', label: 'Siguiente obrero ocioso (Ctrl: todos)', group: 'game' },
  { action: 'pause', label: 'Pausa', group: 'game' },
  { action: 'lastBattle', label: 'Última batalla', group: 'game' },
  { action: 'centerBase', label: 'Centrar Plaza Mayor', group: 'game' },
  { action: 'followUnit', label: 'Seguir unidad', group: 'game' },
  { action: 'selectArmy', label: 'Todo el ejército', group: 'game' },
  { action: 'buildFarm', label: 'Andén', group: 'game' },
  { action: 'buildHouse', label: 'Vivienda', group: 'game' },
  { action: 'techTree', label: 'Árbol tecnológico', group: 'game' },
  { action: 'rotateLeft', label: 'Rotar cámara a la izquierda', group: 'camera' },
  { action: 'rotateRight', label: 'Rotar cámara a la derecha', group: 'camera' },
];

function commandAction(index: number): CommandHotkeyAction {
  return `command${index + 1}` as CommandHotkeyAction;
}

export const HOTKEYS: HotkeyDef[] = [
  ...NAMED_LABELS.map((entry) => ({ ...entry, key: DEFAULT_KEYMAP[entry.action] })),
  ...Array.from({ length: COMMAND_SLOT_COUNT }, (_, index) => ({
    action: commandAction(index),
    key: COMMAND_KEYS[index] ?? '',
    label: `Comando ${index + 1}`,
    group: 'commands' as const,
  })),
];

export function keyFor(action: HotkeyAction, map: HotkeyMap = DEFAULT_KEYMAP): string {
  return map[action] ?? DEFAULT_KEYMAP[action] ?? '';
}

export function normalizeKeymap(raw: unknown): HotkeyMap {
  const out: HotkeyMap = { ...DEFAULT_KEYMAP };
  if (!raw || typeof raw !== 'object') return out;
  const source = raw as Record<string, unknown>;
  const seen = new Set<string>();
  for (const hotkey of HOTKEYS) {
    const value = source[hotkey.action];
    if (typeof value === 'string' && value.length > 0 && !seen.has(value)) {
      out[hotkey.action] = value;
      seen.add(value);
    } else {
      out[hotkey.action] = DEFAULT_KEYMAP[hotkey.action];
      seen.add(out[hotkey.action]);
    }
  }
  return out;
}

/** Actions whose current key collides with another action. */
export function keymapConflicts(map: HotkeyMap): HotkeyAction[] {
  const byKey = new Map<string, HotkeyAction[]>();
  for (const hotkey of HOTKEYS) {
    const key = map[hotkey.action];
    byKey.set(key, [...(byKey.get(key) ?? []), hotkey.action]);
  }
  return [...byKey.values()].filter((actions) => actions.length > 1).flat();
}

/** Human-readable shortcut line shared by the in-game help and tests. */
export function formatHotkeys(group?: HotkeyDef['group'], map: HotkeyMap = DEFAULT_KEYMAP): string {
  return HOTKEYS.filter((h) => !group || h.group === group)
    .map((h) => {
      const key = keyFor(h.action, map);
      const label = key === ' ' ? 'Espacio' : key.toUpperCase();
      const suffix = h.group === 'camera' ? ' (si está activada)' : '';
      return `${label}: ${h.label}${suffix}`;
    })
    .join(' · ');
}
