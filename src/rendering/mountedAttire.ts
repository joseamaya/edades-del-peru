import type { RigVariant } from '../model/defs/modelAssets';
import { MOUNTED_SPECS, isMountedVariant } from '../model/defs/mountedCharacters';
import type { RigInstance } from './RigInstance';
import { createRigAttireTools } from './rigAttire';
import type { RigVariantHandle } from './rigVariants';

const HAT_NAMES = {
  bicorn: 'GEO-Hat-Bicorn',
  morion: 'GEO-Hat-Morion',
  kepi: 'GEO-Hat-Kepi',
} as const;

export function dressMounted(rig: RigInstance, variant: RigVariant): RigVariantHandle | null {
  if (!isMountedVariant(variant)) return null;
  const spec = MOUNTED_SPECS[variant];
  const root = rig.root;
  const tools = createRigAttireTools(root);
  const { tint, dispose } = tools;

  tint('GEO-Merged-Rider-Coat', spec.coat);
  tint('GEO-Merged-Rider-Trousers', spec.trousers);
  tint('GEO-Merged-Rider-Trim', spec.trim);

  for (const [hat, name] of Object.entries(HAT_NAMES)) {
    root.traverse((object) => {
      if (!object.name.startsWith(name)) return;
      object.visible = hat === spec.hat;
      if (!object.name.endsWith('-Trim') && !object.name.endsWith('-Comb')) tint(object.name, spec.hatColor);
    });
  }

  return { dispose };
}
