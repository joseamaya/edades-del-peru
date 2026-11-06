import type { RigVariant } from '../model/defs/modelAssets';
import { MODERN_SPECS } from '../model/defs/modernCharacters';
import { isVehicleVariant, type VehicleRigVariant } from '../model/defs/vehicleCharacters';
import type { RigInstance } from './RigInstance';
import type { RigVariantHandle } from './rigVariants';
import { createRigAttireTools } from './rigAttire';

const VEHICLE_GROUP: Record<VehicleRigVariant, string> = {
  vehicle_motorcycle: 'GEO-Moto-',
  vehicle_aa: 'GEO-AA-',
  vehicle_rockets: 'GEO-Rocket-',
};

/**
 * Presentation-only contemporary vehicles on the shared vehicle rig. Only one
 * vehicle group is shown per instance; its painted metal and rider uniform use
 * the modern Republic palette from `docs/historia/atuendos.md` §5.
 */
export function dressVehicle(rig: RigInstance, variant: RigVariant): RigVariantHandle | null {
  if (!isVehicleVariant(variant)) return null;
  const active = VEHICLE_GROUP[variant];
  const spec = MODERN_SPECS.contemporary_republica;
  const root = rig.root;
  const tools = createRigAttireTools(root);

  root.traverse((object) => {
    if (!object.name.startsWith('GEO-')) return;
    const visible = object.name.startsWith(active);
    object.visible = visible;
    if (!visible) return;
    if (object.name.endsWith('-Vehicle-Metal') || object.name.endsWith('-Rider-Uniform')) {
      tools.tint(object.name, spec.uniform);
    } else if (object.name.endsWith('-Rider-Helmet')) {
      tools.tint(object.name, spec.helmet);
    }
  });

  return { dispose: tools.dispose };
}
