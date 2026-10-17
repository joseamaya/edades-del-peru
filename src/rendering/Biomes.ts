import * as THREE from 'three';

/**
 * AI-generated PBR textures (Cloudflare Workers AI) in WebP:
 *   - terrain:   `src/assets/textures/terrain/{slot}_{diffuse|normal|roughness}.webp`
 *   - materials: `src/assets/textures/materials/{mat}_{diffuse|normal|roughness}.webp`
 * If files are missing, null is returned and the usual procedural material
 * acts as a fallback (works offline / without assets).
 */
const terrainMods = import.meta.glob('../assets/textures/terrain/*_{diffuse,normal,roughness}.webp', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const materialMods = import.meta.glob('../assets/textures/materials/*_{diffuse,normal,roughness}.webp', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

export interface PbrSet {
  diffuse: THREE.Texture;
  normal: THREE.Texture | null;
  roughness: THREE.Texture | null;
}

const loader = new THREE.TextureLoader();
const cache = new Map<string, THREE.Texture | null>();

function load(
  mods: Record<string, string>,
  base: string,
  key: string,
  type: string,
  color: boolean,
): THREE.Texture | null {
  const ck = `${key}_${type}`;
  if (cache.has(ck)) return cache.get(ck)!;
  const url = mods[`${base}/${key}_${type}.webp`];
  if (!url) {
    cache.set(ck, null);
    return null;
  }
  const t = loader.load(url);
  t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping;
  t.anisotropy = 8;
  t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  cache.set(ck, t);
  return t;
}

/** PBR terrain set for a slot (grass/dirt/sand/rock/snow). */
export function getGroundPBR(slot: string): PbrSet | null {
  const base = '../assets/textures/terrain';
  const diffuse = load(terrainMods, base, slot, 'diffuse', true);
  if (!diffuse) return null;
  return {
    diffuse,
    normal: load(terrainMods, base, slot, 'normal', false),
    roughness: load(terrainMods, base, slot, 'roughness', false),
  };
}

/** PBR material set for modeling (wood, adobe, tile, clay, mud, textile). */
export function getGeneratedMaterial(kind: string): PbrSet | null {
  const base = '../assets/textures/materials';
  const diffuse = load(materialMods, base, kind, 'diffuse', true);
  if (!diffuse) return null;
  return {
    diffuse,
    normal: load(materialMods, base, kind, 'normal', false),
    roughness: load(materialMods, base, kind, 'roughness', false),
  };
}

/**
 * Overlay the AI-generated PBR set for `slot` onto an existing standard material
 * (map + normal + roughness, tinted white so the albedo shows true). Returns
 * `false` and leaves the material untouched when the slot has no generated
 * assets, so callers keep their procedural/colour fallback (offline / no assets).
 * The generated textures use `MirroredRepeatWrapping`, so callers must bake the
 * UV repeat into the geometry (do not mutate the shared texture's `repeat`).
 */
export function applyGeneratedPbr(material: THREE.MeshStandardMaterial, slot: string, normalScale = 0.8): boolean {
  const gen = getGeneratedMaterial(slot);
  if (!gen) return false;
  material.map = gen.diffuse;
  material.color.set(0xffffff);
  if (gen.normal) {
    material.normalMap = gen.normal;
    material.normalScale = new THREE.Vector2(normalScale, normalScale);
  }
  if (gen.roughness) {
    material.roughnessMap = gen.roughness;
    material.roughness = 1;
  }
  material.needsUpdate = true;
  return true;
}
