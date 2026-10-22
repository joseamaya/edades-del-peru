/**
 * Shared human palette. The dossiers do not document skin tone or facial
 * features; this is a plausible darker Andean representation (not a portrait or
 * a reconstruction). Keep the rigid GLB and the procedural units in sync.
 */
export const HUMAN_SKIN = '#6b3f22';
export const HUMAN_HAIR = '#2a1c12';

export type PersonGender = 'female' | 'male';

/** Deterministic presentation gender for a unit id (50/50, no gameplay effect). */
export function genderForId(id: number): PersonGender {
  return id % 2 === 0 ? 'female' : 'male';
}
