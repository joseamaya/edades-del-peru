/** Shared data contract for the Blender architecture kits (Caral, Chavín). */
export type ArchitectureKitId = 'caral' | 'chavin';
export type ArchAssetId = string;

export interface ArchPlacement {
  asset: ArchAssetId;
  x: number;
  z: number;
  /** Yaw in radians; the models face +Z. */
  rotY: number;
  /** Non-uniform scale (x, y, z) of the model. */
  scale: [number, number, number];
  /** Raise the model above the ground it sits on (model units, before scaling). */
  lift?: number;
  /** First phase in which the piece stands; omitted means from the opening. */
  since?: string;
  /** Asset used instead of `asset` in each phase (e.g. the Caral Pyramid Mayor). */
  phaseAssets?: Partial<Record<string, ArchAssetId>>;
}
