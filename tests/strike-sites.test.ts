import { describe, expect, it } from 'vitest';
import { MISSIONS } from '../src/campaign/defs/campaign';

const mission = (id: string) => MISSIONS.find((m) => m.id === id)!;

describe('prepared strikes', () => {
  it('arms the Arica minefield when the enemy steps on it', () => {
    const mines = mission('m9_guerra_pacifico').triggers.filter((tr) => tr.id.startsWith('t_mina_'));
    expect(mines.length).toBeGreaterThanOrEqual(3);
    for (const mine of mines) expect(mine.condition.type).toBe('enemy_in_area');
    expect(mines[0].effects.some((fx) => fx.type === 'strike' && fx.damage === 60)).toBe(true);
  });

  it('drops the Breña galgas on the pass', () => {
    const galgas = mission('m_brena').triggers.find((tr) => tr.id === 't_galgas')!;
    expect(galgas.condition.type).toBe('enemy_in_area');
    expect(galgas.effects.some((fx) => fx.type === 'strike' && fx.damage === 60)).toBe(true);
  });
});
