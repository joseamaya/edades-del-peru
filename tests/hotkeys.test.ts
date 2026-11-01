import { describe, expect, it } from 'vitest';
import { HOTKEYS, formatHotkeys, keyFor } from '../src/core/hotkeys';

describe('hotkey map', () => {
  it('never binds the same key to two actions', () => {
    const seen = new Map<string, string>();
    for (const hotkey of HOTKEYS) {
      expect(
        seen.get(hotkey.key),
        `${hotkey.key} is bound to ${seen.get(hotkey.key)} and ${hotkey.action}`,
      ).toBeUndefined();
      seen.set(hotkey.key, hotkey.action);
    }
  });

  it('keeps camera rotation separate from army selection', () => {
    expect(keyFor('selectArmy')).toBe('e');
    expect(keyFor('rotateLeft')).not.toBe('e');
    expect(keyFor('rotateRight')).not.toBe('e');
    expect(keyFor('rotateLeft')).not.toBe(keyFor('rotateRight'));
  });

  it('matches the actions handled by the game and the camera', () => {
    expect(keyFor('centerBase')).toBe('h');
    expect(keyFor('followUnit')).toBe('f');
    expect(keyFor('buildFarm')).toBe('g');
    expect(keyFor('buildHouse')).toBe('v');
    expect(keyFor('pause')).toBe('p');
    expect(keyFor('lastBattle')).toBe(' ');
  });

  it('builds the help text from the same table', () => {
    const help = formatHotkeys();
    expect(help).toContain('Z: Rotar cámara a la izquierda');
    expect(help).toContain('X: Rotar cámara a la derecha');
    expect(help).toContain('H: Centrar Plaza Mayor');
    expect(help).not.toContain('H/F/G/V: edificios');
  });
});
