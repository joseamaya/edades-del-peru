import type { RigVariant } from '../model/defs/modelAssets';
import { isSiegeVariant, siegeSpecForVariant } from '../model/defs/siegeCharacters';
import type { RigInstance } from './RigInstance';
import { createRigAttireTools } from './rigAttire';
import type { RigVariantHandle } from './rigVariants';

const GROUP_PREFIXES = ['GEO-Cannon-', 'GEO-Mortar-', 'GEO-Tank-', 'GEO-Crew-'] as const;

export function dressSiege(rig: RigInstance, variant: RigVariant): RigVariantHandle | null {
  if (!isSiegeVariant(variant)) return null;
  const spec = siegeSpecForVariant(variant);
  const weapon = variant.split('_')[1];
  const root = rig.root;
  const { tint, dispose } = createRigAttireTools(root);

  for (const prefix of GROUP_PREFIXES) {
    const visible =
      prefix === `GEO-${weapon[0].toUpperCase()}${weapon.slice(1)}-` || (prefix === 'GEO-Crew-' && weapon !== 'tank');
    root.traverse((object) => {
      if (object.name.startsWith(prefix)) object.visible = visible;
    });
  }

  tint('GEO-Crew-Crew-Coat', spec.coat);
  tint('GEO-Crew-Crew-Trim', spec.trim);
  tint('GEO-Crew-Crew-Trousers', spec.trousers);
  tint('GEO-Cannon-Siege-Wood', spec.wood);
  tint('GEO-Tank-Tank-Hull', spec.tankHull);
  tint('GEO-Tank-Tank-Track', spec.tankTrack);

  return { dispose };
}
