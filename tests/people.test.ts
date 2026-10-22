import { describe, expect, it } from 'vitest';
import { genderForId } from '../src/model/defs/people';

describe('presentation gender', () => {
  it('assigns a deterministic 50/50 split by unit id', () => {
    expect(genderForId(2)).toBe('female');
    expect(genderForId(3)).toBe('male');
    expect(genderForId(102)).toBe('female');
    expect(genderForId(103)).toBe('male');
  });
});
