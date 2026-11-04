/** Building damage bands shared by simulation cues and presentation. */
export const DAMAGE_THRESHOLDS = {
  /** Below this health ratio the building is scorched. */
  scorched: 0.65,
  /** Below this health ratio the building is critical (fire, lean, rubble). */
  critical: 0.85,
} as const;

export type DamageStage = 0 | 1 | 2;

export function damageStageFor(hpRatio: number): DamageStage {
  const damage = 1 - hpRatio;
  if (damage >= DAMAGE_THRESHOLDS.critical) return 2;
  if (damage >= DAMAGE_THRESHOLDS.scorched) return 1;
  return 0;
}
