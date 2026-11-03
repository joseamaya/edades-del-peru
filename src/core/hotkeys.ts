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
  | 'command15'
  | 'command16'
  | 'command17'
  | 'command18'
  | 'command19'
  | 'command20'
  | 'command21'
  | 'command22'
  | 'command23'
  | 'command24';

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

export const COMMAND_SLOT_COUNT = 24;

const COMMAND_KEYS = [
  'q',
  'r',
  't',
  'y',
  'u',
  'i',
  'o',
  'l',
  'c',
  'b',
  'n',
  'm',
  ';',
  "'",
  '[',
  ']',
  '\\',
  ',',
  '/',
  '-',
  '=',
  '0',
  '`',
];

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
  command2: 'r',
  command3: 't',
  command4: 'y',
  command5: 'u',
  command6: 'i',
  command7: 'o',
  command8: 'l',
  command9: 'c',
  command10: 'b',
  command11: 'n',
  command12: 'm',
  command13: ';',
  command14: "'",
  command15: '[',
  command16: ']',
  command17: '\\',
  command18: ',',
  command19: '/',
  command20: '-',
  command21: '=',
  command22: '0',
  command23: '`',
  command24: 'f7',
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

const RESERVED_KEYS = new Set([
  'w',
  'a',
  's',
  'd',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  'f1',
  'f2',
  'f3',
  'f4',
  'escape',
]);

export function isReservedKey(key: string): boolean {
  return RESERVED_KEYS.has(key.toLowerCase());
}

export function keyFor(action: HotkeyAction, map: HotkeyMap = DEFAULT_KEYMAP): string {
  return map[action] ?? DEFAULT_KEYMAP[action] ?? '';
}

export function normalizeKeymap(raw: unknown): HotkeyMap {
  const out: HotkeyMap = { ...DEFAULT_KEYMAP };
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const seen = new Set<string>();
  const fallbackKeys = HOTKEYS.map((hotkey) => DEFAULT_KEYMAP[hotkey.action]);
  for (const hotkey of HOTKEYS) {
    const candidate = source[hotkey.action];
    let value =
      typeof candidate === 'string' && candidate.length > 0 && !isReservedKey(candidate) && !seen.has(candidate)
        ? candidate
        : DEFAULT_KEYMAP[hotkey.action];
    if (seen.has(value) || isReservedKey(value)) {
      value = fallbackKeys.find((key) => !seen.has(key) && !isReservedKey(key)) ?? value;
    }
    out[hotkey.action] = value;
    seen.add(value);
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
