/**
 * Units and entry URLs shared by the character bench and capture scripts. Each case is one dressed
 * infantry unit in a mission or a seeded skirmish; `kind` is the UnitKind spawned/found in that match.
 *
 * `variant` is the rig variant the case must produce. The appearance comes from the **player's** civ, so
 * a wrong period (or an enemy-civ unit in a mission) silently dresses another culture: the scripts fail
 * on the prefix instead of shipping a mislabelled capture. Periods: recuay 2, chanca 4, patriotas 7,
 * chile 8; the m7 rebel outfit is gated on its mission id, so it needs the mission, not a skirmish.
 */
export const CHARACTER_CASES = [
  {
    name: 'inca',
    label: 'Inca warrior',
    url: '/?mission=m_cusco_1536&intro=0&fog=0&low=1&noloop=1',
    kind: 'inca_warrior',
    variant: 'inca_soldier_',
  },
  {
    name: 'slinger',
    label: 'Inca slinger',
    url: '/?mission=m_cusco_1536&intro=0&fog=0&low=1&noloop=1',
    kind: 'inca_slinger',
    variant: 'inca_ranged_',
  },
  {
    name: 'spanish',
    label: 'Spanish arquebusier',
    url: '/?mission=m_lima&intro=0&fog=0&low=1&noloop=1',
    kind: 'musketeer',
    variant: 'realistas_ranged_',
  },
  {
    name: 'republic',
    label: 'Republican fusilier',
    url: '/?mission=m_tarapaca&intro=0&fog=0&low=1&noloop=1',
    kind: 'republica_defensor',
    variant: 'republica_ranged_',
  },
  {
    name: 'chile',
    label: 'Chilean line infantry',
    url: '/?play=1&seed=777&fog=0&low=1&noloop=1&period=8&civ=chile',
    kind: 'chile_infante',
    variant: 'chile_ranged_',
  },
  {
    name: 'patriots',
    label: 'Patriot infantry',
    url: '/?play=1&seed=777&fog=0&low=1&noloop=1&period=7&civ=patriotas',
    kind: 'soldier',
    variant: 'patriotas_soldier_',
  },
  {
    name: 'rebels',
    label: 'm7 rebel infantry',
    url: '/?mission=m7_tupac_amaru&intro=0&fog=0&low=1&noloop=1',
    kind: 'soldier',
    variant: 'rebelde_soldier_',
  },
  {
    name: 'cavalry',
    label: 'Patriot montonera',
    url: '/?play=1&seed=777&fog=0&low=1&noloop=1&period=7&civ=patriotas',
    kind: 'patriota_montonera',
    variant: 'mounted_patriotas',
    // A rider and its horse are 2.4 m nose to tail: the humanoid close-up crops the mount.
    frame: { distance: 5.2, height: 2.4, lookAt: 1.2 },
  },
  {
    name: 'moche',
    label: 'Moche warrior',
    url: '/?play=1&seed=777&fog=0&low=1&noloop=1&civ=moche&period=2',
    kind: 'soldier',
    variant: 'moche_soldier_',
  },
  {
    name: 'recuay',
    label: 'Recuay warrior',
    url: '/?play=1&seed=777&fog=0&low=1&noloop=1&period=2&civ=recuay',
    kind: 'recuay_warrior',
    variant: 'recuay_soldier_',
  },
  {
    name: 'wari',
    label: 'Wari warrior',
    url: '/?play=1&seed=777&fog=0&low=1&noloop=1&civ=wari&period=3',
    kind: 'soldier',
    variant: 'wari_soldier_',
  },
  {
    name: 'chimu',
    label: 'Chimú warrior',
    url: '/?play=1&seed=777&fog=0&low=1&noloop=1&civ=chimu&period=4',
    kind: 'soldier',
    variant: 'chimu_soldier_',
  },
  {
    name: 'chanca',
    label: 'Chanca warrior',
    url: '/?play=1&seed=777&fog=0&low=1&noloop=1&period=4&civ=chanca',
    kind: 'chanca_warrior',
    variant: 'chanca_soldier_',
  },
  {
    name: 'late-realista',
    label: 'Late realista',
    url: '/?play=1&seed=777&fog=0&low=1&noloop=1&civ=realistas&period=7',
    kind: 'soldier',
    variant: 'realistas_bicorn_',
  },
];

/**
 * Spawn one player-owned rigged unit of `kind` and remember its spawn point. Always spawning (instead of
 * reusing a mission unit) keeps the capture frame identical between the before and after runs. Fails when
 * the rig does not match `entry.variant`: the variant follows the player's civilization and the period.
 */
export async function ensureRiggedUnit(page, kind, entry = {}) {
  const variant = await page.evaluate((wanted) => {
    const g = window.game;
    const centre = g.playerCenter(0);
    const unit = g.spawnScriptedUnit(wanted, 0, centre.x + 14, centre.z + 14);
    if (unit) {
      window.__captureOrigin = { x: unit.pos.x, y: unit.pos.y, z: unit.pos.z };
      window.__captureUnitId = unit.id;
      return unit.rig?.variantId ?? null;
    }
    return null;
  }, kind);
  if (!variant) throw new Error(`${entry.name ?? kind}: no rigged ${kind}`);
  if (entry.variant && !variant.startsWith(entry.variant)) {
    throw new Error(`${entry.name ?? kind}: expected variant ${entry.variant}*, got ${variant}`);
  }
  return variant;
}
