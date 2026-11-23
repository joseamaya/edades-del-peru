/**
 * Units and entry URLs shared by the character bench and capture scripts. Each case is one dressed
 * infantry unit in a mission or a seeded skirmish; `kind` is the UnitKind spawned/found in that match.
 */
export const CHARACTER_CASES = [
  {
    name: 'inca',
    label: 'Inca warrior',
    url: '/?mission=m_cusco_1536&intro=0&fog=0&low=1&noloop=1',
    kind: 'inca_warrior',
  },
  {
    name: 'spanish',
    label: 'Spanish arquebusier',
    url: '/?mission=m_lima&intro=0&fog=0&low=1&noloop=1',
    kind: 'musketeer',
  },
  {
    name: 'republic',
    label: 'Republican fusilier',
    url: '/?mission=m_tarapaca&intro=0&fog=0&low=1&noloop=1',
    kind: 'republica_defensor',
  },
  {
    name: 'moche',
    label: 'Moche warrior',
    url: '/?play=1&seed=777&fog=0&low=1&noloop=1&civ=moche&period=2',
    kind: 'soldier',
  },
  {
    name: 'wari',
    label: 'Wari warrior',
    url: '/?play=1&seed=777&fog=0&low=1&noloop=1&civ=wari&period=3',
    kind: 'soldier',
  },
  {
    name: 'chimu',
    label: 'Chimú warrior',
    url: '/?play=1&seed=777&fog=0&low=1&noloop=1&civ=chimu&period=4',
    kind: 'soldier',
  },
  {
    name: 'late-realista',
    label: 'Late realista',
    url: '/?play=1&seed=777&fog=0&low=1&noloop=1&civ=realistas&period=7',
    kind: 'soldier',
  },
];

/**
 * Spawn one player-owned rigged unit of `kind` and remember its spawn point. Always spawning (instead of
 * reusing a mission unit) keeps the capture frame identical between the before and after runs.
 */
export async function ensureRiggedUnit(page, kind) {
  await page.evaluate((wanted) => {
    const g = window.game;
    const centre = g.playerCenter(0);
    const unit = g.spawnScriptedUnit(wanted, 0, centre.x + 14, centre.z + 14);
    if (unit) {
      window.__captureOrigin = { x: unit.pos.x, y: unit.pos.y, z: unit.pos.z };
      window.__captureUnitId = unit.id;
    }
  }, kind);
}
