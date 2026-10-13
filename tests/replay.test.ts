import { describe, it, expect } from 'vitest';
import { DEFAULT_SETTINGS } from '../src/core/Config';
import { REPLAY_VERSION, Replay, ReplayPlayer, ReplayRecorder, validateReplay } from '../src/game/replay';

const settings = { ...DEFAULT_SETTINGS };

describe('ReplayPlayer', () => {
  const replay: Replay = {
    version: REPLAY_VERSION,
    settings,
    commands: [
      { step: 5, cmd: { kind: 'stop', unitIds: [1] } },
      { step: 5, cmd: { kind: 'stop', unitIds: [2] } },
      { step: 9, cmd: { kind: 'stop', unitIds: [3] } },
    ],
  };

  it('returns due commands in order and never repeats them', () => {
    const player = new ReplayPlayer(replay);
    expect(player.commandsFor(0)).toEqual([]);
    expect(player.commandsFor(4)).toEqual([]);
    const due = player.commandsFor(5);
    expect(due).toHaveLength(2);
    expect(due[0]).toEqual({ kind: 'stop', unitIds: [1] });
    expect(due[1]).toEqual({ kind: 'stop', unitIds: [2] });
    expect(player.commandsFor(5)).toEqual([]);
    expect(player.commandsFor(100)).toHaveLength(1);
  });
});

describe('ReplayRecorder', () => {
  it('captures settings and timed commands', () => {
    const rec = new ReplayRecorder(settings);
    rec.record(3, { kind: 'advanceEra' });
    const replay = rec.toReplay();
    expect(replay.version).toBe(REPLAY_VERSION);
    expect(replay.settings.mapSeed).toBe(settings.mapSeed);
    expect(replay.commands).toEqual([{ step: 3, cmd: { kind: 'advanceEra' } }]);
  });
});

describe('validateReplay', () => {
  it('accepts a well-formed replay and rejects the rest', () => {
    const valid: Replay = { version: REPLAY_VERSION, settings, commands: [] };
    expect(validateReplay(valid)).toBe(valid);
    expect(validateReplay({ ...valid, version: 999 })).toBeNull();
    expect(validateReplay({ version: REPLAY_VERSION, commands: [] })).toBeNull();
    expect(validateReplay({ version: REPLAY_VERSION, settings, commands: 'nope' })).toBeNull();
    expect(validateReplay(null)).toBeNull();
  });
});
