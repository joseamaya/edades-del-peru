import { clamp } from '../util/math';
import type { DamageClass } from '../model/defs/units';

/** Armor of a defender: `light`/`heavy` for units, `building` for structures. */
export interface ArmorProfile {
  light: number;
  heavy: number;
  /** Building armor, used only by `fortified` attacks (siege). */
  building?: number;
}

/** Upper bound on the civilization/technology armor damage reduction. */
export const ARMOR_BONUS_CAP = 0.8;

/** The defender armor a given attack type strikes. */
export function armorForType(attackType: DamageClass, armor: ArmorProfile): number {
  if (attackType === 'light') return armor.light;
  if (attackType === 'heavy') return armor.heavy;
  return armor.building ?? armor.heavy;
}

/**
 * Final damage of an attack: the attacker's `damageType` selects the defender's
 * armor (light/heavy/fortified), then the civilization/technology armor bonus
 * (`armorMult`, e.g. 1.1 = "+10% armor") reduces the remainder. Damage never
 * drops below 1.
 */
export function computeDamage(damage: number, attackType: DamageClass, armor: ArmorProfile, armorMult = 1): number {
  const base = armorForType(attackType, armor);
  const bonus = clamp(armorMult - 1, 0, ARMOR_BONUS_CAP);
  return Math.max(1, (damage - base) * (1 - bonus));
}
