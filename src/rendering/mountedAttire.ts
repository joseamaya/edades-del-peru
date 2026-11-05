import * as THREE from 'three';
import type { RigVariant } from '../model/defs/modelAssets';
import { MOUNTED_SPECS, isMountedVariant } from '../model/defs/mountedCharacters';
import type { RigInstance } from './RigInstance';
import type { RigVariantHandle } from './rigVariants';

const HAT_NAMES = {
  bicorn: 'GEO-Hat-Bicorn',
  morion: 'GEO-Hat-Morion',
  kepi: 'GEO-Hat-Kepi',
} as const;

export function dressMounted(rig: RigInstance, variant: RigVariant): RigVariantHandle | null {
  if (!isMountedVariant(variant)) return null;
  const spec = MOUNTED_SPECS[variant];
  const owned: THREE.Material[] = [];
  const root = rig.root;

  const tint = (materialName: string, color: number): void => {
    root.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh || Array.isArray(mesh.material)) return;
      if (mesh.material.name !== materialName) return;
      const material = (mesh.material as THREE.MeshStandardMaterial).clone();
      material.color.setHex(color);
      owned.push(material);
      mesh.material = material;
    });
  };

  tint('MAT-Rider-Coat', spec.coat);
  tint('MAT-Rider-Trim', spec.trim);
  tint('MAT-Rider-Trousers', spec.trousers);
  tint('MAT-Rider-Hat', spec.hatColor);

  for (const [hat, name] of Object.entries(HAT_NAMES)) {
    root.traverse((object) => {
      if (object.name.startsWith(name)) object.visible = hat === spec.hat;
    });
  }

  return {
    dispose(): void {
      for (const material of owned) material.dispose();
    },
  };
}
