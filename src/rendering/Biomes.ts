import * as THREE from 'three';

/**
 * Texturas PBR generadas con IA (Cloudflare Workers AI) en WebP:
 *   - terreno:   `src/assets/texturas/terreno/{slot}_{diffuse|normal|roughness}.webp`
 *   - materiales: `src/assets/texturas/materiales/{mat}_{diffuse|normal|roughness}.webp`
 * Si faltan archivos, se devuelve null y el material procedural de siempre
 * actúa de fallback (funciona offline / sin assets).
 */
const terrainMods = import.meta.glob('../assets/texturas/terreno/*_{diffuse,normal,roughness}.webp', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const materialMods = import.meta.glob('../assets/texturas/materiales/*_{diffuse,normal,roughness}.webp', {
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

function load(mods: Record<string, string>, base: string, key: string, type: string, color: boolean): THREE.Texture | null {
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

/** Set PBR de terreno para un slot (grass/dirt/sand/rock/snow). */
export function getGroundPBR(slot: string): PbrSet | null {
  const base = '../assets/texturas/terreno';
  const diffuse = load(terrainMods, base, slot, 'diffuse', true);
  if (!diffuse) return null;
  return { diffuse, normal: load(terrainMods, base, slot, 'normal', false), roughness: load(terrainMods, base, slot, 'roughness', false) };
}

/** Set PBR de material de modelado (madera, adobe, teja, arcilla, barro, textil). */
export function getGeneratedMaterial(kind: string): PbrSet | null {
  const base = '../assets/texturas/materiales';
  const diffuse = load(materialMods, base, kind, 'diffuse', true);
  if (!diffuse) return null;
  return { diffuse, normal: load(materialMods, base, kind, 'normal', false), roughness: load(materialMods, base, kind, 'roughness', false) };
}

