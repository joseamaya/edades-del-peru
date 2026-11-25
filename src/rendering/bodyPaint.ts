import * as THREE from 'three';

/**
 * Paint the shared body under garments in the garment's colour.
 *
 * Sleeves, breeches, coats, tunics and skirts are shells over the skinned body, while the body under them
 * bulges as a limb bends. Where the body breaks through a shell it showed bare skin in patches over the
 * cloth. With the covered region painted, whatever pokes through is the garment's colour.
 *
 * Each vertex takes the colour of the region its strongest covered bone belongs to. The caller classifies
 * the vertex's posed, world-space position at dressing time (the bind pose for both the uniform and the
 * Andean tunic).
 *
 * The painted geometry shares every attribute with the asset's body and adds one `paint` attribute; it is
 * cached per body, key and colours for the session and never disposed, because disposing it would release
 * the shared buffers.
 */
export type PaintRegion = string | null;
export type PaintColors = Record<string, number>;

export interface BodyPaintHandle {
  /** Re-paint with new garment colours (a hero retint after the rig was dressed). */
  setColors(colors: PaintColors): void;
}

const geometryCache = new Map<string, THREE.BufferGeometry>();
const materialCache = new WeakMap<THREE.Material, THREE.Material>();
const sourceGeometries = new WeakMap<THREE.SkinnedMesh, THREE.BufferGeometry>();
const sourceMaterials = new WeakMap<THREE.SkinnedMesh, THREE.Material | THREE.Material[]>();

function paintedMaterial(source: THREE.Material): THREE.Material {
  if (source.userData.bodyPaint === true) return source;
  const cached = materialCache.get(source);
  if (cached) return cached;
  const material = source.clone();
  material.name = `${source.name}:painted`;
  material.userData.bodyPaint = true;
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 paint;\nvarying vec4 vPaint;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n  vPaint = paint;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec4 vPaint;')
      .replace(
        '#include <color_fragment>',
        '#include <color_fragment>\n  diffuseColor.rgb = mix(diffuseColor.rgb, vPaint.rgb, vPaint.a);',
      );
  };
  material.customProgramCacheKey = () => 'body-paint';
  materialCache.set(source, material);
  return material;
}

function originalGeometry(body: THREE.SkinnedMesh): THREE.BufferGeometry {
  let geometry = sourceGeometries.get(body);
  if (!geometry) {
    geometry = body.geometry;
    sourceGeometries.set(body, geometry);
  }
  return geometry;
}

function originalMaterial(body: THREE.SkinnedMesh): THREE.Material | THREE.Material[] {
  let material = sourceMaterials.get(body);
  if (!material) {
    material = body.material;
    sourceMaterials.set(body, material);
  }
  return material;
}

function colorKey(colors: PaintColors): string {
  return Object.entries(colors)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([region, value]) => `${region}:${value.toString(16)}`)
    .join(',');
}

/**
 * Replace `body`'s geometry and material with the painted ones. `regionOf` gets the vertex's strongest
 * covered bone and its posed, world-space position at dressing time, and returns the region key, or null
 * for skin.
 */
export function paintBodyUnderGarments(
  body: THREE.SkinnedMesh,
  key: string,
  colors: PaintColors,
  regionOf: (bone: string, position: THREE.Vector3) => PaintRegion,
): BodyPaintHandle {
  const source = originalGeometry(body);
  const cacheKey = `${source.uuid}|${key}|${colorKey(colors)}`;
  let geometry = geometryCache.get(cacheKey);
  if (!geometry) {
    const skinIndex = source.getAttribute('skinIndex');
    const skinWeight = source.getAttribute('skinWeight');
    const count = source.getAttribute('position').count;
    const paint = new Float32Array(count * 4);
    const bones = body.skeleton.bones;
    const linear: Record<string, THREE.Color> = {};
    for (const [region, value] of Object.entries(colors)) linear[region] = new THREE.Color(value);
    body.updateMatrixWorld(true);
    body.skeleton.update();
    const position = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      // Strongest bone among those that carry a garment.
      let best: PaintRegion = null;
      let bestWeight = 0;
      let covered = 0;
      body.getVertexPosition(i, position).applyMatrix4(body.matrixWorld);
      for (let k = 0; k < 4; k++) {
        const weight = skinWeight.getComponent(i, k);
        if (weight <= 0) continue;
        const bone = bones[skinIndex.getComponent(i, k)]?.name ?? '';
        const region = regionOf(bone, position);
        if (!region) continue;
        covered += weight;
        if (weight > bestWeight) {
          bestWeight = weight;
          best = region;
        }
      }
      // A vertex mostly on an uncovered bone (neck, hand, head) stays skin.
      if (!best || covered < 0.5) continue;
      const c = linear[best];
      if (!c) continue;
      paint.set([c.r, c.g, c.b, 1], i * 4);
    }
    geometry = new THREE.BufferGeometry();
    for (const [name, attribute] of Object.entries(source.attributes)) geometry.setAttribute(name, attribute);
    geometry.setAttribute('paint', new THREE.BufferAttribute(paint, 4));
    geometry.setIndex(source.index);
    for (const group of source.groups) geometry.addGroup(group.start, group.count, group.materialIndex);
    geometry.boundingBox = source.boundingBox;
    geometry.boundingSphere = source.boundingSphere;
    geometryCache.set(cacheKey, geometry);
  }
  body.geometry = geometry;
  const material = originalMaterial(body);
  body.material = Array.isArray(material) ? material.map(paintedMaterial) : paintedMaterial(material);
  return {
    setColors(next: PaintColors): void {
      paintBodyUnderGarments(body, key, next, regionOf);
    },
  };
}
