import { CivId, Era, UnitKind } from '../../core/types';

export const VEHICLE_VARIANTS = ['vehicle_motorcycle', 'vehicle_aa', 'vehicle_rockets'] as const;
export type VehicleRigVariant = (typeof VEHICLE_VARIANTS)[number];

const VEHICLE_BY_KIND: Partial<Record<UnitKind, VehicleRigVariant>> = {
  [UnitKind.HUSSAR]: 'vehicle_motorcycle',
  [UnitKind.ANTI_AIR]: 'vehicle_aa',
  [UnitKind.NUCLEAR]: 'vehicle_rockets',
};

/**
 * Contemporary Republic vehicles. The Republic is the only civilization with a
 * Contemporary period, so the era/civ gate also keeps every vehicle post-1532.
 */
export function vehicleVariantFor(kind: UnitKind, era: Era, civ: CivId): VehicleRigVariant | null {
  if (era !== Era.CONTEMPORARY || civ !== CivId.REPUBLIC) return null;
  return VEHICLE_BY_KIND[kind] ?? null;
}

export function isVehicleVariant(variant: string): variant is VehicleRigVariant {
  return (VEHICLE_VARIANTS as readonly string[]).includes(variant);
}
