import { BuildingKind, CivId, Era } from '../../core/types';

export interface AIBuildStep {
  building: BuildingKind;
  priority: number;
  minEra?: Era;
  /** Only build once this building exists and is complete. */
  requiresBuilding?: BuildingKind;
  /** Only build after the AI has this many soldiers. */
  minSoldiers?: number;
  /** Essential before the barracks exists (economy + first military building). */
  essential?: boolean;
  /** Only profiles with the advanced-military trait build it. */
  requiresAdvancedMilitary?: boolean;
}

/** Civilization nudges: identity through build priorities, not hidden bonuses. */
const CIV_PRIORITY: Partial<Record<CivId, Partial<Record<BuildingKind, number>>>> = {
  [CivId.MOCHE]: { [BuildingKind.BARRACKS]: 4, [BuildingKind.ARSENAL]: 2 },
  [CivId.RECUAY]: { [BuildingKind.FORTRESS]: 10 },
  [CivId.CHANCA]: { [BuildingKind.FORTRESS]: 12 },
  [CivId.WARI]: { [BuildingKind.INSTITUTE]: 5 },
  [CivId.CHIMU]: { [BuildingKind.MARKET]: 2 },
  [CivId.INCA]: { [BuildingKind.BARRACKS]: 2, [BuildingKind.INSTITUTE]: 4 },
  [CivId.PATRIOTAS]: { [BuildingKind.BARRACKS]: 3 },
  [CivId.REALISTAS]: { [BuildingKind.FORTRESS]: 6 },
};

/** Data-driven opening: economy first, then the first army building. */
const STEPS: AIBuildStep[] = [
  { building: BuildingKind.SAWMILL, priority: 96, essential: true },
  { building: BuildingKind.MILL, priority: 94, essential: true },
  { building: BuildingKind.BARRACKS, priority: 88, essential: true },
  { building: BuildingKind.SMELTER, priority: 80 },
  { building: BuildingKind.REFINERY, priority: 70, minEra: Era.TAHUANTINSUYO },
  {
    building: BuildingKind.ARSENAL,
    priority: 68,
    requiresBuilding: BuildingKind.BARRACKS,
    requiresAdvancedMilitary: true,
  },
  {
    building: BuildingKind.STABLE,
    priority: 62,
    requiresBuilding: BuildingKind.BARRACKS,
    requiresAdvancedMilitary: true,
  },
  { building: BuildingKind.INSTITUTE, priority: 46, minSoldiers: 8 },
  { building: BuildingKind.FACTORY, priority: 44, minSoldiers: 10 },
  { building: BuildingKind.FORTRESS, priority: 42, minSoldiers: 6 },
  { building: BuildingKind.TOWER, priority: 40, minSoldiers: 6 },
];

/** Build steps for this civilization, with civ-specific priority nudges. */
export function aiBuildSteps(civ: CivId): AIBuildStep[] {
  return STEPS.map((step) => ({
    ...step,
    priority: step.priority + (CIV_PRIORITY[civ]?.[step.building] ?? 0),
  }));
}
